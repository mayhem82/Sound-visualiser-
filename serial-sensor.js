(() => {
  "use strict";

  // Sensor Bridge — a generic Web Serial line reader/writer, for talking to
  // an ESP32/Arduino-class board (or anything else behind a standard
  // USB-serial chip: CP2102/CH340/FTDI) with no custom firmware protocol
  // beyond "print each reading as its own newline-terminated line." This is
  // deliberately NOT DMX-specific like dmx.js's serial connection -- no
  // fixed frame format, just whatever text/JSON the device sends.

  const BAUD_KEY = "serialSensorBaud_v1";
  const MAX_LOG_LINES = 500;

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const ssSupportHint = document.getElementById("ssSupportHint");

  const ssMain = document.getElementById("ssMain");
  const ssStatus = document.getElementById("ssStatus");
  const serialPill = document.getElementById("serialPill");
  const serialPillText = document.getElementById("serialPillText");
  const serialConnectBtn = document.getElementById("serialConnectBtn");
  const serialDisconnectBtn = document.getElementById("serialDisconnectBtn");
  const baudSelect = document.getElementById("baudSelect");

  const ssLatestFields = document.getElementById("ssLatestFields");
  const ssLatestEmptyHint = document.getElementById("ssLatestEmptyHint");

  const ssSendInput = document.getElementById("ssSendInput");
  const ssSendBtn = document.getElementById("ssSendBtn");

  const ssClearLogBtn = document.getElementById("ssClearLogBtn");
  const ssAutoscrollCheckbox = document.getElementById("ssAutoscrollCheckbox");
  const ssLog = document.getElementById("ssLog");

  const hasSerial = "serial" in navigator;
  if (!hasSerial) {
    ssSupportHint.textContent = "Web Serial isn't available in this browser -- try desktop Chrome or Edge.";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }

  let serialPort = null, serialReader = null, serialWriter = null, serialConnected = false;
  let readLoopAbort = false;

  const savedBaud = localStorage.getItem(BAUD_KEY);
  if (savedBaud && [...baudSelect.options].some((o) => o.value === savedBaud)) baudSelect.value = savedBaud;

  function appendLog(text, cls) {
    const line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = text;
    ssLog.appendChild(line);
    while (ssLog.childNodes.length > MAX_LOG_LINES) ssLog.removeChild(ssLog.firstChild);
    if (ssAutoscrollCheckbox.checked) ssLog.scrollTop = ssLog.scrollHeight;
  }

  function showLatestReading(line) {
    let parsed = null;
    try { parsed = JSON.parse(line); } catch (e) { /* not JSON -- just a log line, no readout */ }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    const entries = Object.entries(parsed).filter(([, v]) => v === null || typeof v !== "object");
    if (!entries.length) return;
    ssLatestEmptyHint.classList.add("hide");
    ssLatestFields.innerHTML = "";
    entries.forEach(([k, v]) => {
      const chip = document.createElement("span");
      chip.className = "ss-field-chip";
      chip.textContent = `${k}: ${v}`;
      ssLatestFields.appendChild(chip);
    });
  }

  function updateSerialPill(errorMsg) {
    if (serialConnected) {
      serialPill.className = "dmx-pill connected";
      serialPillText.textContent = "Port: connected";
    } else if (errorMsg) {
      serialPill.className = "dmx-pill error";
      serialPillText.textContent = "Port: " + errorMsg;
    } else {
      serialPill.className = "dmx-pill";
      serialPillText.textContent = "Port: not connected";
    }
  }

  async function readLoop(reader) {
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (!readLoopAbort) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).replace(/\r$/, "");
          buf = buf.slice(idx + 1);
          if (line.length) {
            appendLog(line, "ss-log-line-in");
            showLatestReading(line);
          }
        }
      }
    } catch (e) {
      if (!readLoopAbort) appendLog("Read error: " + e.message, "ss-log-line-sys");
    }
  }

  async function connectSerial() {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudSelect.value), dataBits: 8, stopBits: 1, parity: "none" });
      serialPort = port;
      serialWriter = port.writable.getWriter();
      serialReader = port.readable.getReader();
      serialConnected = true;
      readLoopAbort = false;
      try { localStorage.setItem(BAUD_KEY, baudSelect.value); } catch (e) {}
      updateSerialPill();
      serialConnectBtn.classList.add("hide");
      serialDisconnectBtn.classList.remove("hide");
      ssSendInput.disabled = false;
      ssSendBtn.disabled = false;
      ssStatus.textContent = "";
      appendLog("-- connected --", "ss-log-line-sys");
      readLoop(serialReader);
    } catch (e) {
      ssStatus.textContent = "Connect failed: " + e.message;
    }
  }

  async function disconnectSerial(errorMsg) {
    readLoopAbort = true;
    if (serialReader) { try { await serialReader.cancel(); } catch (e) {} try { serialReader.releaseLock(); } catch (e) {} serialReader = null; }
    if (serialWriter) { try { await serialWriter.close(); } catch (e) {} serialWriter = null; }
    if (serialPort) { try { await serialPort.close(); } catch (e) {} serialPort = null; }
    serialConnected = false;
    updateSerialPill(errorMsg);
    serialConnectBtn.classList.remove("hide");
    serialDisconnectBtn.classList.add("hide");
    ssSendInput.disabled = true;
    ssSendBtn.disabled = true;
    if (errorMsg) appendLog("-- disconnected: " + errorMsg + " --", "ss-log-line-sys");
    else appendLog("-- disconnected --", "ss-log-line-sys");
  }

  serialConnectBtn.addEventListener("click", connectSerial);
  serialDisconnectBtn.addEventListener("click", () => disconnectSerial());
  navigator.serial.addEventListener("disconnect", (e) => {
    if (serialPort && e.target === serialPort) disconnectSerial("device unplugged");
  });

  async function sendLine() {
    const text = ssSendInput.value;
    if (!text || !serialWriter) return;
    try {
      await serialWriter.write(new TextEncoder().encode(text + "\n"));
      appendLog("> " + text, "ss-log-line-out");
      ssSendInput.value = "";
    } catch (e) {
      ssStatus.textContent = "Send failed: " + e.message;
    }
  }
  ssSendBtn.addEventListener("click", sendLine);
  ssSendInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendLine(); });

  ssClearLogBtn.addEventListener("click", () => {
    ssLog.innerHTML = "";
    ssLatestFields.innerHTML = "";
    ssLatestEmptyHint.classList.remove("hide");
  });

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    ssMain.classList.remove("hide");
  });
})();
