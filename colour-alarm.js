// Colour Alarm — calibrate one or more real colours, and this sounds a
// real audible siren the moment any of them appears anywhere in the
// camera's view (not just at a fixed aim point). Built to notice
// something entering frame — a hi-vis vest, a specific shirt colour, a
// warning label — not to identify what's already there.
//
// Dependency-free, matching the rest of this suite: no bundler, no npm
// package, just the MediaDevices/WebAudio/Canvas2D APIs already used
// elsewhere in this repo.
(() => {
  "use strict";

  const ROTATE_KEY = "colourAlarmRotate180_v1";
  const SENSITIVITY_KEY = "colourAlarmSensitivity_v1";
  const DWELL_KEY = "colourAlarmDwellMs_v1";
  const VOLUME_KEY = "colourAlarmVolume_v1";
  const ALARM_COLORS_KEY = "colourAlarmColors_v1";
  const MAX_ALARM_COLORS = 16;

  function loadBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) { return fallback; }
  }
  function saveBoolPref(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch (e) {}
  }
  function loadNumberPref(key, fallback) {
    try {
      const n = parseFloat(localStorage.getItem(key));
      return Number.isFinite(n) ? n : fallback;
    } catch (e) { return fallback; }
  }
  function saveNumberPref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  // ---- Colour math (mirrors Sound Colour's own) ----

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgb2hsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s, l];
  }

  function rgb2lab(r, g, b) {
    const rl = srgbToLinear(r), gl_ = srgbToLinear(g), bl = srgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function rgbToCss([r, g, b]) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  function hexToRgb01(hex) {
    const m = hex.replace("#", "");
    return [parseInt(m.substring(0, 2), 16) / 255, parseInt(m.substring(2, 4), 16) / 255, parseInt(m.substring(4, 6), 16) / 255];
  }

  // A colour swatch alone isn't a reliable enough cue on its own -- every
  // swatch also gets a plain-language name from a fixed palette.
  function nearestColorName([r, g, b]) {
    const [h, s, l] = rgb2hsl(r, g, b);
    if (l < 0.10) return "black";
    if (l > 0.94 && s < 0.12) return "white";
    if (s < 0.14) return l < 0.35 ? "dark grey" : l > 0.75 ? "light grey" : "grey";
    if (l < 0.28 && h >= 15 && h < 55 && s >= 0.25) return "brown";
    if (h < 15 || h >= 345) return "red";
    if (h < 45) return "orange";
    if (h < 70) return "yellow";
    if (h < 170) return "green";
    if (h < 195) return "cyan";
    if (h < 255) return "blue";
    if (h < 290) return "purple";
    if (h < 320) return "magenta";
    return "pink";
  }

  // ---- DOM ----

  const video = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const flashOverlay = document.getElementById("flashOverlay");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const calibrateAlarmBtn = document.getElementById("calibrateAlarmBtn");
  const alarmColorsBtn = document.getElementById("alarmColorsBtn");
  const alarmColorsCount = document.getElementById("alarmColorsCount");
  const sensitivitySlider = document.getElementById("sensitivitySlider");
  const sensitivityLabel = document.getElementById("sensitivityLabel");
  const dwellSlider = document.getElementById("dwellSlider");
  const dwellLabel = document.getElementById("dwellLabel");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeLabel = document.getElementById("volumeLabel");
  const testAlarmBtn = document.getElementById("testAlarmBtn");
  const silenceBtn = document.getElementById("silenceBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const zoomWrap = document.getElementById("zoomWrap");
  const zoomSlider = document.getElementById("zoomSlider");
  const zoomLabel = document.getElementById("zoomLabel");
  const pauseBtn = document.getElementById("pauseBtn");
  const alarmIndicator = document.getElementById("alarmIndicator");
  const alarmIndicatorText = document.getElementById("alarmIndicatorText");
  const reticleLayer = document.getElementById("reticleLayer");
  const reticleSwatch = document.getElementById("reticleSwatch");
  const reticleColorName = document.getElementById("reticleColorName");
  const freezeBtn = document.getElementById("freezeBtn");
  const cancelAimBtn = document.getElementById("cancelAimBtn");
  const nameColorPanel = document.getElementById("nameColorPanel");
  const alarmSwatch = document.getElementById("alarmSwatch");
  const alarmSwatchName = document.getElementById("alarmSwatchName");
  const alarmLabelInput = document.getElementById("alarmLabelInput");
  const saveAlarmColorBtn = document.getElementById("saveAlarmColorBtn");
  const closeNameColorBtn = document.getElementById("closeNameColorBtn");
  const alarmColorsPanel = document.getElementById("alarmColorsPanel");
  const alarmColorsGrid = document.getElementById("alarmColorsGrid");
  const closeAlarmColorsBtn = document.getElementById("closeAlarmColorsBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const SCENE_GRID_W = 24;
  const SCENE_GRID_H = 14;
  sampleCanvas.width = SCENE_GRID_W;
  sampleCanvas.height = SCENE_GRID_H;

  let currentStream = null;
  let videoDevices = [];
  let switchingCamera = false;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  let torchTrack = null, torchSupported = false, torchOn = false;
  let zoomTrack = null, zoomSupported = false, zoomMin = 1, zoomMax = 1, zoomStep = 0.1;
  let wakeLock = null;

  function setStatus(msg) { status.textContent = msg; }

  // ---- Torch ----

  function setupTorch(track) {
    torchTrack = track;
    torchOn = false;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    torchSupported = !!(caps && caps.torch);
    torchBtn.classList.toggle("hide", !torchSupported);
    torchBtn.classList.remove("active");
    torchBtn.setAttribute("aria-pressed", "false");
    torchBtn.textContent = "Flashlight";
    if (!torchSupported) return;
    track.addEventListener("ended", () => {
      torchSupported = false;
      torchOn = false;
      torchBtn.classList.add("hide");
    });
  }

  async function toggleTorch() {
    if (!torchTrack || !torchSupported) return;
    const next = !torchOn;
    try {
      await torchTrack.applyConstraints({ advanced: [{ torch: next }] });
      torchOn = next;
      torchBtn.classList.toggle("active", torchOn);
      torchBtn.setAttribute("aria-pressed", String(torchOn));
      torchBtn.textContent = torchOn ? "Flashlight: On" : "Flashlight";
    } catch (err) {
      torchSupported = false;
      torchBtn.classList.add("hide");
    }
  }

  // ---- Zoom ----
  // A real camera-hardware zoom (the Image Capture API's `zoom`
  // MediaTrackConstraint), same technique/precision this detects a
  // calibrated colour with elsewhere in the app -- not a digital crop
  // pretending to be one. Feature-detected off the track's own
  // getCapabilities() and hidden entirely where it isn't genuinely
  // supported (most desktop webcams; only some phone cameras/browsers
  // expose it), same as Colour Vision Extreme's own zoom control.

  // Pure -- no DOM/track access -- so the range/step/initial-value math
  // can be sanity-checked with plain synthetic capability objects, the
  // same reasoning as dmx.js's own pure logic (see __colourAlarmTestables
  // below). Returns null wherever this camera/browser doesn't genuinely
  // report zoom support at all.
  function deriveZoomRange(caps, settings) {
    const range = caps && caps.zoom;
    if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.max <= range.min) return null;
    const min = range.min, max = range.max;
    const step = Number.isFinite(range.step) && range.step > 0 ? range.step : (max - min) / 10 || 0.1;
    const initial = Number.isFinite(settings && settings.zoom) ? settings.zoom : min;
    return { min, max, step, initial };
  }

  function setupZoom(track) {
    zoomTrack = track;
    zoomSupported = false;
    zoomWrap.classList.add("hide");
    const derived = deriveZoomRange(
      track.getCapabilities ? track.getCapabilities() : {},
      track.getSettings ? track.getSettings() : {}
    );
    if (!derived) return;
    zoomSupported = true;
    zoomMin = derived.min;
    zoomMax = derived.max;
    zoomStep = derived.step;
    zoomSlider.min = String(zoomMin);
    zoomSlider.max = String(zoomMax);
    zoomSlider.step = String(zoomStep);
    zoomSlider.value = String(derived.initial);
    zoomLabel.textContent = `${derived.initial.toFixed(1)}x`;
    zoomWrap.classList.remove("hide");
    track.addEventListener("ended", () => {
      zoomSupported = false;
      zoomWrap.classList.add("hide");
    });
  }

  async function applyZoom(value) {
    if (!zoomTrack || !zoomSupported) return;
    const clamped = Math.min(zoomMax, Math.max(zoomMin, value));
    try {
      await zoomTrack.applyConstraints({ advanced: [{ zoom: clamped }] });
      zoomLabel.textContent = `${clamped.toFixed(1)}x`;
    } catch (err) {
      // Reported as supported but rejected in practice -- remove the
      // control rather than leave a dead slider.
      zoomSupported = false;
      zoomWrap.classList.add("hide");
    }
  }
  zoomSlider.addEventListener("input", () => applyZoom(parseFloat(zoomSlider.value)));

  // ---- Wake lock ----

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentStream && !wakeLock) requestWakeLock();
  });

  // ---- Camera ----

  async function attachStream(stream) {
    currentStream = stream;
    video.srcObject = stream;
    await video.play();
    setupTorch(stream.getVideoTracks()[0]);
    setupZoom(stream.getVideoTracks()[0]);
  }

  function stopCurrentStream() {
    if (!currentStream) return;
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  async function refreshVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      cameraSelectWrap.classList.toggle("hide", videoDevices.length <= 1);
      const track = currentStream && currentStream.getVideoTracks()[0];
      const activeId = track && track.getSettings ? track.getSettings().deviceId : null;
      cameraSelect.innerHTML = "";
      videoDevices.forEach((d, i) => {
        const option = document.createElement("option");
        option.value = d.deviceId;
        option.textContent = d.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(option);
      });
      if (activeId) cameraSelect.value = activeId;
    } catch (err) {
      cameraSelectWrap.classList.add("hide");
    }
  }

  async function switchToDevice(deviceId) {
    if (switchingCamera) return;
    switchingCamera = true;
    stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
      await attachStream(stream);
      setStatus("");
      await refreshVideoDevices();
    } catch (err) {
      setStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
    } finally {
      switchingCamera = false;
    }
  }
  cameraSelect.addEventListener("change", () => switchToDevice(cameraSelect.value));

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      await attachStream(stream);
      overlay.classList.add("hide");
      hud.classList.remove("hide");
      requestWakeLock();
      // The siren has to be ready to fire the moment detection first
      // trips it, with no manual "Test alarm" click in between to supply
      // one -- so the AudioContext gets created/resumed HERE, inside this
      // click handler's own call stack, instead of lazily on first alarm.
      // Browser autoplay policy requires it start from a real user
      // gesture; a timer callback later on isn't one, and by then it's
      // too late to matter -- the whole point is the alarm needs to be
      // audible unattended.
      ensureSirenAudio();
      if (sirenCtx && sirenCtx.state === "suspended") sirenCtx.resume().catch(() => {});
      await refreshVideoDevices();
      updateDetectionTimer();
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }
  startBtn.addEventListener("click", startCamera);

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    if (paused) video.pause(); else video.play().catch(() => {});
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    pauseBtn.setAttribute("aria-pressed", String(paused));
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    video.classList.toggle("rotate180", rotate180);
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveBoolPref(ROTATE_KEY, rotate180);
  });
  video.classList.toggle("rotate180", rotate180);
  rotateBtn.classList.toggle("active", rotate180);
  rotateBtn.setAttribute("aria-pressed", String(rotate180));

  torchBtn.addEventListener("click", toggleTorch);

  // ---- Fullscreen ----

  let fullscreenActive = false;

  async function enterFullscreen() {
    try {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) await req.call(document.documentElement);
    } catch (e) {}
    fullscreenActive = true;
    hud.classList.add("hide");
    fullscreenBtn.classList.add("active");
    fullscreenBtn.setAttribute("aria-pressed", "true");
  }

  function exitFullscreenMode() {
    fullscreenActive = false;
    hud.classList.remove("hide");
    fullscreenBtn.classList.remove("active");
    fullscreenBtn.setAttribute("aria-pressed", "false");
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      exit.call(document).catch ? exit.call(document).catch(() => {}) : exit.call(document);
    }
  }

  fullscreenBtn.addEventListener("click", () => {
    if (fullscreenActive) exitFullscreenMode(); else enterFullscreen();
  });

  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (fullscreenActive && !document.fullscreenElement && !document.webkitFullscreenElement) exitFullscreenMode();
    });
  });

  // ---- Alarm colours (calibration) ----
  // { id, label, sourceColor: [r,g,b 0-1] } -- deliberately simpler than
  // Sound Colour's own saved points (no correction, no instrument): all
  // this needs to know is what to watch for.

  function loadAlarmColors() {
    try {
      const raw = JSON.parse(localStorage.getItem(ALARM_COLORS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveAlarmColors() {
    try { localStorage.setItem(ALARM_COLORS_KEY, JSON.stringify(alarmColors)); } catch (e) {}
  }
  let alarmColors = loadAlarmColors();
  let frozenColor = null;
  let aiming = false;

  function updateAlarmColorsCount() {
    alarmColorsCount.textContent = String(alarmColors.length);
  }
  updateAlarmColorsCount();

  function sampleCenterColor() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    const vw = video.videoWidth, vh = video.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.15;
    const sx = Math.max(0, vw / 2 - cropSize / 2);
    const sy = Math.max(0, vh / 2 - cropSize / 2);
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 64, 64);
    const data = ctx.getImageData(24, 24, 12, 12).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  let aimIntervalId = null;

  function startAiming() {
    aiming = true;
    reticleLayer.classList.remove("hide");
    aimIntervalId = setInterval(() => {
      const c = sampleCenterColor();
      reticleSwatch.style.background = rgbToCss(c);
      reticleColorName.textContent = nearestColorName(c);
    }, 120);
    cancelAimBtn.focus();
  }

  function stopAiming() {
    aiming = false;
    reticleLayer.classList.add("hide");
    if (aimIntervalId) { clearInterval(aimIntervalId); aimIntervalId = null; }
    calibrateAlarmBtn.focus();
  }

  function openNameColorPanel(sourceColor) {
    frozenColor = sourceColor;
    alarmSwatch.style.background = rgbToCss(sourceColor);
    alarmSwatchName.textContent = nearestColorName(sourceColor);
    alarmLabelInput.value = "";
    nameColorPanel.classList.remove("hide");
    alarmLabelInput.focus();
  }

  function closeNameColorPanel() {
    nameColorPanel.classList.add("hide");
    frozenColor = null;
    calibrateAlarmBtn.focus();
  }

  function saveAlarmColor() {
    if (!frozenColor) return;
    if (alarmColors.length >= MAX_ALARM_COLORS) {
      setStatus(`Limit of ${MAX_ALARM_COLORS} alarm colours reached — delete one to add another.`);
      closeNameColorPanel();
      return;
    }
    alarmColors.push({
      id: "ac_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      label: alarmLabelInput.value.trim(),
      sourceColor: frozenColor
    });
    saveAlarmColors();
    updateAlarmColorsCount();
    closeNameColorPanel();
  }

  function renderAlarmColorsGrid() {
    alarmColorsGrid.innerHTML = "";
    if (alarmColors.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No alarm colours yet. Use \"Calibrate alarm colour\" to add your first one.";
      alarmColorsGrid.appendChild(empty);
      return;
    }
    alarmColors.forEach((c) => {
      const colorName = nearestColorName(c.sourceColor);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "point-card";
      card.setAttribute("aria-label", `${c.label || "untitled"}, ${colorName}. Tap to delete.`);
      const sw = document.createElement("div");
      sw.className = "point-swatch";
      sw.style.background = rgbToCss(c.sourceColor);
      const label = document.createElement("div");
      label.className = "point-label";
      label.textContent = c.label || "untitled";
      const name = document.createElement("div");
      name.className = "point-name";
      name.textContent = colorName;
      card.append(sw, label, name);
      card.addEventListener("click", () => {
        if (!window.confirm(`Delete "${c.label || colorName}"? This can't be undone.`)) return;
        alarmColors = alarmColors.filter((p) => p.id !== c.id);
        saveAlarmColors();
        updateAlarmColorsCount();
        renderAlarmColorsGrid();
      });
      alarmColorsGrid.appendChild(card);
    });
  }

  function openAlarmColorsPanel() {
    renderAlarmColorsGrid();
    alarmColorsPanel.classList.remove("hide");
    closeAlarmColorsBtn.focus();
  }
  function closeAlarmColorsPanel() {
    alarmColorsPanel.classList.add("hide");
    alarmColorsBtn.focus();
  }

  calibrateAlarmBtn.addEventListener("click", startAiming);
  cancelAimBtn.addEventListener("click", stopAiming);
  freezeBtn.addEventListener("click", () => {
    const c = sampleCenterColor();
    stopAiming();
    openNameColorPanel(c);
  });
  saveAlarmColorBtn.addEventListener("click", saveAlarmColor);
  closeNameColorBtn.addEventListener("click", closeNameColorPanel);
  alarmColorsBtn.addEventListener("click", openAlarmColorsPanel);
  closeAlarmColorsBtn.addEventListener("click", closeAlarmColorsPanel);

  // ---- Detection ----
  // Samples a downscaled grid of the WHOLE frame (not just the center
  // reticle point) every ~150ms, converts each cell to Lab, and checks
  // whether ANY cell is within threshold of ANY saved alarm colour --
  // built to notice something entering frame anywhere, not just at a
  // fixed aim point the way calibration itself works.

  const SENSITIVITY_MIN_LAB_DISTANCE = 10; // strict -- must nearly match exactly
  const SENSITIVITY_MAX_LAB_DISTANCE = 50; // loose -- reaches further from the exact colour
  let sensitivity = loadNumberPref(SENSITIVITY_KEY, 50);
  let dwellMs = loadNumberPref(DWELL_KEY, 600);
  let alarmVolume = loadNumberPref(VOLUME_KEY, 70);

  function sensitivityToLabDistance(pct) {
    return SENSITIVITY_MIN_LAB_DISTANCE + (SENSITIVITY_MAX_LAB_DISTANCE - SENSITIVITY_MIN_LAB_DISTANCE) * (pct / 100);
  }

  let detectionTimerId = null;
  let matchStreakStartMs = null;
  let lastMatchAtMs = 0;
  let alarmActive = false;
  let silencedUntilMs = 0;

  function sampleGridHasMatch() {
    if (!alarmColors.length || video.readyState < video.HAVE_CURRENT_DATA) return false;
    sampleCtx.drawImage(video, 0, 0, SCENE_GRID_W, SCENE_GRID_H);
    const data = sampleCtx.getImageData(0, 0, SCENE_GRID_W, SCENE_GRID_H).data;
    const threshold = sensitivityToLabDistance(sensitivity);
    // Alarm colours' own Lab coordinates, computed once per tick rather
    // than once per cell -- cheap either way at this grid size, but no
    // reason to redo it 336 times over.
    const labTargets = alarmColors.map((c) => rgb2lab(c.sourceColor[0], c.sourceColor[1], c.sourceColor[2]));
    for (let i = 0; i < data.length; i += 4) {
      const [L, A, B] = rgb2lab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
      for (const [tL, tA, tB] of labTargets) {
        if (Math.hypot(L - tL, A - tA, B - tB) < threshold) return true;
      }
    }
    return false;
  }

  function setAlarmActive(active) {
    if (active === alarmActive) return;
    alarmActive = active;
    alarmIndicator.classList.toggle("hide", !active);
    flashOverlay.classList.toggle("active", active);
    silenceBtn.classList.toggle("hide", !active);
    if (active) startSiren(); else stopSiren();
  }

  function updateDetectionTick() {
    const now = Date.now();
    const matched = sampleGridHasMatch();
    if (matched) {
      lastMatchAtMs = now;
      if (matchStreakStartMs == null) matchStreakStartMs = now;
      const silenced = now < silencedUntilMs;
      if (!silenced && now - matchStreakStartMs >= dwellMs) {
        setAlarmActive(true);
      }
    } else {
      matchStreakStartMs = null;
      // Auto-clears once the colour's been gone a beat -- not on the very
      // next silent tick, so a single missed frame doesn't flicker it off.
      if (alarmActive && now - lastMatchAtMs > 1500) setAlarmActive(false);
    }
  }

  function updateDetectionTimer() {
    if (detectionTimerId) { clearInterval(detectionTimerId); detectionTimerId = null; }
    if (currentStream) detectionTimerId = setInterval(updateDetectionTick, 150);
  }

  // ---- Siren (Web Audio) ----
  // A real wailing two-tone siren: one oscillator, its own frequency
  // continuously swept between two bounds by a second (inaudible, control-
  // rate) oscillator acting as an LFO -- the same "modulate an AudioParam
  // with another oscillator's output" technique any Web Audio siren/vibrato
  // effect uses, not a synthesized approximation of a recording.

  let sirenCtx = null, sirenOsc = null, sirenLfo = null, sirenLfoGain = null, sirenGain = null;

  function ensureSirenAudio() {
    if (sirenCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    sirenCtx = new Ctx();
    sirenOsc = sirenCtx.createOscillator();
    sirenOsc.type = "sawtooth";
    sirenOsc.frequency.value = 900;
    sirenLfo = sirenCtx.createOscillator();
    sirenLfo.type = "sine";
    sirenLfo.frequency.value = 0.8; // one full wail cycle every 1.25s
    sirenLfoGain = sirenCtx.createGain();
    sirenLfoGain.gain.value = 350; // sweep +-350Hz around the 900Hz centre
    sirenLfo.connect(sirenLfoGain);
    sirenLfoGain.connect(sirenOsc.frequency);
    sirenGain = sirenCtx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(sirenCtx.destination);
    sirenOsc.start();
    sirenLfo.start();
  }

  function startSiren() {
    ensureSirenAudio();
    if (!sirenCtx) return;
    if (sirenCtx.state === "suspended") sirenCtx.resume().catch(() => {});
    sirenGain.gain.setTargetAtTime(alarmVolume / 100, sirenCtx.currentTime, 0.05);
    alarmIndicatorText.textContent = "ALARM — colour detected";
  }

  function stopSiren() {
    if (!sirenGain) return;
    sirenGain.gain.setTargetAtTime(0, sirenCtx.currentTime, 0.15);
  }

  // Exposed for the same kind of outside-the-app sanity check this repo's
  // other pure/near-pure logic gets (see dmx.js's own __dmxTestables) --
  // there's no way to observe an AudioContext's autoplay-policy state from
  // outside otherwise.
  window.__colourAlarmTestables = {
    getSirenContextState: () => (sirenCtx ? sirenCtx.state : null),
    deriveZoomRange
  };

  let testAlarmTimeoutId = null;
  testAlarmBtn.addEventListener("click", () => {
    ensureSirenAudio();
    if (!sirenCtx) return;
    if (sirenCtx.state === "suspended") sirenCtx.resume().catch(() => {});
    if (testAlarmTimeoutId) clearTimeout(testAlarmTimeoutId);
    sirenGain.gain.setTargetAtTime(alarmVolume / 100, sirenCtx.currentTime, 0.05);
    alarmIndicatorText.textContent = "TEST — this is only a test";
    alarmIndicator.classList.remove("hide");
    flashOverlay.classList.add("active");
    testAlarmTimeoutId = setTimeout(() => {
      if (!alarmActive) {
        sirenGain.gain.setTargetAtTime(0, sirenCtx.currentTime, 0.15);
        alarmIndicator.classList.add("hide");
        flashOverlay.classList.remove("active");
      }
      testAlarmTimeoutId = null;
    }, 3000);
  });

  silenceBtn.addEventListener("click", () => {
    silencedUntilMs = Date.now() + 10000;
    setAlarmActive(false);
    matchStreakStartMs = null;
  });

  sensitivitySlider.value = String(sensitivity);
  sensitivityLabel.textContent = `${sensitivity}%`;
  sensitivitySlider.addEventListener("input", () => {
    sensitivity = parseFloat(sensitivitySlider.value);
    sensitivityLabel.textContent = `${sensitivity}%`;
    saveNumberPref(SENSITIVITY_KEY, sensitivity);
  });

  dwellSlider.value = String(dwellMs);
  dwellLabel.textContent = `${dwellMs}ms`;
  dwellSlider.addEventListener("input", () => {
    dwellMs = parseFloat(dwellSlider.value);
    dwellLabel.textContent = `${dwellMs}ms`;
    saveNumberPref(DWELL_KEY, dwellMs);
  });

  volumeSlider.value = String(alarmVolume);
  volumeLabel.textContent = `${alarmVolume}%`;
  volumeSlider.addEventListener("input", () => {
    alarmVolume = parseFloat(volumeSlider.value);
    volumeLabel.textContent = `${alarmVolume}%`;
    saveNumberPref(VOLUME_KEY, alarmVolume);
    if (alarmActive && sirenGain) sirenGain.gain.setTargetAtTime(alarmVolume / 100, sirenCtx.currentTime, 0.05);
  });
})();
