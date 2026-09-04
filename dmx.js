// DMX Lighting Control — turns this app's live camera/microphone signals
// into real DMX512 output, driving actual room lighting (LED bars, PAR
// cans, a laser/strobe trigger) through a USB DMX interface.
//
// Talks the Enttec DMX USB PRO protocol (message-framed, no host-generated
// break signal needed) over the Web Serial API. That protocol is also what
// most inexpensive "Enttec Pro compatible" USB-DMX interfaces implement,
// which is why it's the one picked here rather than raw "Open DMX USB"
// framing: Open DMX USB needs the HOST to generate the actual DMX break/
// mark-after-break timing on the wire, which the Web Serial API has no way
// to do reliably — there is no way to drive that class of interface from a
// browser at all, not just this one. Likewise this can't reach an Art-Net
// or sACN network node directly (both are UDP, unreachable from browser
// JS) — that would need a small local bridge process, not attempted here.
//
// Everything below is dependency-free, matching the rest of this app: no
// bundler, no npm package, just the Web Serial/MediaDevices/WebAudio APIs
// this repo already relies on elsewhere.
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Pure logic (no DOM/API access) — kept separate and argument-only so it
  // can be sanity-checked outside a browser (plain arrays/numbers in, plain
  // values out), the same spirit as this repo's other "verified live via a
  // mock" commits, just without a browser to mock in this case.
  // ---------------------------------------------------------------------

  const SCENE_GRID_W = 12;
  const SCENE_GRID_H = 8;

  // Rec. 709 luma weights — the same "how bright does this actually read"
  // formula used elsewhere in this app's colour tools, not a plain average.
  function luma709(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Reads one small RGBA frame once and gets both the "Dominant colour"
  // signal (the frame's average colour) and the "Structural complexity"
  // signal (how much adjacent cells' brightness actually varies) out of it
  // — a flat wall or sky averages near 0, a detailed/busy scene reads
  // higher. Both come off a single downscaled sample instead of two passes.
  function computeSceneStats(pixels, w, h) {
    let sumR = 0, sumG = 0, sumB = 0;
    const n = w * h;
    const lumaGrid = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
      sumR += r; sumG += g; sumB += b;
      lumaGrid[i] = luma709(r, g, b) / 255;
    }
    let diffSum = 0, diffCount = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (x + 1 < w) { diffSum += Math.abs(lumaGrid[idx] - lumaGrid[idx + 1]); diffCount++; }
        if (y + 1 < h) { diffSum += Math.abs(lumaGrid[idx] - lumaGrid[idx + w]); diffCount++; }
      }
    }
    const meanDiff = diffCount ? diffSum / diffCount : 0;
    // On a 12x8 grid, a genuinely busy/detailed scene's adjacent-cell
    // brightness difference rarely exceeds ~0.25 in practice (a flat
    // surface sits near 0) -- scaled so "complexity" uses its full 0..1
    // range instead of only ever reading the bottom of the dial.
    const complexity = Math.max(0, Math.min(1, meanDiff / 0.25));
    return { r: sumR / n / 255, g: sumG / n / 255, b: sumB / n / 255, complexity };
  }

  // Average FFT bin energy (0..1) across a real Hz range, independent of
  // sample rate or FFT size -- unlike fraction-of-bins, this reads the same
  // "bass" range whether the device's mic runs at 44100Hz or 48000Hz.
  function bandEnergyHz(freqData, sampleRate, loHz, hiHz) {
    const nyquist = sampleRate / 2;
    const n = freqData.length;
    const startBin = Math.max(0, Math.floor((loHz / nyquist) * n));
    const endBin = Math.min(n, Math.max(startBin + 1, Math.ceil((hiHz / nyquist) * n)));
    let sum = 0;
    for (let i = startBin; i < endBin; i++) sum += freqData[i];
    return sum / ((endBin - startBin) * 255);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // Same absolute-floor + relative-jump bass beat detector Sound Nebula's
  // detectBassBeat already uses (script.js), adapted to return a decaying
  // continuous 0..1 value instead of firing a one-shot callback -- a DMX
  // strobe/laser channel wants a held, fading pulse each tick, not a
  // single instant that a slow refresh rate could miss entirely.
  function makeBeatTracker() {
    return { history: [], lastAt: -Infinity, value: 0 };
  }
  function updateBeatTracker(tracker, bassEnergy, sensitivity0to100, nowMs, cooldownMs) {
    tracker.history.push(bassEnergy);
    if (tracker.history.length > 30) tracker.history.shift();
    tracker.value *= 0.85; // decays every tick regardless of a new hit
    if (tracker.history.length >= 8) {
      const t = sensitivity0to100 / 100;
      const absThreshold = lerp(0.30, 0.08, t);
      const relThreshold = lerp(1.6, 1.12, t);
      const avg = tracker.history.reduce((a, b) => a + b, 0) / tracker.history.length;
      const isBeat = bassEnergy > absThreshold && bassEnergy > avg * relThreshold && (nowMs - tracker.lastAt) > cooldownMs;
      if (isBeat) {
        tracker.lastAt = nowMs;
        const strength = Math.min(1, Math.max(0, (bassEnergy - absThreshold) / (0.85 - absThreshold)));
        tracker.value = Math.max(tracker.value, strength);
      }
    }
    return Math.max(0, Math.min(1, tracker.value));
  }

  const PROFILES = {
    dimmer: { label: "Dimmer (1ch)", channels: ["dimmer"] },
    rgb: { label: "RGB (3ch)", channels: ["red", "green", "blue"] },
    rgbw: { label: "RGBW (4ch)", channels: ["red", "green", "blue", "white"] },
    dimmer_rgb: { label: "Dimmer + RGB (4ch)", channels: ["dimmer", "red", "green", "blue"] },
    strobe: { label: "Strobe / laser trigger (1ch)", channels: ["trigger"] },
  };
  const CHANNEL_LABELS = { dimmer: "Dim", red: "R", green: "G", blue: "B", white: "W", trigger: "Trig" };
  const SOURCES = {
    camera_colour: "Dominant colour (camera)",
    camera_complexity: "Structural complexity (camera)",
    audio_bass: "Audio: Bass",
    audio_mid: "Audio: Mid",
    audio_treble: "Audio: Treble",
    audio_beat: "Audio: Beat trigger",
    manual: "Manual test slider",
  };
  const SCALAR_SOURCES = new Set(["camera_complexity", "audio_bass", "audio_mid", "audio_treble", "audio_beat", "manual"]);

  function byte(v) { return Math.max(0, Math.min(255, Math.round(v * 255))); }

  function hexToRgb01(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return [1, 1, 1];
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  // The one function that turns a fixture's config + the latest sampled
  // signals into the actual DMX byte(s) it should output right now.
  // Dominant colour drives RGB(W)/Dimmer channels directly from the real
  // sampled colour (White = the shared/min component, the common cheap-
  // RGBW approximation; Dimmer/Trigger = luma). Every other source is a
  // single 0..1 scalar -- for an RGB(W) fixture that scalar rides the
  // fixture's own Tint colour (so e.g. a bass-driven PAR can flash red,
  // not just white), while Dimmer/Trigger channels use the scalar as-is.
  function computeFixtureChannelValues(fixture, state) {
    const profile = PROFILES[fixture.profile] || PROFILES.dimmer;
    const names = profile.channels;
    if (fixture.source === "camera_colour") {
      const r = state.r || 0, g = state.g || 0, b = state.b || 0;
      const dim = luma709(r, g, b);
      return names.map((n) => {
        if (n === "red") return byte(r);
        if (n === "green") return byte(g);
        if (n === "blue") return byte(b);
        if (n === "white") return byte(Math.min(r, g, b));
        return byte(dim); // dimmer or trigger
      });
    }
    const scalarMap = {
      camera_complexity: state.complexity, audio_bass: state.bass, audio_mid: state.mid,
      audio_treble: state.treble, audio_beat: state.beat, manual: (fixture.manualValue || 0) / 100,
    };
    const scalar = Math.max(0, Math.min(1, scalarMap[fixture.source] || 0));
    const [tr, tg, tb] = hexToRgb01(fixture.tint);
    return names.map((n) => {
      if (n === "red") return byte(tr * scalar);
      if (n === "green") return byte(tg * scalar);
      if (n === "blue") return byte(tb * scalar);
      return byte(scalar); // white, dimmer, or trigger
    });
  }

  // Enttec DMX USB PRO "Output Only Send DMX Packet" framing (label 6):
  // 0x7E, label, data-length (u16 LE), data (start code + up to 512
  // channels), 0x7E's matching 0xE7 terminator.
  function buildEnttecFrame(dmxBytesWithStartCode) {
    const len = dmxBytesWithStartCode.length;
    const frame = new Uint8Array(4 + len + 1);
    frame[0] = 0x7E;
    frame[1] = 6;
    frame[2] = len & 0xFF;
    frame[3] = (len >> 8) & 0xFF;
    frame.set(dmxBytesWithStartCode, 4);
    frame[4 + len] = 0xE7;
    return frame;
  }

  // Exposed for the same kind of outside-the-browser sanity check this
  // repo's other complex logic gets -- see the pure functions above.
  window.__dmxTestables = {
    computeSceneStats, bandEnergyHz, updateBeatTracker, makeBeatTracker,
    computeFixtureChannelValues, buildEnttecFrame, hexToRgb01, byte, PROFILES,
  };

  // ---------------------------------------------------------------------
  // DOM / runtime wiring
  // ---------------------------------------------------------------------

  const FIXTURES_KEY = "dmxFixtures_v1";
  const BAUD_KEY = "dmxBaud_v1";
  const REFRESH_KEY = "dmxRefreshHz_v1";
  const SENSITIVITY_KEY = "dmxBeatSensitivity_v1";

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const startStatus = document.getElementById("status");
  const serialSupportHint = document.getElementById("serialSupportHint");
  const dmxMain = document.getElementById("dmxMain");
  const dmxStatus = document.getElementById("dmxStatus");

  const serialPill = document.getElementById("serialPill");
  const serialPillText = document.getElementById("serialPillText");
  const cameraPill = document.getElementById("cameraPill");
  const cameraPillText = document.getElementById("cameraPillText");
  const micPill = document.getElementById("micPill");
  const micPillText = document.getElementById("micPillText");

  const serialConnectBtn = document.getElementById("serialConnectBtn");
  const serialDisconnectBtn = document.getElementById("serialDisconnectBtn");
  const baudSelect = document.getElementById("baudSelect");
  const refreshSlider = document.getElementById("refreshSlider");
  const refreshLabel = document.getElementById("refreshLabel");
  const cameraToggleBtn = document.getElementById("cameraToggleBtn");
  const micToggleBtn = document.getElementById("micToggleBtn");
  const beatSensitivitySlider = document.getElementById("beatSensitivitySlider");
  const fixtureList = document.getElementById("fixtureList");
  const fixtureEmptyHint = document.getElementById("fixtureEmptyHint");
  const addFixtureBtn = document.getElementById("dmxAddFixtureBtn");
  const blackoutBtn = document.getElementById("dmxBlackoutBtn");
  const cameraFeed = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  sampleCanvas.width = SCENE_GRID_W;
  sampleCanvas.height = SCENE_GRID_H;
  const sceneCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const hasSerial = "serial" in navigator;
  serialSupportHint.textContent = hasSerial
    ? ""
    : "This browser doesn't support Web Serial — open this page in desktop Chrome or Edge to actually drive a DMX interface. (You can still add/preview fixtures without it.)";

  function loadFixtures() {
    try {
      const raw = JSON.parse(localStorage.getItem(FIXTURES_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveFixtures() {
    try { localStorage.setItem(FIXTURES_KEY, JSON.stringify(fixtures)); } catch (e) {}
  }
  let fixtures = loadFixtures();
  let nextFixtureId = fixtures.reduce((m, f) => Math.max(m, f.id || 0), 0) + 1;

  let refreshHz = (() => {
    const n = parseInt(localStorage.getItem(REFRESH_KEY), 10);
    return Number.isFinite(n) && n >= 10 && n <= 40 ? n : 30;
  })();
  refreshSlider.value = String(refreshHz);
  refreshLabel.textContent = String(refreshHz);

  let beatSensitivity = (() => {
    const n = parseInt(localStorage.getItem(SENSITIVITY_KEY), 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
  })();
  beatSensitivitySlider.value = String(beatSensitivity);

  const savedBaud = localStorage.getItem(BAUD_KEY);
  if (savedBaud && [...baudSelect.options].some((o) => o.value === savedBaud)) baudSelect.value = savedBaud;

  // Live signal state, refreshed once per tick.
  const state = { r: 0, g: 0, b: 0, complexity: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
  const beatTracker = makeBeatTracker();
  const dmxBuffer = new Uint8Array(513); // index 0 = DMX start code (0x00)

  let cameraStream = null, cameraEnabled = false;
  let micStream = null, micEnabled = false, audioCtx = null, analyser = null, freqData = null;
  let serialPort = null, serialWriter = null, serialConnected = false, writing = false;
  let tickTimer = null;
  const fixtureMeters = new Map(); // fixture id -> chip container element

  function setDmxStatus(msg) { dmxStatus.textContent = msg || ""; }

  function updateSerialPill(errorMsg) {
    if (serialConnected) {
      serialPill.className = "dmx-pill connected";
      serialPillText.textContent = "Interface: connected";
    } else if (errorMsg) {
      serialPill.className = "dmx-pill error";
      serialPillText.textContent = "Interface: " + errorMsg;
    } else {
      serialPill.className = "dmx-pill";
      serialPillText.textContent = "Interface: not connected";
    }
  }
  function updateCameraPill() {
    cameraPill.className = cameraEnabled ? "dmx-pill connected" : "dmx-pill";
    cameraPillText.textContent = "Camera: " + (cameraEnabled ? "on" : "off");
  }
  function updateMicPill() {
    micPill.className = micEnabled ? "dmx-pill connected" : "dmx-pill";
    micPillText.textContent = "Microphone: " + (micEnabled ? "on" : "off");
  }
  updateSerialPill(); updateCameraPill(); updateMicPill();

  // ---- Fixtures UI -------------------------------------------------

  function defaultFixture() {
    return { id: nextFixtureId++, name: "Fixture " + (fixtures.length + 1), startChannel: 1, profile: "rgb", source: "camera_colour", tint: "#ffffff", manualValue: 50 };
  }

  function renderFixtures() {
    fixtureList.innerHTML = "";
    fixtureEmptyHint.classList.toggle("hide", fixtures.length > 0);
    fixtureMeters.clear();
    for (const fixture of fixtures) fixtureList.appendChild(buildFixtureRow(fixture));
  }

  function buildFixtureRow(fixture) {
    const card = document.createElement("div");
    card.className = "dmx-fixture";

    const row1 = document.createElement("div");
    row1.className = "dmx-fixture-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = fixture.name;
    nameInput.setAttribute("aria-label", "Fixture name");
    nameInput.addEventListener("change", () => { fixture.name = nameInput.value.trim() || fixture.name; saveFixtures(); });

    const chLabel = document.createElement("span");
    chLabel.className = "dmx-fixture-label";
    chLabel.textContent = "Ch:";
    const chInput = document.createElement("input");
    chInput.type = "number";
    chInput.min = "1"; chInput.max = "512";
    chInput.value = String(fixture.startChannel);
    chInput.addEventListener("change", () => {
      const v = Math.max(1, Math.min(512, parseInt(chInput.value, 10) || 1));
      fixture.startChannel = v; chInput.value = String(v); saveFixtures();
    });

    const profileSelect = document.createElement("select");
    for (const key of Object.keys(PROFILES)) {
      const opt = document.createElement("option");
      opt.value = key; opt.textContent = PROFILES[key].label;
      if (key === fixture.profile) opt.selected = true;
      profileSelect.appendChild(opt);
    }
    profileSelect.addEventListener("change", () => { fixture.profile = profileSelect.value; saveFixtures(); renderFixtures(); });

    const removeBtn = document.createElement("button");
    removeBtn.className = "dmx-remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      fixtures = fixtures.filter((f) => f.id !== fixture.id);
      saveFixtures(); renderFixtures();
    });

    row1.append(nameInput, chLabel, chInput, profileSelect, removeBtn);

    const row2 = document.createElement("div");
    row2.className = "dmx-fixture-row";
    const srcLabel = document.createElement("span");
    srcLabel.className = "dmx-fixture-label";
    srcLabel.textContent = "Source:";
    const sourceSelect = document.createElement("select");
    for (const key of Object.keys(SOURCES)) {
      const opt = document.createElement("option");
      opt.value = key; opt.textContent = SOURCES[key];
      if (key === fixture.source) opt.selected = true;
      sourceSelect.appendChild(opt);
    }
    sourceSelect.addEventListener("change", () => { fixture.source = sourceSelect.value; saveFixtures(); renderFixtures(); });
    row2.append(srcLabel, sourceSelect);

    if (SCALAR_SOURCES.has(fixture.source) && PROFILES[fixture.profile].channels.some((c) => c !== "dimmer" && c !== "trigger")) {
      const tintLabel = document.createElement("span");
      tintLabel.className = "dmx-fixture-label";
      tintLabel.textContent = "Tint:";
      const tintInput = document.createElement("input");
      tintInput.type = "color";
      tintInput.value = fixture.tint || "#ffffff";
      tintInput.addEventListener("input", () => { fixture.tint = tintInput.value; });
      tintInput.addEventListener("change", saveFixtures);
      row2.append(tintLabel, tintInput);
    }

    if (fixture.source === "manual") {
      const manualLabel = document.createElement("span");
      manualLabel.className = "dmx-fixture-label";
      manualLabel.textContent = "Value:";
      const manualSlider = document.createElement("input");
      manualSlider.type = "range";
      manualSlider.min = "0"; manualSlider.max = "100";
      manualSlider.value = String(fixture.manualValue);
      manualSlider.addEventListener("input", () => { fixture.manualValue = Number(manualSlider.value); });
      manualSlider.addEventListener("change", saveFixtures);
      row2.append(manualLabel, manualSlider);
    }

    const meter = document.createElement("div");
    meter.className = "dmx-channel-meter";
    fixtureMeters.set(fixture.id, meter);

    card.append(row1, row2, meter);
    return card;
  }

  function updateFixtureMeter(fixture, values) {
    const meter = fixtureMeters.get(fixture.id);
    if (!meter) return;
    const names = PROFILES[fixture.profile].channels;
    meter.innerHTML = "";
    for (let i = 0; i < values.length; i++) {
      const chip = document.createElement("span");
      chip.className = "dmx-channel-chip";
      chip.textContent = "Ch" + (fixture.startChannel + i) + " " + CHANNEL_LABELS[names[i]] + ":" + values[i];
      meter.appendChild(chip);
    }
  }

  addFixtureBtn.addEventListener("click", () => {
    fixtures.push(defaultFixture());
    saveFixtures(); renderFixtures();
  });

  // ---- Camera / microphone -----------------------------------------

  async function enableCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
      cameraEnabled = true;
      cameraToggleBtn.textContent = "Disable camera";
      cameraToggleBtn.classList.add("active");
      cameraToggleBtn.setAttribute("aria-pressed", "true");
      updateCameraPill();
    } catch (e) {
      setDmxStatus("Camera error: " + e.message);
    }
  }
  function stopCamera() {
    if (cameraStream) { for (const t of cameraStream.getTracks()) t.stop(); }
    cameraStream = null; cameraEnabled = false;
    cameraToggleBtn.textContent = "Enable camera";
    cameraToggleBtn.classList.remove("active");
    cameraToggleBtn.setAttribute("aria-pressed", "false");
    updateCameraPill();
  }
  cameraToggleBtn.addEventListener("click", () => { cameraEnabled ? stopCamera() : enableCamera(); });

  async function enableMic() {
    try {
      // Same reasoning as Sound Nebula's Music mode (script.js): default
      // echo cancellation/noise suppression is tuned for speech and would
      // mute music/room audio played out loud, which is exactly what a
      // Bass/Mid/Treble/Beat-driven fixture needs to actually hear.
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      const src = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      micEnabled = true;
      micToggleBtn.textContent = "Disable microphone";
      micToggleBtn.classList.add("active");
      micToggleBtn.setAttribute("aria-pressed", "true");
      updateMicPill();
    } catch (e) {
      setDmxStatus("Microphone error: " + e.message);
    }
  }
  function stopMic() {
    if (micStream) { for (const t of micStream.getTracks()) t.stop(); }
    if (audioCtx) { audioCtx.close().catch(() => {}); }
    micStream = null; audioCtx = null; analyser = null; freqData = null; micEnabled = false;
    state.bass = state.mid = state.treble = state.beat = 0;
    micToggleBtn.textContent = "Enable microphone";
    micToggleBtn.classList.remove("active");
    micToggleBtn.setAttribute("aria-pressed", "false");
    updateMicPill();
  }
  micToggleBtn.addEventListener("click", () => { micEnabled ? stopMic() : enableMic(); });

  beatSensitivitySlider.addEventListener("input", () => { beatSensitivity = Number(beatSensitivitySlider.value); });
  beatSensitivitySlider.addEventListener("change", () => { try { localStorage.setItem(SENSITIVITY_KEY, String(beatSensitivity)); } catch (e) {} });

  // ---- Serial (DMX interface) ---------------------------------------

  async function connectSerial() {
    if (!hasSerial) { setDmxStatus("Web Serial isn't available in this browser — try desktop Chrome or Edge."); return; }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudSelect.value), dataBits: 8, stopBits: 1, parity: "none" });
      serialPort = port;
      serialWriter = port.writable.getWriter();
      serialConnected = true;
      try { localStorage.setItem(BAUD_KEY, baudSelect.value); } catch (e) {}
      updateSerialPill();
      serialConnectBtn.classList.add("hide");
      serialDisconnectBtn.classList.remove("hide");
      setDmxStatus("");
    } catch (e) {
      setDmxStatus("Connect failed: " + e.message);
    }
  }
  async function disconnectSerial(errorMsg) {
    if (serialWriter) { try { await serialWriter.close(); } catch (e) {} serialWriter = null; }
    if (serialPort) { try { await serialPort.close(); } catch (e) {} serialPort = null; }
    serialConnected = false;
    updateSerialPill(errorMsg);
    serialConnectBtn.classList.remove("hide");
    serialDisconnectBtn.classList.add("hide");
  }
  serialConnectBtn.addEventListener("click", connectSerial);
  serialDisconnectBtn.addEventListener("click", () => disconnectSerial());
  if (hasSerial) {
    navigator.serial.addEventListener("disconnect", (e) => {
      if (serialPort && e.target === serialPort) disconnectSerial("interface unplugged");
    });
  }

  async function sendFrame() {
    if (!serialWriter || writing) return; // never queue a second write behind a slow one
    writing = true;
    try {
      await serialWriter.write(buildEnttecFrame(dmxBuffer));
    } catch (e) {
      writing = false;
      await disconnectSerial("write failed");
      return;
    }
    writing = false;
  }

  // ---- Main tick loop -------------------------------------------------

  function sampleCameraIfEnabled() {
    if (!cameraEnabled || cameraFeed.readyState < cameraFeed.HAVE_CURRENT_DATA) return;
    sceneCtx.drawImage(cameraFeed, 0, 0, SCENE_GRID_W, SCENE_GRID_H);
    const data = sceneCtx.getImageData(0, 0, SCENE_GRID_W, SCENE_GRID_H).data;
    const stats = computeSceneStats(data, SCENE_GRID_W, SCENE_GRID_H);
    state.r = stats.r; state.g = stats.g; state.b = stats.b; state.complexity = stats.complexity;
  }
  function sampleAudioIfEnabled(nowMs) {
    if (!micEnabled || !analyser) return;
    analyser.getByteFrequencyData(freqData);
    state.bass = bandEnergyHz(freqData, audioCtx.sampleRate, 20, 250);
    state.mid = bandEnergyHz(freqData, audioCtx.sampleRate, 250, 2000);
    state.treble = bandEnergyHz(freqData, audioCtx.sampleRate, 2000, 8000);
    state.beat = updateBeatTracker(beatTracker, state.bass, beatSensitivity, nowMs, 120);
  }

  function tick() {
    const now = performance.now();
    sampleCameraIfEnabled();
    sampleAudioIfEnabled(now);
    dmxBuffer[0] = 0; // DMX start code
    for (const fixture of fixtures) {
      const values = computeFixtureChannelValues(fixture, state);
      for (let i = 0; i < values.length; i++) {
        const ch = fixture.startChannel + i;
        if (ch >= 1 && ch <= 512) dmxBuffer[ch] = values[i];
      }
      updateFixtureMeter(fixture, values);
    }
    sendFrame();
  }

  function restartTickLoop() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, Math.round(1000 / refreshHz));
  }
  refreshSlider.addEventListener("input", () => {
    refreshHz = Number(refreshSlider.value);
    refreshLabel.textContent = String(refreshHz);
    restartTickLoop();
  });
  refreshSlider.addEventListener("change", () => { try { localStorage.setItem(REFRESH_KEY, String(refreshHz)); } catch (e) {} });

  blackoutBtn.addEventListener("click", () => {
    dmxBuffer.fill(0);
    sendFrame();
    setDmxStatus("Blacked out.");
  });

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    dmxMain.classList.remove("hide");
    renderFixtures();
    restartTickLoop();
  });

  window.addEventListener("beforeunload", () => {
    if (tickTimer) clearInterval(tickTimer);
  });
})();
