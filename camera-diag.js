(() => {
  "use strict";

  const checkBtn = document.getElementById("checkBtn");
  const status = document.getElementById("status");
  const deviceList = document.getElementById("deviceList");
  const selectA = document.getElementById("selectA");
  const selectB = document.getElementById("selectB");
  const tryBothBtn = document.getElementById("tryBothBtn");
  const concurrencyStatus = document.getElementById("concurrencyStatus");
  const videoA = document.getElementById("videoA");
  const videoB = document.getElementById("videoB");

  let videoDevices = [];
  let streamA = null;
  let streamB = null;

  function setStatus(el, msg) {
    el.textContent = msg;
  }

  // enumerateDevices() only returns real, non-blank labels once permission
  // has been granted at least once -- so this briefly opens the camera
  // purely to unlock labels, then immediately releases it. Nothing here
  // needs a live stream to answer "what cameras exist".
  async function checkCameras() {
    setStatus(status, "Requesting camera permission…");
    deviceList.innerHTML = "";
    let permissionStream = null;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      setStatus(status, "Camera permission failed: " + (err.message || err.name || "unknown error"));
      return;
    }
    permissionStream.getTracks().forEach((t) => t.stop());

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      setStatus(status, `Found ${videoDevices.length} video input device${videoDevices.length === 1 ? "" : "s"}.`);
      videoDevices.forEach((d, i) => {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = d.label || `Camera ${i + 1} (no label)`;
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = `deviceId: ${d.deviceId.slice(0, 24)}… · groupId: ${d.groupId ? d.groupId.slice(0, 24) + "…" : "(none)"}`;
        li.appendChild(label);
        li.appendChild(meta);
        deviceList.appendChild(li);
      });
      populateSelects();
    } catch (err) {
      setStatus(status, "enumerateDevices() failed: " + (err.message || err.name || "unknown error"));
    }
  }

  function populateSelects() {
    [selectA, selectB].forEach((sel) => {
      sel.innerHTML = "";
      videoDevices.forEach((d, i) => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `Camera ${i + 1}`;
        sel.appendChild(opt);
      });
    });
    // Default to two different devices when there are at least two, so the
    // concurrency test is meaningful on first click rather than testing a
    // device against itself.
    if (videoDevices.length > 1) selectB.selectedIndex = 1;
  }

  function stopStream(stream) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  // The actual concurrency test: request both streams back-to-back WITHOUT
  // stopping the first one in between. If the phone's camera stack only
  // allows one active capture session at a time (a real, common limitation
  // on Android especially, even across two different rear lenses), the
  // second call fails here -- and that failure, with its real name/message,
  // is exactly what this page exists to surface honestly.
  async function tryBoth() {
    stopStream(streamA);
    stopStream(streamB);
    streamA = null;
    streamB = null;
    videoA.srcObject = null;
    videoB.srcObject = null;

    const idA = selectA.value;
    const idB = selectB.value;
    if (!idA || !idB) {
      setStatus(concurrencyStatus, "Pick a camera for both A and B first.");
      return;
    }

    setStatus(concurrencyStatus, "Opening Camera A…");
    try {
      streamA = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: idA } }, audio: false });
      videoA.srcObject = streamA;
      await videoA.play();
    } catch (err) {
      setStatus(concurrencyStatus, "Camera A failed to open: " + (err.name || "Error") + " — " + (err.message || "unknown error"));
      return;
    }

    setStatus(concurrencyStatus, "Camera A open. Opening Camera B without closing A…");
    try {
      streamB = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: idB } }, audio: false });
      videoB.srcObject = streamB;
      await videoB.play();
    } catch (err) {
      setStatus(
        concurrencyStatus,
        "Camera B failed to open while A was still active: " + (err.name || "Error") + " — " +
        (err.message || "unknown error") +
        ". This device/browser can't run two camera streams at once."
      );
      return;
    }

    setStatus(concurrencyStatus, "Both cameras opened and are streaming at the same time — concurrent capture works on this device.");
  }

  checkBtn.addEventListener("click", checkCameras);
  tryBothBtn.addEventListener("click", tryBoth);

  // ---- Shape Detection API (BarcodeDetector) diagnostic ----
  // Same "just facts about the hardware/browser combination" ethos as
  // the rest of this page: checks the real constructor and its real
  // getSupportedFormats() list directly, rather than assuming support
  // because the constructor exists (its actual decoding backend needs a
  // proprietary component some Chromium builds don't ship at all).
  const checkBarcodeBtn = document.getElementById("checkBarcodeBtn");
  const barcodeStatus = document.getElementById("barcodeStatus");
  const liveScanTestBtn = document.getElementById("liveScanTestBtn");
  const liveScanStatus = document.getElementById("liveScanStatus");
  const liveScanResults = document.getElementById("liveScanResults");

  let barcodeDetector = null;
  let liveScanning = false;
  let liveScanTimer = null;

  async function checkBarcodeSupport() {
    if (typeof window.BarcodeDetector !== "function") {
      setStatus(barcodeStatus, "window.BarcodeDetector is not a function -- this browser doesn't expose the Shape Detection API at all.");
      return;
    }
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      setStatus(barcodeStatus, `BarcodeDetector exists. getSupportedFormats(): [${formats.join(", ")}]` +
        (formats.includes("qr_code") ? " -- qr_code is supported." : " -- qr_code is NOT in this list, so QR-based features elsewhere in this suite will hide themselves here."));
      if (formats.includes("qr_code")) {
        barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
        // Enabled regardless of whether Camera A happens to be open yet --
        // startLiveScanTest()'s own click-time check reports plainly if
        // it isn't, same as clicking "Try opening both at once" without
        // picking cameras first already does elsewhere on this page.
        liveScanTestBtn.disabled = false;
      }
    } catch (err) {
      setStatus(barcodeStatus, "BarcodeDetector exists but getSupportedFormats() threw: " + (err.message || err.name || "unknown error"));
    }
  }

  async function liveScanTick() {
    if (!liveScanning) return;
    try {
      const codes = await barcodeDetector.detect(videoA);
      liveScanResults.innerHTML = "";
      if (codes.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No codes detected in this frame.";
        liveScanResults.appendChild(li);
      } else {
        codes.forEach((c) => {
          const li = document.createElement("li");
          const label = document.createElement("span");
          label.className = "label";
          label.textContent = `format: ${c.format} · rawValue: ${c.rawValue}`;
          const meta = document.createElement("span");
          meta.className = "meta";
          const bb = c.boundingBox;
          meta.textContent = bb ? `boundingBox: x=${bb.x.toFixed(0)} y=${bb.y.toFixed(0)} w=${bb.width.toFixed(0)} h=${bb.height.toFixed(0)}` : "(no boundingBox reported)";
          li.appendChild(label);
          li.appendChild(meta);
          liveScanResults.appendChild(li);
        });
      }
    } catch (err) {
      setStatus(liveScanStatus, "detect() threw: " + (err.message || err.name || "unknown error"));
      stopLiveScanTest();
      return;
    }
    liveScanTimer = setTimeout(liveScanTick, 300);
  }

  function startLiveScanTest() {
    if (!streamA) {
      setStatus(liveScanStatus, "Open Camera A in section 2 first.");
      return;
    }
    liveScanning = true;
    liveScanTestBtn.textContent = "Stop live scan test";
    setStatus(liveScanStatus, "Polling detect() against Camera A's live feed every 300ms…");
    liveScanTick();
  }

  function stopLiveScanTest() {
    liveScanning = false;
    clearTimeout(liveScanTimer);
    liveScanTimer = null;
    liveScanTestBtn.textContent = "Start live scan test (uses Camera A above)";
  }

  checkBarcodeBtn.addEventListener("click", checkBarcodeSupport);
  liveScanTestBtn.addEventListener("click", () => {
    if (liveScanning) stopLiveScanTest(); else startLiveScanTest();
  });
})();
