(() => {
  "use strict";

  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");
  const hud = document.getElementById("hud");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const micModeBtn = document.getElementById("micModeBtn");
  const flashBtn = document.getElementById("flashBtn");
  const flashStatus = document.getElementById("flashStatus");
  const sensitivitySlider = document.getElementById("sensitivitySlider");
  const speedSlider = document.getElementById("speedSlider");
  const dimToggle = document.getElementById("dimToggle");
  const invertToggle = document.getElementById("invertToggle");
  const screenFlashToggle = document.getElementById("screenFlashToggle");
  const testFlashBtn = document.getElementById("testFlashBtn");
  const screenFlashEl = document.getElementById("screenFlash");
  const freqLowSlider = document.getElementById("freqLowSlider");
  const freqHighSlider = document.getElementById("freqHighSlider");
  const freqRangeLabel = document.getElementById("freqRangeLabel");
  const freqAllBtn = document.getElementById("freqAllBtn");
  const blackoutEl = document.getElementById("blackout");
  const syncDelaySlider = document.getElementById("syncDelaySlider");
  const syncDelayLabel = document.getElementById("syncDelayLabel");
  const connectTabletBtn = document.getElementById("connectTabletBtn");
  const cameraBgBtn = document.getElementById("cameraBgBtn");
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const nebulaBtn = document.getElementById("nebulaBtn");
  const outlinesBtn = document.getElementById("outlinesBtn");
  const outlineThicknessWrap = document.getElementById("outlineThicknessWrap");
  const outlineThicknessSlider = document.getElementById("outlineThicknessSlider");
  const outlineThicknessLabel = document.getElementById("outlineThicknessLabel");
  const outlineBlendWrap = document.getElementById("outlineBlendWrap");
  const outlineBlendSlider = document.getElementById("outlineBlendSlider");
  const outlineBlendLabel = document.getElementById("outlineBlendLabel");
  const outlineOpacityWrap = document.getElementById("outlineOpacityWrap");
  const outlineOpacitySlider = document.getElementById("outlineOpacitySlider");
  const outlineOpacityLabel = document.getElementById("outlineOpacityLabel");
  const outlineColorWrap = document.getElementById("outlineColorWrap");
  const outlineColorInput = document.getElementById("outlineColorInput");
  const cartoonBtn = document.getElementById("cartoonBtn");
  const cartoonLevelsWrap = document.getElementById("cartoonLevelsWrap");
  const cartoonLevelsSlider = document.getElementById("cartoonLevelsSlider");
  const cartoonLevelsLabel = document.getElementById("cartoonLevelsLabel");
  const cartoonEdgeThicknessWrap = document.getElementById("cartoonEdgeThicknessWrap");
  const cartoonEdgeThicknessSlider = document.getElementById("cartoonEdgeThicknessSlider");
  const cartoonEdgeThicknessLabel = document.getElementById("cartoonEdgeThicknessLabel");
  const cartoonEdgeStrengthWrap = document.getElementById("cartoonEdgeStrengthWrap");
  const cartoonEdgeStrengthSlider = document.getElementById("cartoonEdgeStrengthSlider");
  const cartoonEdgeStrengthLabel = document.getElementById("cartoonEdgeStrengthLabel");
  const cartoonSaturationWrap = document.getElementById("cartoonSaturationWrap");
  const cartoonSaturationSlider = document.getElementById("cartoonSaturationSlider");
  const cartoonSaturationLabel = document.getElementById("cartoonSaturationLabel");
  const cameraFeed = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const colourVisionBtn = document.getElementById("colourVisionBtn");
  const colourVisionFlashBtn = document.getElementById("colourVisionFlashBtn");
  const blendWrap = document.getElementById("blendWrap");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const cvdTypeWrap = document.getElementById("cvdTypeWrap");
  const cvdTypeSelect = document.getElementById("cvdTypeSelect");
  const cvdStrengthWrap = document.getElementById("cvdStrengthWrap");
  const cvdStrengthSlider = document.getElementById("cvdStrengthSlider");
  const cvdStrengthLabel = document.getElementById("cvdStrengthLabel");
  const spreadWrap = document.getElementById("spreadWrap");
  const spreadSlider = document.getElementById("spreadSlider");
  const spreadLabel = document.getElementById("spreadLabel");
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const pointsCount = document.getElementById("pointsCount");
  const rotateBtn = document.getElementById("rotateBtn");
  const photoBtn = document.getElementById("photoBtn");
  const recordFpsSelect = document.getElementById("recordFpsSelect");
  const recordBtn = document.getElementById("recordBtn");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const recordingIndicatorTime = document.getElementById("recordingIndicatorTime");
  const floatingCaptureBar = document.getElementById("floatingCaptureBar");
  const floatingCalibrateBtn = document.getElementById("floatingCalibrateBtn");
  const floatingPhotoBtn = document.getElementById("floatingPhotoBtn");
  const floatingRecordBtn = document.getElementById("floatingRecordBtn");
  const choosePanel = document.getElementById("choosePanel");
  const chooseAimBtn = document.getElementById("chooseAimBtn");
  const colourPickerInput = document.getElementById("colourPickerInput");
  const presetGrid = document.getElementById("presetGrid");
  const closeChooseBtn = document.getElementById("closeChooseBtn");
  const reticleLayer = document.getElementById("reticleLayer");
  const reticle = document.getElementById("reticle");
  const reticleSwatch = document.getElementById("reticleSwatch");
  const reticleColorName = document.getElementById("reticleColorName");
  const freezeBtn = document.getElementById("freezeBtn");
  const cancelAimBtn = document.getElementById("cancelAimBtn");
  const tunePanel = document.getElementById("tunePanel");
  const swatchOriginal = document.getElementById("swatchOriginal");
  const swatchCorrected = document.getElementById("swatchCorrected");
  const swatchOriginalName = document.getElementById("swatchOriginalName");
  const swatchCorrectedName = document.getElementById("swatchCorrectedName");
  const hueSlider = document.getElementById("hueSlider");
  const satSlider = document.getElementById("satSlider");
  const lightSlider = document.getElementById("lightSlider");
  const contrastSlider = document.getElementById("contrastSlider");
  const exposureSlider = document.getElementById("exposureSlider");
  const hueLabel = document.getElementById("hueLabel");
  const satLabel = document.getElementById("satLabel");
  const lightLabel = document.getElementById("lightLabel");
  const contrastLabel = document.getElementById("contrastLabel");
  const exposureLabel = document.getElementById("exposureLabel");
  const labelInput = document.getElementById("labelInput");
  const savePointBtn = document.getElementById("savePointBtn");
  const deletePointBtn = document.getElementById("deletePointBtn");
  const closeTuneBtn = document.getElementById("closeTuneBtn");
  const pointsPanel = document.getElementById("pointsPanel");
  const pointsGrid = document.getElementById("pointsGrid");
  const pointsHint = document.getElementById("pointsHint");
  const closePointsBtn = document.getElementById("closePointsBtn");
  const selectModeBtn = document.getElementById("selectModeBtn");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
  const selectedCount = document.getElementById("selectedCount");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const importExportStatus = document.getElementById("importExportStatus");
  const profileSelect = document.getElementById("profileSelect");
  const loadProfileBtn = document.getElementById("loadProfileBtn");
  const deleteProfileBtn = document.getElementById("deleteProfileBtn");
  const profileNameInput = document.getElementById("profileNameInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileStatus = document.getElementById("profileStatus");
  const viewerPanel = document.getElementById("viewerPanel");
  const startShareBtn = document.getElementById("startShareBtn");
  const shareCodeBlock = document.getElementById("shareCodeBlock");
  const shareRoomCode = document.getElementById("shareRoomCode");
  const shareViewUrlText = document.getElementById("shareViewUrlText");
  const viewerStatus = document.getElementById("viewerStatus");
  const closeViewerPanelBtn = document.getElementById("closeViewerPanelBtn");
  const viewerConnectedBadge = document.getElementById("viewerConnectedBadge");
  const cameraOnlyBtn = document.getElementById("cameraOnlyBtn");
  const cameraOnlyBadge = document.getElementById("cameraOnlyBadge");
  const cameraOnlyRoomCode = document.getElementById("cameraOnlyRoomCode");
  const cameraOnlyStatusText = document.getElementById("cameraOnlyStatusText");
  const cameraOnlyStopBtn = document.getElementById("cameraOnlyStopBtn");
  const showReceiveBtn = document.getElementById("showReceiveBtn");
  const receiveForm = document.getElementById("receiveForm");
  const receiveRoomInput = document.getElementById("receiveRoomInput");
  const receiveConnectBtn = document.getElementById("receiveConnectBtn");
  const receiverStatusBadge = document.getElementById("receiverStatusBadge");

  // Band edges are real Hz, not raw bin fractions — a fixed bin fraction
  // (e.g. "first 8% of bins") stretches up past 1.5kHz and picks up guitar
  // fundamentals/harmonics along with actual kick/bass content. `from`/`to`
  // (fractions of the Nyquist frequency) are filled in once the real
  // sample rate is known, in startAudio().
  const BANDS = [
    { name: "bass", fromHz: 20, toHz: 150, hue: 262, count: 90 },   // violet — kick/bass only
    { name: "mid", fromHz: 150, toHz: 2000, hue: 189, count: 90 }, // cyan — guitars, vocals, snare body
    { name: "treble", fromHz: 2000, toHz: 9000, hue: 330, count: 90 } // pink — cymbals, presence
  ];

  // Public, no-signup STUN server — needed for NAT traversal even between
  // devices on the same wifi network in many router configurations. No
  // TURN relay is configured, so very restrictive networks can still
  // block the connection.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  let audioCtx, analyser, freqData, timeData, source, stream, nyquist;
  // Default getUserMedia constraints apply echo cancellation & noise
  // suppression tuned for speech, which treats music playing from this
  // device's own speaker as "echo" and suppresses it — so it picks up a
  // voice fine but not Spotify played out loud. Music mode disables those.
  const MIC_MODE_KEY = "micMusicMode_v1";
  let musicMode = localStorage.getItem(MIC_MODE_KEY) === "1";
  let cameraBackgroundEnabled = false;
  // ---- Visualiser settings persistence ----
  // Everything below used to reset to its hardcoded default on every
  // reload — sensitivity, flash speed, dim/invert/screen-flash toggles,
  // frequency range, sync delay, nebula visibility, and the true/corrected
  // blend all now survive across sessions the same way outlines/cartoon
  // settings already did.
  const SENSITIVITY_KEY = "sensitivity_soundNebula_v1";
  const FLASH_SPEED_KEY = "flashSpeed_soundNebula_v1";
  const DIM_FLICKER_KEY = "dimFlicker_soundNebula_v1";
  const TORCH_INVERTED_KEY = "torchInverted_soundNebula_v1";
  const SCREEN_FLASH_KEY = "screenFlash_soundNebula_v1";
  const FREQ_LOW_KEY = "freqLow_soundNebula_v1";
  const FREQ_HIGH_KEY = "freqHigh_soundNebula_v1";
  const SYNC_DELAY_KEY = "syncDelay_soundNebula_v1";
  const NEBULA_ENABLED_KEY = "nebulaEnabled_soundNebula_v1";
  const BLEND_KEY = "blend_soundNebula_v1";

  function loadBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) {
      return fallback;
    }
  }
  function saveBoolPref(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch (e) {}
  }
  function saveNumberPref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  let nebulaEnabled = loadBoolPref(NEBULA_ENABLED_KEY, true);
  // ---- Outlines mode ----
  // Redraws the particle nebula as stroked/hollow shapes instead of solid
  // glow blobs, and (when colour vision correction is running) overlays a
  // Sobel edge-detection outline on the camera view — same three sliders
  // drive both. Thickness/Blend/Opacity keep working even with the mode
  // toggled off (so turning it back on remembers where you left them);
  // it's outlinesEnabled that gates whether they have any visible effect.
  const OUTLINE_ENABLED_KEY = "outlinesEnabled_soundNebula_v1";
  const OUTLINE_THICKNESS_KEY = "outlineThickness_soundNebula_v1";
  const OUTLINE_BLEND_KEY = "outlineBlend_soundNebula_v1";
  const OUTLINE_OPACITY_KEY = "outlineOpacity_soundNebula_v1";
  const OUTLINE_DEFAULT_THICKNESS = 2;
  const OUTLINE_DEFAULT_BLEND = 1;
  const OUTLINE_DEFAULT_OPACITY = 1;
  const OUTLINE_COLOR_KEY = "outlineColor_soundNebula_v1";
  const OUTLINE_DEFAULT_COLOR = "#ffffff";

  function loadOutlineNumberPref(key, fallback) {
    try {
      const raw = parseFloat(localStorage.getItem(key));
      return Number.isFinite(raw) ? raw : fallback;
    } catch (e) {
      return fallback;
    }
  }

  let outlinesEnabled = (() => {
    try { return localStorage.getItem(OUTLINE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let outlineThickness = loadOutlineNumberPref(OUTLINE_THICKNESS_KEY, OUTLINE_DEFAULT_THICKNESS);
  let outlineBlend = loadOutlineNumberPref(OUTLINE_BLEND_KEY, OUTLINE_DEFAULT_BLEND);
  let outlineOpacity = loadOutlineNumberPref(OUTLINE_OPACITY_KEY, OUTLINE_DEFAULT_OPACITY);
  let outlineColor = loadOutlineColorPref();
  let outlineColorRgb = cvHexToRgb01(outlineColor);

  function saveOutlinesEnabledPref() {
    try { localStorage.setItem(OUTLINE_ENABLED_KEY, outlinesEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveOutlineThicknessPref() {
    try { localStorage.setItem(OUTLINE_THICKNESS_KEY, String(outlineThickness)); } catch (e) {}
  }
  function saveOutlineBlendPref() {
    try { localStorage.setItem(OUTLINE_BLEND_KEY, String(outlineBlend)); } catch (e) {}
  }
  function saveOutlineOpacityPref() {
    try { localStorage.setItem(OUTLINE_OPACITY_KEY, String(outlineOpacity)); } catch (e) {}
  }
  function loadOutlineColorPref() {
    try {
      const raw = localStorage.getItem(OUTLINE_COLOR_KEY);
      return /^#[0-9a-f]{6}$/i.test(raw) ? raw : OUTLINE_DEFAULT_COLOR;
    } catch (e) {
      return OUTLINE_DEFAULT_COLOR;
    }
  }
  function saveOutlineColorPref() {
    try { localStorage.setItem(OUTLINE_COLOR_KEY, outlineColor); } catch (e) {}
  }

  // ---- Cartoon mode ----
  // Flattens particle colours (and the camera view, when Colour vision is
  // on) into a handful of bold bands and draws bold dark edge lines —
  // mutually exclusive with Outlines mode since both draw edges over the
  // same content.
  const CARTOON_ENABLED_KEY = "cartoonEnabled_soundNebula_v1";
  const CARTOON_LEVELS_KEY = "cartoonLevels_soundNebula_v1";
  const CARTOON_DEFAULT_LEVELS = 6;
  const CARTOON_EDGE_THICKNESS_KEY = "cartoonEdgeThickness_soundNebula_v1";
  const CARTOON_EDGE_STRENGTH_KEY = "cartoonEdgeStrength_soundNebula_v1";
  const CARTOON_SATURATION_KEY = "cartoonSaturation_soundNebula_v1";
  const CARTOON_DEFAULT_EDGE_THICKNESS = 2;
  const CARTOON_DEFAULT_EDGE_STRENGTH = 0.6;
  const CARTOON_DEFAULT_SATURATION = 1.35;
  let cartoonEnabled = (() => {
    try { return localStorage.getItem(CARTOON_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let cartoonLevels = loadOutlineNumberPref(CARTOON_LEVELS_KEY, CARTOON_DEFAULT_LEVELS);
  let cartoonEdgeThickness = loadOutlineNumberPref(CARTOON_EDGE_THICKNESS_KEY, CARTOON_DEFAULT_EDGE_THICKNESS);
  let cartoonEdgeStrength = loadOutlineNumberPref(CARTOON_EDGE_STRENGTH_KEY, CARTOON_DEFAULT_EDGE_STRENGTH);
  let cartoonSaturation = loadOutlineNumberPref(CARTOON_SATURATION_KEY, CARTOON_DEFAULT_SATURATION);

  // ---- Photo/video capture ----
  const RECORD_FPS_KEY = "recordFps_soundNebula_v1";
  const DEFAULT_RECORD_FPS = 30;
  const RECORD_FPS_OPTIONS = [15, 24, 30, 60];
  const FLOATING_CAPTURE_POS_KEY = "floatingCapturePos_soundNebula_v1";
  const LONG_PRESS_MS = 450;
  const DRAG_CANCEL_PX = 10;
  const SHUTTER_MODE_KEY = "shutterMode_soundNebula_v1";
  let shutterMode = (() => {
    try { return localStorage.getItem(SHUTTER_MODE_KEY) === "video" ? "video" : "photo"; } catch (e) { return "photo"; }
  })();
  let shutterModeStatusTimer = null;
  let isRecording = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingMimeType = "";
  let recordingStartedAt = 0;
  let recordingTimerId = null;
  let recordFps = (() => {
    try {
      const raw = parseInt(localStorage.getItem(RECORD_FPS_KEY), 10);
      return RECORD_FPS_OPTIONS.includes(raw) ? raw : DEFAULT_RECORD_FPS;
    } catch (e) { return DEFAULT_RECORD_FPS; }
  })();

  function saveCartoonEnabledPref() {
    try { localStorage.setItem(CARTOON_ENABLED_KEY, cartoonEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveCartoonLevelsPref() {
    try { localStorage.setItem(CARTOON_LEVELS_KEY, String(cartoonLevels)); } catch (e) {}
  }
  function saveCartoonEdgeThicknessPref() {
    try { localStorage.setItem(CARTOON_EDGE_THICKNESS_KEY, String(cartoonEdgeThickness)); } catch (e) {}
  }
  function saveCartoonEdgeStrengthPref() {
    try { localStorage.setItem(CARTOON_EDGE_STRENGTH_KEY, String(cartoonEdgeStrength)); } catch (e) {}
  }
  function saveCartoonSaturationPref() {
    try { localStorage.setItem(CARTOON_SATURATION_KEY, String(cartoonSaturation)); } catch (e) {}
  }

  let cameraStream = null;
  const CAMERA_DEVICE_KEY = "cameraDeviceId_v1";
  let selectedCameraId = localStorage.getItem(CAMERA_DEVICE_KEY) || "";
  // Declared up here (not down with the rest of the colour-vision state,
  // near where it's used) because resize() — called immediately below —
  // already calls resizeCorrectionCanvas(), which reads correctionCanvas.
  // A let binding referenced before its own declaration line has run
  // throws (temporal dead zone), even though the *function* referencing it
  // is safely hoisted; only actually needs to exist as null this early.
  let correctionCanvas = null, correctionGl = null, correctionProgram = null,
    correctionUniforms = null, correctionQuadBuffer = null, correctionVideoTexture = null;
  let width, height, cx, cy, dpr;
  let particles = [];
  let running = false;
  let rafId = null;
  let smoothedVolume = 0;
  const bandEnergy = { bass: 0, mid: 0, treble: 0 };
  const bandEnergySmoothed = { bass: 0, mid: 0, treble: 0 };

  // Beat -> flash/vibrate.
  let flashEnabled = false;
  let torchTrack = null;
  let torchSupported = false;
  let torchBusy = false;
  let torchFailCount = 0;
  const TORCH_MAX_FAILS = 5;
  let vibrateSupported = typeof navigator.vibrate === "function";
  let bassHistory = [];
  let lastBeatAt = 0;
  let sensitivity = loadOutlineNumberPref(SENSITIVITY_KEY, 50) / 100; // 0 (least sensitive) .. 1 (most sensitive)
  let flashSpeed = loadOutlineNumberPref(FLASH_SPEED_KEY, 50) / 100; // 0 (slow) .. 1 (fast strobe)
  let beatCooldownMs = 180;
  let minFlashMs = 50;
  let maxFlashMs = 160;
  let dimFlickerEnabled = loadBoolPref(DIM_FLICKER_KEY, false);
  let screenFlashEnabled = loadBoolPref(SCREEN_FLASH_KEY, false);
  let torchInverted = loadBoolPref(TORCH_INVERTED_KEY, false); // false: off, flashes on beat. true: on, cuts on beat.
  let syncDelayMs = loadOutlineNumberPref(SYNC_DELAY_KEY, 0); // delays torch/vibrate/screen flash after beat detection
  const BEAT_HISTORY_LEN = 40;
  // Beat strength (0..1, how far above the detection threshold a hit
  // landed) at or above which the screen flash blacks out instead of
  // showing the usual band-weighted colour — reserved for genuinely hard
  // hits, not just moderately loud ones.
  const SCREEN_FLASH_BLACK_THRESHOLD = 0.65;
  // There's no real brightness constraint for camera torch on the web
  // platform — it's on/off only. This rapidly toggles the torch during
  // each pulse to approximate a dimmer look; it's a rough illusion, not
  // real dimming, and its smoothness is capped by how fast the device's
  // camera hardware can actually respond to on/off calls.
  const FLICKER_PERIOD_MS = 30;
  const FLICKER_DUTY = 0.45;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function updateFlashSpeed() {
    flashSpeed = Number(speedSlider.value) / 100;
    // Slowest: a beat can retrigger at most ~2.5x/sec. Fastest: ~14x/sec
    // (close to a genuine strobe). Flash pulse length is kept well inside
    // the cooldown window so pulses never bleed into the next beat.
    beatCooldownMs = lerp(400, 70, flashSpeed);
    minFlashMs = Math.max(18, beatCooldownMs * 0.28);
    maxFlashMs = Math.max(minFlashMs + 10, beatCooldownMs * 0.75);
    saveNumberPref(FLASH_SPEED_KEY, speedSlider.value);
  }

  const FREQ_MIN_GAP_HZ = 20;

  function updateFreqRange(movedSlider) {
    let low = Number(freqLowSlider.value);
    let high = Number(freqHighSlider.value);
    if (high - low < FREQ_MIN_GAP_HZ) {
      if (movedSlider === "low") {
        high = Math.min(Number(freqHighSlider.max), low + FREQ_MIN_GAP_HZ);
        freqHighSlider.value = String(high);
      } else {
        low = Math.max(Number(freqLowSlider.min), high - FREQ_MIN_GAP_HZ);
        freqLowSlider.value = String(low);
      }
    }
    // BANDS[0] ("bass") drives both the bass particle swarm and beat
    // detection — they read the same underlying signal, so this slider
    // reshapes both together, not beat detection alone.
    BANDS[0].fromHz = low;
    BANDS[0].toHz = high;
    freqRangeLabel.textContent = `${low}-${high} Hz`;
    if (nyquist) {
      BANDS[0].from = Math.min(1, low / nyquist);
      BANDS[0].to = Math.min(1, high / nyquist);
    }
    saveNumberPref(FREQ_LOW_KEY, low);
    saveNumberPref(FREQ_HIGH_KEY, high);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = width / 2;
    cy = height / 2;
    resizeCorrectionCanvas();
  }
  window.addEventListener("resize", resize);
  resize();

  function makeParticle(band) {
    const baseRadius = Math.min(width, height) * (0.16 + Math.random() * 0.22);
    return {
      band,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.02,
      baseRadius,
      radiusJitter: Math.random() * 40 + 10,
      jitterPhase: Math.random() * Math.PI * 2,
      jitterSpeed: 0.5 + Math.random() * 1.2,
      size: 1.2 + Math.random() * 2.4,
      hueOffset: (Math.random() - 0.5) * 24
    };
  }

  function seedParticles() {
    particles = [];
    for (const band of BANDS) {
      for (let i = 0; i < band.count; i++) {
        particles.push(makeParticle(band));
      }
    }
  }

  function computeBandEnergy() {
    analyser.getByteFrequencyData(freqData);
    const n = freqData.length;
    for (const band of BANDS) {
      const start = Math.floor(band.from * n);
      const end = Math.max(start + 1, Math.floor(band.to * n));
      let sum = 0;
      for (let i = start; i < end; i++) sum += freqData[i];
      bandEnergy[band.name] = sum / (end - start) / 255;
    }

    analyser.getByteTimeDomainData(timeData);
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / timeData.length);
    smoothedVolume += (rms - smoothedVolume) * 0.15;

    for (const band of BANDS) {
      bandEnergySmoothed[band.name] +=
        (bandEnergy[band.name] - bandEnergySmoothed[band.name]) * 0.2;
    }

    if (flashEnabled || screenFlashEnabled || colourVisionFlashEnabled) detectBeat();
  }

  function detectBeat() {
    const bass = bandEnergy.bass;
    bassHistory.push(bass);
    if (bassHistory.length > BEAT_HISTORY_LEN) bassHistory.shift();
    if (bassHistory.length < 8) return;

    // sensitivity 0 -> harder to trigger (high bar), 1 -> easier (low bar).
    const absThreshold = lerp(0.30, 0.08, sensitivity);
    const relThreshold = lerp(1.6, 1.12, sensitivity);

    const avg = bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length;
    const now = performance.now();
    const isBeat =
      bass > absThreshold &&
      bass > avg * relThreshold &&
      now - lastBeatAt > beatCooldownMs;

    if (isBeat) {
      lastBeatAt = now;
      // How far above threshold this hit landed, 0 (just cleared the bar)
      // to 1 (very strong hit) — drives a proportionally longer flash.
      const strength = Math.min(1, Math.max(0, (bass - absThreshold) / (0.85 - absThreshold)));
      if (syncDelayMs > 0) {
        setTimeout(() => fireBeatEffects(strength), syncDelayMs);
      } else {
        fireBeatEffects(strength);
      }
    }
  }

  function fireBeatEffects(strength) {
    if (flashEnabled) {
      if (vibrateSupported) {
        try { navigator.vibrate(35); } catch (_) { /* ignore */ }
      }
      if (torchSupported && torchTrack && !torchBusy) {
        const duration = lerp(minFlashMs, maxFlashMs, strength);
        pulseTorch(duration);
      }
    }
    if (screenFlashEnabled) {
      const duration = lerp(minFlashMs, maxFlashMs, strength) + 60;
      // Strong hits black the screen instead of flashing colour — the
      // hardest-hitting beats read as a sharp cut to black rather than
      // just a brighter version of the same colour pulse. Softer/normal
      // beats keep the existing band-weighted colour flash.
      const color = strength >= SCREEN_FLASH_BLACK_THRESHOLD ? "#000000" : beatColor(strength);
      flashScreen(color, duration, strength);
    }
    if (colourVisionFlashEnabled) {
      fireColourVisionFlash(strength);
    }
  }

  function beatColor(strength) {
    const bass = bandEnergy.bass, mid = bandEnergy.mid, treble = bandEnergy.treble;
    const total = bass + mid + treble || 1;
    const hue =
      (BANDS[0].hue * bass + BANDS[1].hue * mid + BANDS[2].hue * treble) / total;
    // Stronger beats trend brighter/whiter; quieter ones stay more tinted.
    // Kept fairly light/bright throughout since the "screen" blend mode
    // means darker colours would barely register against the scene.
    const light = lerp(65, 92, strength);
    const sat = lerp(90, 45, strength);
    if (colourVisionFlashEnabled && correctionGl) {
      const rgb = cvHsl2rgb(hue, sat / 100, light / 100);
      const corrected = correctColorViaShader(rgb, 1);
      if (corrected) return cvRgbToCss(corrected);
    }
    return `hsl(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
  }

  function flashScreen(color, durationMs, strength) {
    screenFlashEl.style.transition = "none";
    screenFlashEl.style.backgroundColor = color;
    screenFlashEl.style.opacity = String(lerp(0.45, 0.85, strength));
    // Force a reflow so the transition below animates from this opacity
    // instead of jumping straight to the end value.
    void screenFlashEl.offsetHeight;
    screenFlashEl.style.transition = `opacity ${durationMs}ms ease-out`;
    screenFlashEl.style.opacity = "0";
  }

  function pulseTorch(durationMs) {
    torchBusy = true;
    if (torchInverted) {
      // Base state is ON (set when flash was armed/toggled); a beat
      // briefly cuts it OFF then restores ON.
      setTorchConstraint(false).then(() => {
        setTimeout(() => {
          setTorchConstraint(true).finally(() => {
            torchBusy = false;
          });
        }, durationMs);
      }).catch(() => {
        torchBusy = false;
      });
      return;
    }
    if (dimFlickerEnabled) {
      flickerTorch(durationMs).finally(() => {
        torchBusy = false;
      });
      return;
    }
    setTorchConstraint(true).then(() => {
      setTimeout(() => {
        setTorchConstraint(false).finally(() => {
          torchBusy = false;
        });
      }, durationMs);
    }).catch(() => {
      torchBusy = false;
    });
  }

  async function flickerTorch(durationMs) {
    const cycles = Math.max(1, Math.round(durationMs / FLICKER_PERIOD_MS));
    const onMs = FLICKER_PERIOD_MS * FLICKER_DUTY;
    const offMs = FLICKER_PERIOD_MS - onMs;
    for (let i = 0; i < cycles; i++) {
      if (!dimFlickerEnabled || !torchTrack || torchTrack.readyState === "ended") break;
      await setTorchConstraint(true).catch(() => {});
      await sleep(onMs);
      if (!torchSupported) break;
      await setTorchConstraint(false).catch(() => {});
      await sleep(offMs);
    }
    if (torchTrack && torchTrack.readyState !== "ended") {
      await setTorchConstraint(false).catch(() => {});
    }
  }

  function setTorchConstraint(on) {
    if (!torchTrack || torchTrack.readyState === "ended") {
      handleTorchLost(
        "The camera connection was lost (often caused by the screen locking " +
          "or the tab losing focus). Turn the flash toggle off and back on to reconnect."
      );
      return Promise.reject(new Error("torch track unavailable"));
    }
    return torchTrack
      .applyConstraints({ advanced: [{ torch: on }] })
      .then(() => {
        torchFailCount = 0;
      })
      .catch((err) => {
        // A single rejected constraint call can happen transiently (e.g. an
        // overlapping on/off pair); only give up after repeated failures.
        torchFailCount++;
        if (torchFailCount >= TORCH_MAX_FAILS) {
          handleTorchLost(
            "The camera flash stopped responding and has been disarmed. " +
              "Turn the flash toggle off and back on to try again."
          );
        }
        throw err;
      });
  }

  function handleTorchLost(message) {
    torchSupported = false;
    if (torchTrack) {
      torchTrack.stop();
      torchTrack = null;
    }
    appendFlashStatus(message);
  }

  function draw(time) {
    if (cameraBackgroundEnabled) {
      // A fresh camera frame every draw, rather than the plain background's
      // fade trail — the trail effect is for a background that otherwise
      // never changes on its own; a live camera feed already does that, and
      // redrawing it full-opacity each frame means it never gets muddied by
      // leftover particle glow, only ever the newest frame. Still dimmed
      // over so the particles read clearly against whatever's in view —
      // unless the nebula's hidden, in which case skip the dimming too so
      // the camera (and any colour vision correction on it) shows clean.
      drawCameraBackground();
      if (nebulaEnabled) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(5, 5, 10, 0.35)";
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(5, 5, 10, 0.18)";
      ctx.fillRect(0, 0, width, height);
    }

    // Beat detection and band energy still need to run every frame even
    // with the nebula hidden — colour vision flash mode and the screen
    // flash are still beat-synced without the particles visible.
    computeBandEnergy();

    if (nebulaEnabled) {
      // Pulsing core reacts to overall volume.
      const coreRadius = Math.min(width, height) * (0.04 + smoothedVolume * 0.12);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 3.2);
      coreGrad.addColorStop(0, "rgba(255,255,255,0.9)");
      coreGrad.addColorStop(0.25, "rgba(167,139,250,0.55)");
      coreGrad.addColorStop(1, "rgba(167,139,250,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 3.2, 0, Math.PI * 2);
      ctx.fill();

      for (const p of particles) {
        const energy = bandEnergySmoothed[p.band.name];
        p.angle += p.angularSpeed * (1 + energy * 6);
        const jitter =
          Math.sin(time * 0.001 * p.jitterSpeed + p.jitterPhase) * p.radiusJitter;
        const radius = p.baseRadius * (1 + energy * 1.4) + jitter;
        const x = cx + Math.cos(p.angle) * radius;
        const y = cy + Math.sin(p.angle) * radius * 0.72; // slight ellipse flattening
        const size = p.size * (1 + energy * 3.2);
        const alpha = 0.25 + energy * 0.65;
        const hue = p.band.hue + p.hueOffset;

        if (cartoonEnabled) {
          // Flat cel-shaded look: snap hue to one of a handful of bands
          // (instead of the smooth soft-glow gradient) and ink a bold dark
          // ring around the solid fill. satPct/lineOpacity mirror the
          // shader's cvCartoonize()/cvCartoonLine() formulas so the same
          // sliders feel consistent whether they're tuning particles or
          // the camera view.
          const hueStep = 360 / Math.max(cartoonLevels, 2);
          const bandHue = Math.floor(((hue % 360) + 360) % 360 / hueStep) * hueStep + hueStep / 2;
          const flatAlpha = Math.min(1, alpha * 1.3);
          const satPct = Math.min(100, Math.max(20, cartoonSaturation * 70));
          const lineOpacity = 0.35 + 0.65 * cartoonEdgeStrength;
          ctx.fillStyle = `hsla(${bandHue}, ${satPct}%, 62%, ${flatAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(8, 8, 14, ${flatAlpha * lineOpacity})`;
          ctx.lineWidth = Math.max(1.5, cartoonEdgeThickness);
          ctx.stroke();
        } else {
          // 0 when Outlines mode is off — keeps this pixel-for-pixel
          // identical to the plain filled look with no behaviour change.
          const outlineWeight = outlinesEnabled ? outlineBlend : 0;

          if (outlineWeight < 1) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
            grad.addColorStop(0, `hsla(${hue}, 90%, 70%, ${alpha * (1 - outlineWeight)})`);
            grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, size * 4, 0, Math.PI * 2);
            ctx.fill();
          }

          if (outlineWeight > 0) {
            ctx.strokeStyle = `hsla(${hue}, 90%, 75%, ${alpha * outlineWeight * outlineOpacity})`;
            ctx.lineWidth = outlineThickness;
            ctx.beginPath();
            ctx.arc(x, y, size * 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }

    if (running) rafId = requestAnimationFrame(draw);
  }

  async function startAudio() {
    startBtn.disabled = true;
    statusEl.textContent = "";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints(), video: false });
    } catch (err) {
      statusEl.textContent =
        err && err.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access and try again."
          : "Couldn't access a microphone: " + (err && err.message ? err.message : err);
      startBtn.disabled = false;
      return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    // Kept low (not the AnalyserNode default of 0.8) so short percussive
    // hits aren't blended away before the beat detector sees them; the
    // particle visuals get their own smoothing separately below.
    analyser.smoothingTimeConstant = 0.15;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);

    nyquist = audioCtx.sampleRate / 2;
    for (const band of BANDS) {
      band.from = Math.min(1, band.fromHz / nyquist);
      band.to = Math.min(1, band.toHz / nyquist);
    }

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    // Intentionally not connected to audioCtx.destination — this only
    // analyses the mic input, it never plays it back (no feedback loop).

    seedParticles();
    running = true;
    overlay.classList.add("hide");
    hud.classList.remove("hide");
    updateFloatingCaptureBarVisibility();
    rafId = requestAnimationFrame(draw);
  }

  function micConstraints() {
    return musicMode
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : true;
  }

  function updateMicModeBtn() {
    micModeBtn.textContent = musicMode ? "Mic mode: Music (Spotify)" : "Mic mode: Voice";
    micModeBtn.classList.toggle("active", musicMode);
    micModeBtn.setAttribute("aria-pressed", String(musicMode));
  }

  async function toggleMicMode() {
    musicMode = !musicMode;
    localStorage.setItem(MIC_MODE_KEY, musicMode ? "1" : "0");
    updateMicModeBtn();

    if (!stream) return; // not started yet — the new mode applies when startAudio() runs

    // Already running: re-request the mic with the new constraints and
    // swap the live stream in, instead of requiring a full restart.
    micModeBtn.disabled = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: micConstraints(),
        video: false
      });
      stream.getTracks().forEach((t) => t.stop());
      stream = newStream;
      source.disconnect();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (err) {
      flashStatus.classList.remove("hide");
      appendFlashStatus("Couldn't switch mic mode: " + (err && err.message ? err.message : err));
    } finally {
      micModeBtn.disabled = false;
    }
  }

  function togglePause() {
    if (!audioCtx) return;
    if (running) {
      running = false;
      cancelAnimationFrame(rafId);
      audioCtx.suspend();
      pauseBtn.textContent = "Resume";
    } else {
      running = true;
      audioCtx.resume();
      pauseBtn.textContent = "Pause";
      rafId = requestAnimationFrame(draw);
    }
  }

  function restart() {
    seedParticles();
    smoothedVolume = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#05050a";
    ctx.fillRect(0, 0, width, height);
  }

  // ---- Camera background ("party mode") ----
  // Shows the live camera feed behind the particles instead of a plain
  // dark background — independent of the mic/audio flow, and independent
  // of the separate camera stream requestFlashCapability() opens for the
  // torch (that one never touches a <video> element or gets drawn; this
  // one does).

  function drawCameraBackground() {
    if (!cameraFeed || cameraFeed.readyState < cameraFeed.HAVE_CURRENT_DATA) return;
    const vw = cameraFeed.videoWidth, vh = cameraFeed.videoHeight;
    if (!vw || !vh) return;

    if (colourVisionEnabled && correctionGl) {
      // Colour Vision Extreme's full correction (calibrated points + CVD
      // simulation + blend), rendered into an off-screen WebGL canvas from
      // the same cameraFeed, then blitted here — this <video> element only
      // ever has one raw feed, so the corrected version needs somewhere
      // else to be composited before it can be drawn as the background.
      renderCorrectionFrame(vw, vh);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(correctionCanvas, 0, 0, width, height);
      return;
    }

    // "object-fit: cover" crop, same technique as colorvision.js/restore.js
    // use for their own camera view, so the feed fills the screen without
    // stretching regardless of how its aspect ratio compares to the
    // screen's (routinely mismatched in landscape).
    let sx = 0, sy = 0, sw = vw, sh = vh;
    const videoAspect = vw / vh;
    const canvasAspect = width / height;
    if (videoAspect > canvasAspect) {
      sw = vh * canvasAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / canvasAspect;
      sy = (vh - sh) / 2;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(cameraFeed, sx, sy, sw, sh, 0, 0, width, height);
  }

  function cameraConstraints() {
    // A specific saved camera wins; otherwise fall back to "any
    // environment-facing camera", same as before device selection existed.
    return selectedCameraId
      ? { deviceId: { exact: selectedCameraId } }
      : { facingMode: { ideal: "environment" } };
  }

  function onCameraTrackEnded() {
    // Commonly fires when the screen locks or the tab loses focus,
    // which can end the camera connection outright.
    disableCameraBackground();
    appendFlashStatus("Camera background stopped — the camera connection ended.");
    flashStatus.classList.remove("hide");
  }

  async function refreshCameraDeviceList() {
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.enumerateDevices) return;
    let devices;
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (_) {
      return;
    }
    const cameras = devices.filter((d) => d.kind === "videoinput");
    // Labels are only populated once camera permission has been granted at
    // least once — before that every entry is blank, so there's nothing
    // useful to show yet.
    if (cameras.length < 2 || !cameras[0].label) {
      cameraSelectWrap.classList.add("hide");
      return;
    }
    cameraSelect.innerHTML = "";
    cameras.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${i + 1}`;
      cameraSelect.appendChild(opt);
    });
    if (!cameras.some((d) => d.deviceId === selectedCameraId)) {
      // Previously saved camera is gone (or nothing saved yet) — fall back
      // to whichever one actually started, so the dropdown reflects reality
      // instead of silently defaulting to the browser's first list entry.
      selectedCameraId = cameraStream ? cameraStream.getVideoTracks()[0].getSettings().deviceId || "" : "";
    }
    if (selectedCameraId) cameraSelect.value = selectedCameraId;
    cameraSelectWrap.classList.remove("hide");
  }

  async function enableCameraBackground() {
    cameraBgBtn.disabled = true;
    cameraBgBtn.textContent = "Camera background: Starting…";
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
        audio: false
      });
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
      cameraBackgroundEnabled = true;
      cameraBgBtn.textContent = "Camera background: On";
      cameraBgBtn.classList.add("active");
      cameraBgBtn.setAttribute("aria-pressed", "true");
      cameraStream.getVideoTracks()[0].addEventListener("ended", onCameraTrackEnded);
      refreshCameraDeviceList();
      cameraOnlyBtn.classList.remove("hide");
    } catch (err) {
      cameraBgBtn.textContent = "Camera background: Off";
      appendFlashStatus("Couldn't start the camera background: " + (err.message || err.name || "unknown error"));
      flashStatus.classList.remove("hide");
    } finally {
      cameraBgBtn.disabled = false;
    }
  }

  function disableCameraBackground() {
    cameraBackgroundEnabled = false;
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    cameraFeed.srcObject = null;
    cameraBgBtn.textContent = "Camera background: Off";
    cameraBgBtn.classList.remove("active");
    cameraBgBtn.setAttribute("aria-pressed", "false");
    cameraOnlyBtn.classList.add("hide");
    if (broadcastShare.cameraOnly) exitCameraOnlyMode();
  }

  async function switchCamera(deviceId) {
    selectedCameraId = deviceId;
    localStorage.setItem(CAMERA_DEVICE_KEY, selectedCameraId);
    if (!cameraBackgroundEnabled) return; // applies next time the camera starts

    cameraSelect.disabled = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
        audio: false
      });
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = newStream;
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
      cameraStream.getVideoTracks()[0].addEventListener("ended", onCameraTrackEnded);
    } catch (err) {
      appendFlashStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
      flashStatus.classList.remove("hide");
    } finally {
      cameraSelect.disabled = false;
    }
  }

  function toggleCameraBackground() {
    if (cameraBackgroundEnabled) {
      disableCameraBackground();
    } else {
      enableCameraBackground();
    }
  }

  function toggleNebula() {
    nebulaEnabled = !nebulaEnabled;
    nebulaBtn.textContent = nebulaEnabled ? "Nebula: On" : "Nebula: Off";
    // "Active" here means the particles are hidden — the non-default state
    // a user deliberately switched to, same as how other HUD toggles light
    // up when engaged.
    nebulaBtn.classList.toggle("active", !nebulaEnabled);
    nebulaBtn.setAttribute("aria-pressed", String(!nebulaEnabled));
    saveBoolPref(NEBULA_ENABLED_KEY, nebulaEnabled);
  }

  function updateOutlinesUi() {
    outlinesBtn.textContent = outlinesEnabled ? "Outlines mode: On" : "Outlines mode: Off";
    outlinesBtn.classList.toggle("active", outlinesEnabled);
    outlinesBtn.setAttribute("aria-pressed", String(outlinesEnabled));
    [outlineThicknessWrap, outlineBlendWrap, outlineOpacityWrap, outlineColorWrap].forEach((el) =>
      el.classList.toggle("hide", !outlinesEnabled)
    );
  }

  function toggleOutlinesMode() {
    outlinesEnabled = !outlinesEnabled;
    if (outlinesEnabled && cartoonEnabled) {
      cartoonEnabled = false;
      saveCartoonEnabledPref();
      updateCartoonUi();
    }
    saveOutlinesEnabledPref();
    updateOutlinesUi();
  }

  // Cartoon mode and Outlines mode both draw edge lines/strokes over the
  // same content, so they're mutually exclusive rather than stacked.
  function updateCartoonUi() {
    cartoonBtn.textContent = cartoonEnabled ? "Cartoon mode: On" : "Cartoon mode: Off";
    cartoonBtn.classList.toggle("active", cartoonEnabled);
    cartoonBtn.setAttribute("aria-pressed", String(cartoonEnabled));
    [cartoonLevelsWrap, cartoonEdgeThicknessWrap, cartoonEdgeStrengthWrap, cartoonSaturationWrap].forEach((el) =>
      el.classList.toggle("hide", !cartoonEnabled)
    );
  }

  function toggleCartoonMode() {
    cartoonEnabled = !cartoonEnabled;
    if (cartoonEnabled && outlinesEnabled) {
      outlinesEnabled = false;
      saveOutlinesEnabledPref();
      updateOutlinesUi();
    }
    saveCartoonEnabledPref();
    updateCartoonUi();
  }

  // ---- Colour Vision Extreme, live on the camera background ----
  // The full correction engine from colorvision.html/colorvision.js —
  // calibrated points, colour-blindness-type simulation, blend — applied
  // to the same camera background above instead of navigating away to a
  // separate page. Renders into its own off-screen WebGL canvas (see
  // renderCorrectionFrame / drawCameraBackground above) since cameraFeed
  // only ever holds the one raw feed.
  //
  // Deliberately its own storage key, separate from colorvision.html's
  // (colorvision.js's STORAGE_KEY) — they used to share one calibrated-
  // points list, which meant deleting a colour on one page silently wiped
  // it on the other too. Each page now keeps its own independent set.

  const MAX_POINTS = 32;
  const CV_STORAGE_KEY = "cvCalibrationPoints_soundNebula_v1";
  const CV_PROFILES_KEY = "cvProfiles_soundNebula_v1";
  const CV_ROTATE_KEY = "cvRotate180_v1";
  const CV_SPREAD_KEY = "cvSpread_v1";
  const CV_DEFAULT_SPREAD = 4;
  const CV_CVD_TYPE_KEY = "cvCvdType_v1";
  const CV_CVD_STRENGTH_KEY = "cvCvdStrength_v1";
  const CVD_TYPE_CODES = { none: 0, protan: 1, deutan: 2, tritan: 3 };

  // Colours commonly reported as confusable in red-green and blue-yellow CVD.
  // Starting points, not a diagnosis — the user still verifies each one
  // against their own vision.
  const CVD_PRESETS = [
    { label: "Traffic light red", hex: "#d1352b" },
    { label: "Traffic light green", hex: "#3a9b5c" },
    { label: "Ripe tomato red", hex: "#c82f1e" },
    { label: "Unripe leaf green", hex: "#5c8a3a" },
    { label: "Amber / brown", hex: "#a5661a" },
    { label: "Grey (low-sat)", hex: "#8a8a8a" },
    { label: "Purple", hex: "#7a4fb5" },
    { label: "Blue", hex: "#2f6fd1" },
    { label: "Orange", hex: "#e0792a" },
    { label: "Pink", hex: "#d1668f" }
  ];

  let colourVisionEnabled = false;
  let points = loadCvPoints();
  // Named snapshots of `points`, saved/loaded on demand so different sets
  // of calibrated colours can be switched between instantly instead of
  // manually exporting/importing a file each time (e.g. one template per
  // lighting condition). Independent of the live `points` array — loading
  // a template overwrites it, but editing/deleting points afterwards
  // doesn't touch the saved template until you explicitly save over it.
  let profiles = loadCvProfiles();
  let editingPointId = null;
  let frozenColor = null;
  let tuneReturnFocusEl = null;
  let choosePanelReturnFocusEl = null;
  let aiming = false;
  let aimIntervalId = null;
  // Where in the video frame calibration samples from — a fraction (0,0
  // top-left .. 1,1 bottom-right), defaulting to dead-center but movable
  // by tapping anywhere in the camera view while aiming (see
  // screenToVideoFraction/moveReticleTo below).
  let aimFracX = 0.5;
  let aimFracY = 0.5;
  let selectMode = false;
  let selectedIds = new Set();
  let rotate180 = loadRotatePref();
  let spread = loadSpreadPref();
  let cvdType = loadCvdTypePref();
  let cvdStrength = loadCvdStrengthPref();

  let colourVisionFlashEnabled = false;
  let cvFlashPointIndex = 0;

  // ---- Colour math (mirrors the shader's math for JS-side previews) ----

  function cvRgb2hsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
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

  function cvHsl2rgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return [r1 + m, g1 + m, b1 + m];
  }

  function cvSrgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function cvRgb2lab(r, g, b) {
    const rl = cvSrgbToLinear(r);
    const gl_ = cvSrgbToLinear(g);
    const bl = cvSrgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function cvApplyCorrection([r, g, b], hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust) {
    let [h, s, l] = cvRgb2hsl(r, g, b);
    h = (h + hueShift + 360) % 360;
    s = Math.min(1, Math.max(0, s + satAdjust));
    l = Math.min(1, Math.max(0, l + lightAdjust));
    let [r1, g1, b1] = cvHsl2rgb(h, s, l);
    const expMul = Math.pow(2, exposureAdjust || 0);
    const contMul = 1 + (contrastAdjust || 0);
    r1 = (r1 * expMul - 0.5) * contMul + 0.5;
    g1 = (g1 * expMul - 0.5) * contMul + 0.5;
    b1 = (b1 * expMul - 0.5) * contMul + 0.5;
    return [cvClamp01(r1), cvClamp01(g1), cvClamp01(b1)];
  }

  function cvClamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function cvRgbToCss([r, g, b]) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  function cvHexToRgb01(hex) {
    const m = hex.replace("#", "");
    const r = parseInt(m.substring(0, 2), 16) / 255;
    const g = parseInt(m.substring(2, 4), 16) / 255;
    const b = parseInt(m.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  // A colour swatch alone doesn't help the people this is for — the whole
  // point is that colour perception can't be trusted, so every swatch also
  // gets a plain-language name from a fixed palette of familiar terms.
  function cvNearestColorName([r, g, b]) {
    const [h, s, l] = cvRgb2hsl(r, g, b);
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

  // ---- Persistence (same keys as colorvision.html) ----

  function loadCvPoints() {
    try {
      const raw = localStorage.getItem(CV_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCvPoints() {
    try {
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(points));
    } catch (e) {
      cvStatus("Could not save (storage full or unavailable).");
    }
  }

  function loadCvProfiles() {
    try {
      const raw = localStorage.getItem(CV_PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCvProfiles() {
    try {
      localStorage.setItem(CV_PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      profileStatus.textContent = "Could not save template (storage full or unavailable).";
    }
  }

  function loadRotatePref() {
    try {
      return localStorage.getItem(CV_ROTATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveRotatePref() {
    try {
      localStorage.setItem(CV_ROTATE_KEY, rotate180 ? "1" : "0");
    } catch (e) {}
  }

  function loadSpreadPref() {
    try {
      const raw = parseFloat(localStorage.getItem(CV_SPREAD_KEY));
      return Number.isFinite(raw) ? raw : CV_DEFAULT_SPREAD;
    } catch (e) {
      return CV_DEFAULT_SPREAD;
    }
  }

  function saveSpreadPref() {
    try {
      localStorage.setItem(CV_SPREAD_KEY, String(spread));
    } catch (e) {}
  }

  function spreadDescription(value) {
    if (value <= 3) return "Tight";
    if (value <= 10) return "Medium";
    if (value <= 22) return "Wide";
    return "Very wide";
  }

  function loadCvdTypePref() {
    try {
      const raw = localStorage.getItem(CV_CVD_TYPE_KEY);
      return Object.prototype.hasOwnProperty.call(CVD_TYPE_CODES, raw) ? raw : "none";
    } catch (e) {
      return "none";
    }
  }

  function saveCvdTypePref() {
    try {
      localStorage.setItem(CV_CVD_TYPE_KEY, cvdType);
    } catch (e) {}
  }

  function loadCvdStrengthPref() {
    try {
      const raw = parseFloat(localStorage.getItem(CV_CVD_STRENGTH_KEY));
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
    } catch (e) {
      return 1;
    }
  }

  function saveCvdStrengthPref() {
    try {
      localStorage.setItem(CV_CVD_STRENGTH_KEY, String(cvdStrength));
    } catch (e) {}
  }

  function cvStatus(msg) {
    appendFlashStatus(msg);
    flashStatus.classList.remove("hide");
  }

  // ---- WebGL correction shader (identical to colorvision.js's) ----

  const CV_VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    uniform float uRotate180;
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      uv = uv * uUvScale + uUvOffset;
      vUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const CV_FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform float uOutlineEnabled;
    uniform float uOutlineThickness;
    uniform float uOutlineBlend;
    uniform float uOutlineOpacity;
    uniform vec3 uOutlineColor;
    uniform float uCartoonEnabled;
    uniform float uCartoonLevels;
    uniform float uCartoonEdgeThickness;
    uniform float uCartoonEdgeStrength;
    uniform float uCartoonSaturation;
    uniform vec2 uTexelSize;
    uniform float uSpread;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];   // hueShift(deg), satAdjust, lightAdjust
    uniform vec2 uCorrection2[${MAX_POINTS}];  // contrastAdjust, exposureAdjust
    uniform int uCvdType;      // 0=none, 1=protan, 2=deutan, 3=tritan
    uniform float uCvdStrength;

    float srgbToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
    }

    float linearToSrgb(float c) {
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    }

    vec3 daltonize(vec3 srgbColor, int type, float strength) {
      if (type == 0 || strength <= 0.0) return srgbColor;

      vec3 lin = vec3(srgbToLinear(srgbColor.r), srgbToLinear(srgbColor.g), srgbToLinear(srgbColor.b));
      mat3 sim;
      mat3 errMat;
      if (type == 1) {
        sim = mat3(0.152286, 0.114503, -0.003882,  1.052583, 0.786281, -0.048116,  -0.204868, 0.099216, 1.051998);
        errMat = mat3(0.0, 0.7, 0.7,  0.0, 1.0, 0.0,  0.0, 0.0, 1.0);
      } else if (type == 2) {
        sim = mat3(0.367322, 0.280085, -0.011820,  0.860646, 0.672501, 0.042940,  -0.227968, 0.047413, 0.968881);
        errMat = mat3(0.0, 0.7, 0.7,  0.0, 1.0, 0.0,  0.0, 0.0, 1.0);
      } else {
        sim = mat3(1.255528, -0.078411, 0.004733,  -0.076749, 0.930809, 0.691367,  -0.178779, 0.147602, 0.303900);
        errMat = mat3(1.0, 0.0, 0.0,  0.0, 1.0, 0.0,  0.7, 0.7, 0.0);
      }

      vec3 simulated = sim * lin;
      vec3 err = lin - simulated;
      vec3 correctedLin = clamp(lin + errMat * err, 0.0, 1.0);
      vec3 correctedSrgb = vec3(
        linearToSrgb(correctedLin.r), linearToSrgb(correctedLin.g), linearToSrgb(correctedLin.b)
      );
      return mix(srgbColor, correctedSrgb, strength);
    }

    vec3 rgb2lab(vec3 c) {
      float r = srgbToLinear(c.r);
      float g = srgbToLinear(c.g);
      float b = srgbToLinear(c.b);
      float X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
      float Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
      float Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
      float Xn = 0.95047; float Yn = 1.0; float Zn = 1.08883;
      float fx = X / Xn > 0.008856 ? pow(X / Xn, 1.0 / 3.0) : ((X / Xn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
      float fy = Y / Yn > 0.008856 ? pow(Y / Yn, 1.0 / 3.0) : ((Y / Yn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
      float fz = Z / Zn > 0.008856 ? pow(Z / Zn, 1.0 / 3.0) : ((Z / Zn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
      return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
    }

    vec3 rgb2hsl(vec3 c) {
      float mx = max(max(c.r, c.g), c.b);
      float mn = min(min(c.r, c.g), c.b);
      float h = 0.0; float s = 0.0; float l = (mx + mn) * 0.5;
      float d = mx - mn;
      if (d > 0.0001) {
        s = d / (1.0 - abs(2.0 * l - 1.0));
        if (mx == c.r) { h = mod((c.g - c.b) / d, 6.0); }
        else if (mx == c.g) { h = (c.b - c.r) / d + 2.0; }
        else { h = (c.r - c.g) / d + 4.0; }
        h *= 60.0;
        if (h < 0.0) h += 360.0;
      }
      return vec3(h, s, l);
    }

    vec3 hsl2rgb(vec3 hsl) {
      float h = hsl.x; float s = hsl.y; float l = hsl.z;
      float c = (1.0 - abs(2.0 * l - 1.0)) * s;
      float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
      float m = l - c * 0.5;
      vec3 rgb1;
      if (h < 60.0) { rgb1 = vec3(c, x, 0.0); }
      else if (h < 120.0) { rgb1 = vec3(x, c, 0.0); }
      else if (h < 180.0) { rgb1 = vec3(0.0, c, x); }
      else if (h < 240.0) { rgb1 = vec3(0.0, x, c); }
      else if (h < 300.0) { rgb1 = vec3(x, 0.0, c); }
      else { rgb1 = vec3(c, 0.0, x); }
      return rgb1 + m;
    }

    float cvLuminance(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    // Sobel edge detection on luminance, sampled from the raw camera
    // texture (not the corrected result) so outline strength reflects
    // real scene edges regardless of the current blend/CVD settings.
    // thickness scales the sample offsets — Outlines mode and Cartoon
    // mode each pass their own independent thickness value in.
    float cvEdgeStrength(vec2 uv, float thickness) {
      vec2 t = uTexelSize * max(thickness, 0.0001);
      float tl = cvLuminance(texture2D(uTex, uv + vec2(-t.x, -t.y)).rgb);
      float tc = cvLuminance(texture2D(uTex, uv + vec2(0.0, -t.y)).rgb);
      float tr = cvLuminance(texture2D(uTex, uv + vec2(t.x, -t.y)).rgb);
      float ml = cvLuminance(texture2D(uTex, uv + vec2(-t.x, 0.0)).rgb);
      float mr = cvLuminance(texture2D(uTex, uv + vec2(t.x, 0.0)).rgb);
      float bl = cvLuminance(texture2D(uTex, uv + vec2(-t.x, t.y)).rgb);
      float bc = cvLuminance(texture2D(uTex, uv + vec2(0.0, t.y)).rgb);
      float br = cvLuminance(texture2D(uTex, uv + vec2(t.x, t.y)).rgb);
      float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
      float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
      return clamp(length(vec2(gx, gy)), 0.0, 1.0);
    }

    // Flattens colour into a handful of bold, punchy bands — the "flat
    // cel-shaded" half of a cartoon look. saturation is a direct
    // multiplier on the original saturation (1.0 = unchanged, 3.0 =
    // strongly boosted). Bold ink edges are added separately in main().
    vec3 cvCartoonize(vec3 c, float levels, float saturation) {
      vec3 hsl = rgb2hsl(c);
      hsl.y = clamp(hsl.y * saturation + 0.05, 0.0, 1.0);
      vec3 boosted = hsl2rgb(hsl);
      float lv = max(levels, 2.0);
      return clamp(floor(boosted * lv) / (lv - 1.0), 0.0, 1.0);
    }

    // How strongly the cartoon ink line shows at a given edge strength.
    // strength is a 0..1 fraction: higher makes softer edges trigger a
    // line (lower threshold) and makes the line itself more opaque/dark.
    float cvCartoonLine(vec2 uv, float thickness, float strength) {
      float edge = cvEdgeStrength(uv, thickness);
      float lo = mix(0.30, 0.04, strength);
      float hi = lo + 0.18;
      float opacity = mix(0.35, 1.0, strength);
      return smoothstep(lo, hi, edge) * opacity;
    }

    void main() {
      vec3 original = texture2D(uTex, vUv).rgb;
      vec3 base = daltonize(original, uCvdType, uCvdStrength);
      vec3 correction = vec3(0.0);
      vec2 correction2 = vec2(0.0);

      if (uPointCount > 0) {
        vec3 labP = rgb2lab(original);
        float totalWeight = 0.0;
        vec3 weightedSum = vec3(0.0);
        vec2 weightedSum2 = vec2(0.0);
        for (int i = 0; i < ${MAX_POINTS}; i++) {
          if (i >= uPointCount) break;
          float d = distance(labP, uSourceLab[i]);
          float w = 1.0 / (d * d + uSpread);
          weightedSum += uCorrection[i] * w;
          weightedSum2 += uCorrection2[i] * w;
          totalWeight += w;
        }
        // A "null" anchor standing in for "no correction", weighted as if
        // a point were a fixed reference distance away. Without this, a
        // single saved colour's correction always normalizes to full
        // strength everywhere in the frame — the distance-based weight
        // cancels out of the ratio once there's nothing else to weigh it
        // against — so even wildly different colours would get the full
        // shift instead of it fading out. ~50 Lab units is a clearly
        // "very different colour" reference distance.
        totalWeight += 1.0 / (2500.0 + uSpread);
        correction = weightedSum / totalWeight;
        correction2 = weightedSum2 / totalWeight;
      }

      vec3 hsl = rgb2hsl(base);
      hsl.x = mod(hsl.x + correction.x + 360.0, 360.0);
      hsl.y = clamp(hsl.y + correction.y, 0.0, 1.0);
      hsl.z = clamp(hsl.z + correction.z, 0.0, 1.0);
      vec3 corrected = hsl2rgb(hsl);

      float contMul = 1.0 + correction2.x;
      float expMul = pow(2.0, correction2.y);
      corrected = clamp((corrected * expMul - 0.5) * contMul + 0.5, 0.0, 1.0);

      vec3 filled = mix(original, corrected, uBlend);
      vec3 finalColor = filled;
      if (uCartoonEnabled > 0.5) {
        vec3 toon = cvCartoonize(filled, uCartoonLevels, uCartoonSaturation);
        float line = cvCartoonLine(vUv, uCartoonEdgeThickness, uCartoonEdgeStrength);
        finalColor = mix(toon, vec3(0.02), line);
      } else if (uOutlineEnabled > 0.5) {
        float edge = cvEdgeStrength(vUv, uOutlineThickness) * uOutlineOpacity;
        vec3 outlineColor = uOutlineColor * edge;
        finalColor = mix(filled, outlineColor, uOutlineBlend);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function cvCompileShader(glCtx, type, src) {
    const sh = glCtx.createShader(type);
    glCtx.shaderSource(sh, src);
    glCtx.compileShader(sh);
    if (!glCtx.getShaderParameter(sh, glCtx.COMPILE_STATUS)) {
      const log = glCtx.getShaderInfoLog(sh);
      glCtx.deleteShader(sh);
      throw new Error("Shader compile error: " + log);
    }
    return sh;
  }

  function ensureCorrectionCanvas() {
    if (correctionCanvas) return;
    correctionCanvas = document.createElement("canvas");
    correctionCanvas.width = canvas.width;
    correctionCanvas.height = canvas.height;
    correctionCanvas.style.position = "fixed";
    correctionCanvas.style.left = "-99999px";
    correctionCanvas.style.top = "0";
    document.body.appendChild(correctionCanvas);

    const glCtx = correctionCanvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) ||
      correctionCanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!glCtx) {
      cvStatus("Colour vision correction isn't supported in this browser.");
      return;
    }

    const vs = cvCompileShader(glCtx, glCtx.VERTEX_SHADER, CV_VERT_SRC);
    const fs = cvCompileShader(glCtx, glCtx.FRAGMENT_SHADER, CV_FRAG_SRC);
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
      cvStatus("Colour vision correction failed to start: " + glCtx.getProgramInfoLog(prog));
      return;
    }
    glCtx.useProgram(prog);

    const qBuf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, qBuf);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), glCtx.STATIC_DRAW);
    const aPos = glCtx.getAttribLocation(prog, "aPos");
    glCtx.enableVertexAttribArray(aPos);
    glCtx.vertexAttribPointer(aPos, 2, glCtx.FLOAT, false, 0, 0);

    const tex = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);

    correctionGl = glCtx;
    correctionProgram = prog;
    correctionQuadBuffer = qBuf;
    correctionVideoTexture = tex;
    correctionUniforms = {
      uTex: glCtx.getUniformLocation(prog, "uTex"),
      uBlend: glCtx.getUniformLocation(prog, "uBlend"),
      uOutlineEnabled: glCtx.getUniformLocation(prog, "uOutlineEnabled"),
      uOutlineThickness: glCtx.getUniformLocation(prog, "uOutlineThickness"),
      uOutlineBlend: glCtx.getUniformLocation(prog, "uOutlineBlend"),
      uOutlineOpacity: glCtx.getUniformLocation(prog, "uOutlineOpacity"),
      uOutlineColor: glCtx.getUniformLocation(prog, "uOutlineColor"),
      uCartoonEnabled: glCtx.getUniformLocation(prog, "uCartoonEnabled"),
      uCartoonLevels: glCtx.getUniformLocation(prog, "uCartoonLevels"),
      uCartoonEdgeThickness: glCtx.getUniformLocation(prog, "uCartoonEdgeThickness"),
      uCartoonEdgeStrength: glCtx.getUniformLocation(prog, "uCartoonEdgeStrength"),
      uCartoonSaturation: glCtx.getUniformLocation(prog, "uCartoonSaturation"),
      uTexelSize: glCtx.getUniformLocation(prog, "uTexelSize"),
      uSpread: glCtx.getUniformLocation(prog, "uSpread"),
      uRotate180: glCtx.getUniformLocation(prog, "uRotate180"),
      uUvScale: glCtx.getUniformLocation(prog, "uUvScale"),
      uUvOffset: glCtx.getUniformLocation(prog, "uUvOffset"),
      uPointCount: glCtx.getUniformLocation(prog, "uPointCount"),
      uSourceLab: glCtx.getUniformLocation(prog, "uSourceLab"),
      uCorrection: glCtx.getUniformLocation(prog, "uCorrection"),
      uCorrection2: glCtx.getUniformLocation(prog, "uCorrection2"),
      uCvdType: glCtx.getUniformLocation(prog, "uCvdType"),
      uCvdStrength: glCtx.getUniformLocation(prog, "uCvdStrength")
    };
    uploadPointUniforms();
  }

  function resizeCorrectionCanvas() {
    if (!correctionCanvas) return;
    correctionCanvas.width = canvas.width;
    correctionCanvas.height = canvas.height;
    correctionGl.viewport(0, 0, correctionCanvas.width, correctionCanvas.height);
  }

  function uploadPointUniforms() {
    if (!correctionGl) return;
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = cvRgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
      corr2Arr[i * 2] = p.contrastAdjust || 0; corr2Arr[i * 2 + 1] = p.exposureAdjust || 0;
    }
    correctionGl.useProgram(correctionProgram);
    correctionGl.uniform1i(correctionUniforms.uPointCount, count);
    correctionGl.uniform3fv(correctionUniforms.uSourceLab, labArr);
    correctionGl.uniform3fv(correctionUniforms.uCorrection, corrArr);
    correctionGl.uniform2fv(correctionUniforms.uCorrection2, corr2Arr);
  }

  // "object-fit: cover" — same technique as colorvision.js/restore.js use
  // for their own camera view, so the feed fills the canvas without
  // stretching regardless of how its aspect ratio compares to the
  // canvas's (routinely mismatched in landscape).
  function computeCoverUv(videoW, videoH, canvasW, canvasH) {
    if (!videoW || !videoH || !canvasW || !canvasH) return { sx: 1, sy: 1, ox: 0, oy: 0 };
    const videoAspect = videoW / videoH;
    const canvasAspect = canvasW / canvasH;
    if (videoAspect > canvasAspect) {
      const sx = canvasAspect / videoAspect;
      return { sx, sy: 1, ox: (1 - sx) / 2, oy: 0 };
    }
    const sy = videoAspect / canvasAspect;
    return { sx: 1, sy, ox: 0, oy: (1 - sy) / 2 };
  }

  function renderCorrectionFrame(vw, vh) {
    const cover = computeCoverUv(vw, vh, correctionCanvas.width, correctionCanvas.height);
    correctionGl.bindTexture(correctionGl.TEXTURE_2D, correctionVideoTexture);
    correctionGl.texImage2D(correctionGl.TEXTURE_2D, 0, correctionGl.RGBA, correctionGl.RGBA, correctionGl.UNSIGNED_BYTE, cameraFeed);
    correctionGl.uniform1i(correctionUniforms.uTex, 0);
    correctionGl.uniform1f(correctionUniforms.uBlend, parseFloat(blendSlider.value) / 100);
    correctionGl.uniform1f(correctionUniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
    correctionGl.uniform1f(correctionUniforms.uOutlineThickness, outlineThickness);
    correctionGl.uniform1f(correctionUniforms.uOutlineBlend, outlineBlend);
    correctionGl.uniform1f(correctionUniforms.uOutlineOpacity, outlineOpacity);
    correctionGl.uniform3f(correctionUniforms.uOutlineColor, outlineColorRgb[0], outlineColorRgb[1], outlineColorRgb[2]);
    correctionGl.uniform1f(correctionUniforms.uCartoonEnabled, cartoonEnabled ? 1 : 0);
    correctionGl.uniform1f(correctionUniforms.uCartoonLevels, cartoonLevels);
    correctionGl.uniform1f(correctionUniforms.uCartoonEdgeThickness, cartoonEdgeThickness);
    correctionGl.uniform1f(correctionUniforms.uCartoonEdgeStrength, cartoonEdgeStrength);
    correctionGl.uniform1f(correctionUniforms.uCartoonSaturation, cartoonSaturation);
    // Texel size in the camera's own native resolution (not the output
    // canvas's) — vUv samples uTex in cropped-video space, so the edge
    // kernel needs to step in video texels for a consistent line width
    // regardless of how the canvas is sized/scaled on screen.
    correctionGl.uniform2f(correctionUniforms.uTexelSize, 1 / vw, 1 / vh);
    correctionGl.uniform1f(correctionUniforms.uSpread, spread);
    correctionGl.uniform1f(correctionUniforms.uRotate180, rotate180 ? 1 : 0);
    correctionGl.uniform2f(correctionUniforms.uUvScale, cover.sx, cover.sy);
    correctionGl.uniform2f(correctionUniforms.uUvOffset, cover.ox, cover.oy);
    correctionGl.uniform1i(correctionUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
    correctionGl.uniform1f(correctionUniforms.uCvdStrength, cvdStrength);
    correctionGl.drawArrays(correctionGl.TRIANGLE_STRIP, 0, 4);
  }

  async function enableColourVision() {
    if (!cameraBackgroundEnabled) {
      await enableCameraBackground();
      if (!cameraBackgroundEnabled) return; // camera failed to start
    }
    ensureCorrectionCanvas();
    if (!correctionGl) return;
    colourVisionEnabled = true;
    colourVisionBtn.textContent = "Colour vision: On";
    colourVisionBtn.classList.add("active");
    colourVisionBtn.setAttribute("aria-pressed", "true");
    [blendWrap, cvdTypeWrap, spreadWrap, calibrateBtn, pointsBtn, rotateBtn].forEach((el) => el.classList.remove("hide"));
    cvdStrengthWrap.classList.toggle("hide", cvdType === "none");
    updateFloatingCalibrateBtnVisibility();
  }

  function disableColourVision() {
    if (colourVisionFlashEnabled) disableColourVisionFlash();
    colourVisionEnabled = false;
    colourVisionBtn.textContent = "Colour vision: Off";
    colourVisionBtn.classList.remove("active");
    colourVisionBtn.setAttribute("aria-pressed", "false");
    [blendWrap, cvdTypeWrap, cvdStrengthWrap, spreadWrap, calibrateBtn, pointsBtn, rotateBtn].forEach((el) => el.classList.add("hide"));
    hideCvOverlayPanels();
    updateFloatingCalibrateBtnVisibility();
  }

  function toggleColourVision() {
    if (colourVisionEnabled) disableColourVision();
    else enableColourVision();
  }

  // ---- Colour vision flash mode ----
  // On each beat, alternates the camera background (and the beat screen
  // flash) between the true camera view and one saved calibration point's
  // correction shown in isolation — a different point each time a
  // correction beat comes around — so consecutive corrected beats are
  // never the same point twice in a row and every point gets its own
  // dedicated true-colour beat as a break in between.

  // Re-uploads the correction shader's point uniforms restricted to a
  // single point (uPointCount=1) instead of the full calibrated set, so
  // its correction applies uniformly across the frame with no blending
  // against any other point — isolating exactly what that one point does.
  function uploadSinglePointUniforms(point) {
    if (!correctionGl) return;
    const [L, A, B] = cvRgb2lab(point.sourceColor[0], point.sourceColor[1], point.sourceColor[2]);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    labArr[0] = L; labArr[1] = A; labArr[2] = B;
    corrArr[0] = point.hueShift; corrArr[1] = point.satAdjust; corrArr[2] = point.lightAdjust;
    corr2Arr[0] = point.contrastAdjust || 0; corr2Arr[1] = point.exposureAdjust || 0;
    correctionGl.useProgram(correctionProgram);
    correctionGl.uniform1i(correctionUniforms.uPointCount, 1);
    correctionGl.uniform3fv(correctionUniforms.uSourceLab, labArr);
    correctionGl.uniform3fv(correctionUniforms.uCorrection, corrArr);
    correctionGl.uniform2fv(correctionUniforms.uCorrection2, corr2Arr);
  }

  async function enableColourVisionFlash() {
    if (!colourVisionEnabled) {
      await enableColourVision();
      if (!colourVisionEnabled) return; // colour vision failed to start
    }
    if (points.length === 0) {
      cvStatus("Calibrate at least one colour point first — flash mode alternates between them.");
      return;
    }
    colourVisionFlashEnabled = true;
    cvFlashPointIndex = 0;
    uploadSinglePointUniforms(points[cvFlashPointIndex]);
    // Show the corrected view immediately, not whichever value the blend
    // slider was left at (e.g. 0/true from a previous disableColourVisionFlash)
    // — otherwise the live camera stays on the true/raw view until the
    // first beat flips it.
    blendSlider.value = "100";
    blendLabel.textContent = "100%";
    // Locked while flash mode is on so it can't be manually dragged back to
    // a true/uncorrected view — flash mode's whole point is never showing it.
    blendSlider.disabled = true;
    colourVisionFlashBtn.textContent = "Colour vision flash mode: On";
    colourVisionFlashBtn.classList.add("active");
    colourVisionFlashBtn.setAttribute("aria-pressed", "true");
  }

  function disableColourVisionFlash() {
    colourVisionFlashEnabled = false;
    colourVisionFlashBtn.textContent = "Colour vision flash mode: Off";
    colourVisionFlashBtn.classList.remove("active");
    colourVisionFlashBtn.setAttribute("aria-pressed", "false");
    blendSlider.disabled = false;
    blendSlider.value = "0";
    blendLabel.textContent = "0%";
    // Restore the normal calibrated view — every saved point blended
    // together by Lab distance — instead of leaving the shader pinned to
    // whichever single point flash mode last isolated.
    uploadPointUniforms();
  }

  function toggleColourVisionFlash() {
    if (colourVisionFlashEnabled) disableColourVisionFlash();
    else enableColourVisionFlash();
  }

  function fireColourVisionFlash(strength) {
    if (!colourVisionFlashEnabled || !correctionGl || points.length === 0) return;

    // Advance to the next saved point on every beat so consecutive beats
    // never repeat the same one — always shown corrected/isolated, never
    // alternating back to the true/raw camera view.
    cvFlashPointIndex = (cvFlashPointIndex + 1) % points.length;
    uploadSinglePointUniforms(points[cvFlashPointIndex]);

    blendSlider.value = "100";
    blendLabel.textContent = "100%";
  }

  // Runs a single RGB colour through the same correction/CVD shader used
  // for the live camera feed, via a 1x1 texture — this avoids
  // reimplementing the daltonize matrix math a second time in JS, where a
  // transcription slip would silently produce wrong colours.
  function correctColorViaShader([r, g, b], blendOverride) {
    if (!correctionGl) return null;
    const glCtx = correctionGl;
    glCtx.useProgram(correctionProgram);
    glCtx.bindTexture(glCtx.TEXTURE_2D, correctionVideoTexture);
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, false);
    const px = new Uint8Array([
      Math.round(cvClamp01(r) * 255),
      Math.round(cvClamp01(g) * 255),
      Math.round(cvClamp01(b) * 255),
      255
    ]);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, 1, 1, 0, glCtx.RGBA, glCtx.UNSIGNED_BYTE, px);
    glCtx.uniform1i(correctionUniforms.uTex, 0);
    glCtx.uniform1f(correctionUniforms.uBlend, blendOverride);
    // Always off here — this draws a single solid-colour swatch, not the
    // live camera frame, so edge detection/posterizing across it would be
    // meaningless.
    glCtx.uniform1f(correctionUniforms.uOutlineEnabled, 0);
    glCtx.uniform1f(correctionUniforms.uCartoonEnabled, 0);
    glCtx.uniform1f(correctionUniforms.uSpread, spread);
    glCtx.uniform1f(correctionUniforms.uRotate180, 0);
    glCtx.uniform2f(correctionUniforms.uUvScale, 1, 1);
    glCtx.uniform2f(correctionUniforms.uUvOffset, 0, 0);
    glCtx.uniform1i(correctionUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
    glCtx.uniform1f(correctionUniforms.uCvdStrength, cvdStrength);
    glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);

    const out = new Uint8Array(4);
    glCtx.readPixels(0, 0, 1, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, out);
    // Reset for renderCorrectionFrame(), which relies on flipped Y for
    // the real camera texture.
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    return [out[0] / 255, out[1] / 255, out[2] / 255];
  }

  // ---- Sampling for calibration ----
  // Averages a small patch from the raw video frame (not the shader's
  // corrected output) so calibration is always anchored to the real colour.

  const SAMPLE_SIZE = 12;

  function sampleCenterColor() {
    if (cameraFeed.readyState < cameraFeed.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    sampleCanvas.width = 64;
    sampleCanvas.height = 64;
    const vw = cameraFeed.videoWidth, vh = cameraFeed.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.15;
    const sx = Math.min(Math.max(vw * aimFracX - cropSize / 2, 0), vw - cropSize);
    const sy = Math.min(Math.max(vh * aimFracY - cropSize / 2, 0), vh - cropSize);
    sampleCtx.drawImage(cameraFeed, sx, sy, cropSize, cropSize, 0, 0, 64, 64);
    const data = sampleCtx.getImageData(24, 24, SAMPLE_SIZE, SAMPLE_SIZE).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  // Converts a tap position (viewport CSS pixels) into a fraction of the
  // raw camera frame (0,0 top-left .. 1,1 bottom-right) — the same
  // object-fit:cover cropping and rotate180 flip the correction shader
  // applies, run in reverse, so tapping a point on screen samples that
  // same point in the actual camera image rather than wherever it lands
  // in the video's native (possibly cropped/rotated) frame.
  function screenToVideoFraction(clientX, clientY) {
    const canvasUvX = clientX / window.innerWidth;
    const canvasUvY = 1 - clientY / window.innerHeight;
    const cover = computeCoverUv(cameraFeed.videoWidth, cameraFeed.videoHeight, window.innerWidth, window.innerHeight);
    let vx = canvasUvX * cover.sx + cover.ox;
    let vy = canvasUvY * cover.sy + cover.oy;
    if (rotate180) { vx = 1 - vx; vy = 1 - vy; }
    return { x: cvClamp01(vx), y: cvClamp01(1 - vy) };
  }

  function moveReticleTo(clientX, clientY) {
    const frac = screenToVideoFraction(clientX, clientY);
    aimFracX = frac.x;
    aimFracY = frac.y;
    reticle.style.left = `${clientX}px`;
    reticle.style.top = `${clientY}px`;
  }

  function startAiming() {
    aiming = true;
    aimFracX = 0.5;
    aimFracY = 0.5;
    reticle.style.left = "";
    reticle.style.top = "";
    reticleLayer.classList.remove("hide");
    aimIntervalId = setInterval(() => {
      const c = sampleCenterColor();
      reticleSwatch.style.background = cvRgbToCss(c);
      reticleColorName.textContent = cvNearestColorName(c);
    }, 120);
    cancelAimBtn.focus();
  }

  function stopAiming() {
    aiming = false;
    reticleLayer.classList.add("hide");
    if (aimIntervalId) { clearInterval(aimIntervalId); aimIntervalId = null; }
    calibrateBtn.focus();
  }

  // ---- Photo & video capture ----
  // Captures the fully-composited stage canvas — particles, and the
  // corrected camera background if it's on — exactly what's currently on
  // screen, not a re-render. Available any time the visualiser is
  // running, regardless of whether the camera background is on.

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // Programmatic a.click() still dispatches a real, bubbling click event.
    // Without this it reaches the tap-to-hide-HUD listener on document.body
    // (the anchor is outside every excluded container) and silently closes
    // the HUD right after every photo or video download.
    a.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function timestampForFilename() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  function takePhoto() {
    if (!stream) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        appendFlashStatus("Couldn't capture a photo — try again.");
        flashStatus.classList.remove("hide");
        return;
      }
      downloadBlob(blob, `sound-nebula-photo-${timestampForFilename()}.png`);
    }, "image/png");
  }

  function pickRecordingMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    return candidates.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  }

  function updateRecordingLabel() {
    const secs = Math.floor((Date.now() - recordingStartedAt) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    recordBtn.textContent = `⏹ ${mm}:${ss}`;
    floatingRecordBtn.textContent = `⏹ ${mm}:${ss}`;
    recordingIndicatorTime.textContent = `${mm}:${ss}`;
  }

  function startRecording() {
    if (isRecording || !stream || typeof canvas.captureStream !== "function") return;
    recordingMimeType = pickRecordingMimeType();
    if (!recordingMimeType) {
      appendFlashStatus("Video recording isn't supported in this browser.");
      flashStatus.classList.remove("hide");
      return;
    }
    let canvasStream;
    try {
      canvasStream = canvas.captureStream(recordFps);
    } catch (err) {
      appendFlashStatus("Couldn't start recording: " + (err.message || err.name || "unknown error"));
      flashStatus.classList.remove("hide");
      return;
    }
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: recordingMimeType });
    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      const ext = recordingMimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(recordedChunks, { type: recordingMimeType });
      recordedChunks = [];
      if (blob.size > 0) {
        downloadBlob(blob, `sound-nebula-video-${timestampForFilename()}.${ext}`);
      } else {
        appendFlashStatus("Recording produced no data — try again.");
        flashStatus.classList.remove("hide");
      }
    });
    mediaRecorder.start();
    isRecording = true;
    recordingStartedAt = Date.now();
    recordBtn.classList.add("recording");
    recordBtn.setAttribute("aria-pressed", "true");
    floatingRecordBtn.classList.add("recording");
    floatingRecordBtn.setAttribute("aria-pressed", "true");
    recordingIndicator.classList.remove("hide");
    // Framerate is baked into the captureStream() call above — changing
    // the dropdown mid-recording wouldn't affect the file already being
    // written, so lock it to avoid the false impression that it would.
    recordFpsSelect.disabled = true;
    updateRecordingLabel();
    recordingTimerId = setInterval(updateRecordingLabel, 500);
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.classList.remove("recording");
    recordBtn.setAttribute("aria-pressed", "false");
    recordBtn.textContent = "⏺ Record";
    floatingRecordBtn.classList.remove("recording");
    floatingRecordBtn.setAttribute("aria-pressed", "false");
    floatingRecordBtn.textContent = "⏺ Record";
    recordingIndicator.classList.add("hide");
    recordFpsSelect.disabled = false;
    if (recordingTimerId) { clearInterval(recordingTimerId); recordingTimerId = null; }
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  // ---- Hardware volume-button shutter ----
  // Volume-down fires whichever mode is currently selected (photo shutter,
  // or start/stop video); volume-up switches which mode that is, so both
  // photo and video stay reachable from the hardware buttons alone.
  function fireShutter() {
    if (shutterMode === "video") toggleRecording();
    else takePhoto();
  }

  function saveShutterModePref() {
    try { localStorage.setItem(SHUTTER_MODE_KEY, shutterMode); } catch (e) {}
  }

  function toggleShutterMode() {
    shutterMode = shutterMode === "video" ? "photo" : "video";
    saveShutterModePref();
    appendFlashStatus(`Volume shutter: ${shutterMode === "video" ? "Video" : "Photo"} mode`);
    flashStatus.classList.remove("hide");
    if (shutterModeStatusTimer) clearTimeout(shutterModeStatusTimer);
    shutterModeStatusTimer = setTimeout(() => {
      flashStatus.classList.add("hide");
    }, 1600);
  }

  // ---- Floating capture bar ----
  // Photo/Record/Calibrate live inside #hud, which the tap-to-hide gesture
  // can dismiss entirely — this small floating trio stays reachable in
  // that "no HUD" state. Photo/Record work any time a session has been
  // started (even paused — the canvas still holds its last frame);
  // Calibrate only makes sense once the camera background and colour
  // vision correction are actually on (same gate as the HUD's own
  // Calibrate button), so it's shown/hidden independently within the bar.
  // Draggable: long-press, then move, then release repositions it.

  function loadFloatingCapturePos() {
    try {
      const raw = JSON.parse(localStorage.getItem(FLOATING_CAPTURE_POS_KEY));
      if (raw && Number.isFinite(raw.left) && Number.isFinite(raw.top)) return raw;
    } catch (e) {}
    return null;
  }

  function saveFloatingCapturePos(pos) {
    try { localStorage.setItem(FLOATING_CAPTURE_POS_KEY, JSON.stringify(pos)); } catch (e) {}
  }

  function clampFloatingCapturePos(left, top) {
    const maxLeft = Math.max(4, window.innerWidth - floatingCaptureBar.offsetWidth - 4);
    const maxTop = Math.max(4, window.innerHeight - floatingCaptureBar.offsetHeight - 4);
    return { left: Math.min(Math.max(4, left), maxLeft), top: Math.min(Math.max(4, top), maxTop) };
  }

  function applyFloatingCapturePos() {
    const pos = loadFloatingCapturePos();
    if (!pos) return;
    const clamped = clampFloatingCapturePos(pos.left, pos.top);
    floatingCaptureBar.style.left = `${clamped.left}px`;
    floatingCaptureBar.style.top = `${clamped.top}px`;
    floatingCaptureBar.style.right = "auto";
    floatingCaptureBar.style.bottom = "auto";
  }

  function updateFloatingCalibrateBtnVisibility() {
    floatingCalibrateBtn.classList.toggle("hide", calibrateBtn.classList.contains("hide"));
  }

  function updateFloatingCaptureBarVisibility() {
    const visible = !!stream && hud.classList.contains("hide") && cameraOnlyBadge.classList.contains("hide");
    floatingCaptureBar.classList.toggle("hide", !visible);
    updateFloatingCalibrateBtnVisibility();
  }

  // Long-press-then-drag, distinguished from a plain tap: a timer starts
  // on pointerdown, and only once it fires does the bar start actually
  // following the pointer — a quick tap never crosses that threshold, so
  // it reaches the pressed button's own click handler normally. Moving
  // far enough before the timer fires cancels it outright (treated as an
  // accidental/scrolling touch, not a drag).
  function setupDraggableCaptureBar() {
    let pressTimer = null;
    let dragging = false;
    let moved = false;
    let suppressClick = false;
    let startX = 0, startY = 0, barStartLeft = 0, barStartTop = 0;

    function beginDrag() {
      dragging = true;
      moved = false;
      floatingCaptureBar.classList.add("dragging");
      const rect = floatingCaptureBar.getBoundingClientRect();
      barStartLeft = rect.left;
      barStartTop = rect.top;
    }

    function endPress() {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      if (dragging) {
        floatingCaptureBar.classList.remove("dragging");
        if (moved) {
          const clamped = clampFloatingCapturePos(
            parseFloat(floatingCaptureBar.style.left) || barStartLeft,
            parseFloat(floatingCaptureBar.style.top) || barStartTop
          );
          saveFloatingCapturePos(clamped);
          suppressClick = true;
        }
        dragging = false;
      }
    }

    floatingCaptureBar.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
      startX = e.clientX;
      startY = e.clientY;
      const rect = floatingCaptureBar.getBoundingClientRect();
      barStartLeft = rect.left;
      barStartTop = rect.top;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        beginDrag();
        try { floatingCaptureBar.setPointerCapture(e.pointerId); } catch (err) {}
      }, LONG_PRESS_MS);
    });

    floatingCaptureBar.addEventListener("pointermove", (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (pressTimer && Math.hypot(dx, dy) > DRAG_CANCEL_PX) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        return;
      }
      moved = true;
      e.preventDefault();
      const clamped = clampFloatingCapturePos(barStartLeft + dx, barStartTop + dy);
      floatingCaptureBar.style.left = `${clamped.left}px`;
      floatingCaptureBar.style.top = `${clamped.top}px`;
      floatingCaptureBar.style.right = "auto";
      floatingCaptureBar.style.bottom = "auto";
    });

    floatingCaptureBar.addEventListener("pointerup", endPress);
    floatingCaptureBar.addEventListener("pointercancel", endPress);

    // Capture phase, so a drag-ending click gets swallowed before it
    // reaches the pressed button's own listener underneath.
    floatingCaptureBar.addEventListener("click", (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    }, true);

    window.addEventListener("resize", () => {
      if (!floatingCaptureBar.style.left) return;
      const clamped = clampFloatingCapturePos(
        parseFloat(floatingCaptureBar.style.left),
        parseFloat(floatingCaptureBar.style.top)
      );
      floatingCaptureBar.style.left = `${clamped.left}px`;
      floatingCaptureBar.style.top = `${clamped.top}px`;
    });
  }

  // ---- Tune / choose / saved-colours panels ----
  // Share a z-index with the tablet-viewer panel and each other, so only
  // one is ever open at a time.

  function hideCvOverlayPanels() {
    tunePanel.classList.add("hide");
    pointsPanel.classList.add("hide");
    choosePanel.classList.add("hide");
    viewerPanel.classList.add("hide");
  }

  function openTuneForNewPoint(sourceColor) {
    hideCvOverlayPanels();
    editingPointId = null;
    frozenColor = sourceColor;
    hueSlider.value = 0; satSlider.value = 0; lightSlider.value = 0;
    contrastSlider.value = 0; exposureSlider.value = 0;
    labelInput.value = "";
    deletePointBtn.classList.add("hide");
    refreshTunePreview();
    tuneReturnFocusEl = calibrateBtn;
    tunePanel.classList.remove("hide");
    hueSlider.focus();
  }

  function openTuneForExistingPoint(point) {
    hideCvOverlayPanels();
    editingPointId = point.id;
    frozenColor = point.sourceColor;
    hueSlider.value = point.hueShift;
    satSlider.value = Math.round(point.satAdjust * 100);
    lightSlider.value = Math.round(point.lightAdjust * 100);
    contrastSlider.value = Math.round((point.contrastAdjust || 0) * 100);
    exposureSlider.value = Math.round((point.exposureAdjust || 0) * 100);
    labelInput.value = point.label || "";
    deletePointBtn.classList.remove("hide");
    refreshTunePreview();
    tuneReturnFocusEl = pointsBtn;
    tunePanel.classList.remove("hide");
    hueSlider.focus();
  }

  function currentTuneValues() {
    return {
      hueShift: parseFloat(hueSlider.value),
      satAdjust: parseFloat(satSlider.value) / 100,
      lightAdjust: parseFloat(lightSlider.value) / 100,
      contrastAdjust: parseFloat(contrastSlider.value) / 100,
      exposureAdjust: parseFloat(exposureSlider.value) / 100
    };
  }

  function refreshTunePreview() {
    if (!frozenColor) return;
    const { hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust } = currentTuneValues();
    const corrected = cvApplyCorrection(frozenColor, hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust);
    swatchOriginal.style.background = cvRgbToCss(frozenColor);
    swatchCorrected.style.background = cvRgbToCss(corrected);
    swatchOriginalName.textContent = cvNearestColorName(frozenColor);
    swatchCorrectedName.textContent = cvNearestColorName(corrected);
    hueLabel.textContent = `${hueShift}°`;
    satLabel.textContent = `${satSlider.value}%`;
    lightLabel.textContent = `${lightSlider.value}%`;
    contrastLabel.textContent = `${contrastSlider.value}%`;
    exposureLabel.textContent = `${exposureSlider.value}%`;
  }

  function closeTunePanel() {
    tunePanel.classList.add("hide");
    frozenColor = null;
    editingPointId = null;
    if (tuneReturnFocusEl) tuneReturnFocusEl.focus();
    tuneReturnFocusEl = null;
  }

  function saveCvPoint() {
    const { hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust } = currentTuneValues();
    if (editingPointId) {
      const p = points.find((pt) => pt.id === editingPointId);
      if (p) {
        p.sourceColor = frozenColor;
        p.hueShift = hueShift;
        p.satAdjust = satAdjust;
        p.lightAdjust = lightAdjust;
        p.contrastAdjust = contrastAdjust;
        p.exposureAdjust = exposureAdjust;
        p.label = labelInput.value.trim();
      }
    } else {
      if (points.length >= MAX_POINTS) {
        cvStatus(`Limit of ${MAX_POINTS} saved colours reached — delete one to add another.`);
        return;
      }
      points.push({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: labelInput.value.trim(),
        sourceColor: frozenColor,
        hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust
      });
    }
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function deleteCurrentCvPoint() {
    if (!editingPointId) return;
    points = points.filter((p) => p.id !== editingPointId);
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function updatePointsCount() {
    pointsCount.textContent = String(points.length);
  }

  function renderPointsGrid() {
    pointsGrid.innerHTML = "";
    if (points.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No colours saved yet. Use \"Calibrate a colour\" to add your first one.";
      pointsGrid.appendChild(empty);
      return;
    }
    points.forEach((p) => {
      const colorName = cvNearestColorName(p.sourceColor);
      const selected = selectedIds.has(p.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "point-card" + (selectMode ? " selectable" : "") + (selected ? " selected" : "");
      if (selectMode) {
        card.setAttribute("aria-pressed", String(selected));
        card.setAttribute("aria-label", `${p.label || "untitled"}, ${colorName}${selected ? ", selected" : ""}.`);
      } else {
        card.setAttribute("aria-label", `${p.label || "untitled"}, ${colorName}. Tap to review or re-tune.`);
      }
      const sw = document.createElement("div");
      sw.className = "point-swatch";
      sw.style.background = cvRgbToCss(p.sourceColor);
      const label = document.createElement("div");
      label.className = "point-label";
      label.textContent = p.label || "untitled";
      const name = document.createElement("div");
      name.className = "point-name";
      name.textContent = colorName;
      card.appendChild(sw);
      card.appendChild(label);
      card.appendChild(name);
      if (selectMode) {
        const check = document.createElement("div");
        check.className = "point-check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = selected ? "✓" : "";
        card.appendChild(check);
      }
      card.addEventListener("click", () => {
        if (selectMode) {
          toggleSelected(p.id);
        } else {
          openTuneForExistingPoint(p);
        }
      });
      pointsGrid.appendChild(card);
    });
  }

  function toggleSelected(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    selectedCount.textContent = String(selectedIds.size);
    deleteSelectedBtn.classList.toggle("hide", selectedIds.size === 0);
    renderPointsGrid();
  }

  function setSelectMode(on) {
    selectMode = on;
    selectedIds.clear();
    selectedCount.textContent = "0";
    selectModeBtn.textContent = on ? "Cancel select" : "Select";
    selectModeBtn.setAttribute("aria-pressed", String(on));
    deleteSelectedBtn.classList.add("hide");
    pointsHint.textContent = on
      ? "Tap colours to select, then delete the ones you no longer want."
      : "Tap a colour to review or re-tune it.";
    renderPointsGrid();
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    points = points.filter((p) => !selectedIds.has(p.id));
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

  function clearAllPoints() {
    if (points.length === 0) return;
    const ok = window.confirm(`Delete all ${points.length} saved colours? This can't be undone.`);
    if (!ok) return;
    points = [];
    selectedIds.clear();
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

  // ---- Templates (named snapshots of the full visualiser setup) ----
  // Captures everything the persistence above also remembers automatically
  // (sensitivity, flash/frequency/sync settings, nebula visibility, blend,
  // outlines, cartoon mode, and the colour-vision correction settings) plus
  // the saved-colours list, so a template is a complete look you can switch
  // back to on demand — not just a colour set. Older templates saved before
  // this only ever had a `points` array; applySettingsSnapshot() skips any
  // field that isn't present, so loading one just leaves those settings as
  // they currently are instead of erroring or zeroing them out.

  function currentSettingsSnapshot() {
    return {
      sensitivity: Number(sensitivitySlider.value),
      flashSpeed: Number(speedSlider.value),
      dimFlickerEnabled,
      torchInverted,
      screenFlashEnabled,
      freqLow: Number(freqLowSlider.value),
      freqHigh: Number(freqHighSlider.value),
      syncDelayMs,
      nebulaEnabled,
      blend: Number(blendSlider.value),
      outlinesEnabled,
      outlineThickness,
      outlineBlend,
      outlineOpacity,
      outlineColor,
      cartoonEnabled,
      cartoonLevels,
      cartoonEdgeThickness,
      cartoonEdgeStrength,
      cartoonSaturation,
      rotate180,
      spread,
      cvdType,
      cvdStrength
    };
  }

  function applySettingsSnapshot(s) {
    if (!s || typeof s !== "object") return;
    if (Number.isFinite(s.sensitivity)) { sensitivitySlider.value = String(s.sensitivity); updateSensitivity(); }
    if (Number.isFinite(s.flashSpeed)) { speedSlider.value = String(s.flashSpeed); updateFlashSpeed(); }
    if (typeof s.dimFlickerEnabled === "boolean") {
      dimFlickerEnabled = s.dimFlickerEnabled;
      dimToggle.checked = dimFlickerEnabled;
      saveBoolPref(DIM_FLICKER_KEY, dimFlickerEnabled);
    }
    if (typeof s.torchInverted === "boolean") {
      torchInverted = s.torchInverted;
      invertToggle.checked = torchInverted;
      saveBoolPref(TORCH_INVERTED_KEY, torchInverted);
    }
    if (typeof s.screenFlashEnabled === "boolean") {
      screenFlashEnabled = s.screenFlashEnabled;
      screenFlashToggle.checked = screenFlashEnabled;
      saveBoolPref(SCREEN_FLASH_KEY, screenFlashEnabled);
    }
    if (Number.isFinite(s.freqLow)) freqLowSlider.value = String(s.freqLow);
    if (Number.isFinite(s.freqHigh)) freqHighSlider.value = String(s.freqHigh);
    if (Number.isFinite(s.freqLow) || Number.isFinite(s.freqHigh)) updateFreqRange("low");
    if (Number.isFinite(s.syncDelayMs)) { syncDelaySlider.value = String(s.syncDelayMs); updateSyncDelay(); }
    if (typeof s.nebulaEnabled === "boolean" && s.nebulaEnabled !== nebulaEnabled) toggleNebula();
    if (Number.isFinite(s.blend)) {
      blendSlider.value = String(s.blend);
      blendLabel.textContent = `${blendSlider.value}%`;
      saveNumberPref(BLEND_KEY, blendSlider.value);
    }
    if (typeof s.outlinesEnabled === "boolean" && s.outlinesEnabled !== outlinesEnabled) toggleOutlinesMode();
    if (Number.isFinite(s.outlineThickness)) {
      outlineThickness = s.outlineThickness;
      outlineThicknessSlider.value = String(outlineThickness);
      outlineThicknessLabel.textContent = `${outlineThickness}px`;
      saveOutlineThicknessPref();
    }
    if (Number.isFinite(s.outlineBlend)) {
      outlineBlend = s.outlineBlend;
      outlineBlendSlider.value = String(Math.round(outlineBlend * 100));
      outlineBlendLabel.textContent = `${outlineBlendSlider.value}%`;
      saveOutlineBlendPref();
    }
    if (Number.isFinite(s.outlineOpacity)) {
      outlineOpacity = s.outlineOpacity;
      outlineOpacitySlider.value = String(Math.round(outlineOpacity * 100));
      outlineOpacityLabel.textContent = `${outlineOpacitySlider.value}%`;
      saveOutlineOpacityPref();
    }
    if (typeof s.outlineColor === "string" && /^#[0-9a-f]{6}$/i.test(s.outlineColor)) {
      outlineColor = s.outlineColor;
      outlineColorRgb = cvHexToRgb01(outlineColor);
      outlineColorInput.value = outlineColor;
      saveOutlineColorPref();
    }
    if (typeof s.cartoonEnabled === "boolean" && s.cartoonEnabled !== cartoonEnabled) toggleCartoonMode();
    if (Number.isFinite(s.cartoonLevels)) {
      cartoonLevels = s.cartoonLevels;
      cartoonLevelsSlider.value = String(cartoonLevels);
      cartoonLevelsLabel.textContent = String(cartoonLevels);
      saveCartoonLevelsPref();
    }
    if (Number.isFinite(s.cartoonEdgeThickness)) {
      cartoonEdgeThickness = s.cartoonEdgeThickness;
      cartoonEdgeThicknessSlider.value = String(cartoonEdgeThickness);
      cartoonEdgeThicknessLabel.textContent = `${cartoonEdgeThickness}px`;
      saveCartoonEdgeThicknessPref();
    }
    if (Number.isFinite(s.cartoonEdgeStrength)) {
      cartoonEdgeStrength = s.cartoonEdgeStrength;
      cartoonEdgeStrengthSlider.value = String(Math.round(cartoonEdgeStrength * 100));
      cartoonEdgeStrengthLabel.textContent = `${cartoonEdgeStrengthSlider.value}%`;
      saveCartoonEdgeStrengthPref();
    }
    if (Number.isFinite(s.cartoonSaturation)) {
      cartoonSaturation = s.cartoonSaturation;
      cartoonSaturationSlider.value = String(Math.round(cartoonSaturation * 100));
      cartoonSaturationLabel.textContent = `${cartoonSaturationSlider.value}%`;
      saveCartoonSaturationPref();
    }
    if (typeof s.rotate180 === "boolean") {
      rotate180 = s.rotate180;
      rotateBtn.classList.toggle("active", rotate180);
      saveRotatePref();
    }
    if (Number.isFinite(s.spread)) {
      spread = s.spread;
      spreadSlider.value = String(spread);
      spreadLabel.textContent = spreadDescription(spread);
      saveSpreadPref();
    }
    if (typeof s.cvdType === "string" && Object.prototype.hasOwnProperty.call(CVD_TYPE_CODES, s.cvdType)) {
      cvdType = s.cvdType;
      cvdTypeSelect.value = cvdType;
      cvdStrengthWrap.classList.toggle("hide", cvdType === "none");
      saveCvdTypePref();
    }
    if (Number.isFinite(s.cvdStrength)) {
      cvdStrength = s.cvdStrength;
      cvdStrengthSlider.value = String(Math.round(cvdStrength * 100));
      cvdStrengthLabel.textContent = `${cvdStrengthSlider.value}%`;
      saveCvdStrengthPref();
    }
  }

  function renderProfileSelect() {
    const prevValue = profileSelect.value;
    profileSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— Select a template —";
    profileSelect.appendChild(placeholder);
    profiles.forEach((prof) => {
      const opt = document.createElement("option");
      opt.value = prof.id;
      opt.textContent = `${prof.name} (${prof.points.length})`;
      profileSelect.appendChild(opt);
    });
    if (profiles.some((p) => p.id === prevValue)) profileSelect.value = prevValue;
  }

  function saveCurrentAsProfile() {
    const name = profileNameInput.value.trim();
    if (!name) {
      profileStatus.textContent = "Enter a name for the template first.";
      return;
    }
    const pointsSnapshot = JSON.parse(JSON.stringify(points));
    const settings = currentSettingsSnapshot();
    const existing = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.points = pointsSnapshot;
      existing.settings = settings;
    } else {
      profiles.push({
        id: "prof_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        name,
        points: pointsSnapshot,
        settings
      });
    }
    saveCvProfiles();
    renderProfileSelect();
    profileSelect.value = existing ? existing.id : profiles[profiles.length - 1].id;
    profileNameInput.value = "";
    profileStatus.textContent = `${existing ? "Updated" : "Saved"} template "${name}" — ${points.length} colour${points.length === 1 ? "" : "s"} and current settings.`;
  }

  function loadSelectedProfile() {
    const id = profileSelect.value;
    if (!id) {
      profileStatus.textContent = "Pick a template to load first.";
      return;
    }
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return;
    const ok = window.confirm(
      `Load template "${prof.name}"? This replaces your current ${points.length} saved colour${points.length === 1 ? "" : "s"} and settings with those from this template.`
    );
    if (!ok) return;
    points = JSON.parse(JSON.stringify(prof.points));
    selectedIds.clear();
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    renderPointsGrid();
    // Older templates (saved before templates captured settings) have no
    // `settings` field — applySettingsSnapshot() is a no-op in that case,
    // leaving whatever's currently configured untouched.
    applySettingsSnapshot(prof.settings);
    profileStatus.textContent = `Loaded "${prof.name}" — ${points.length} colour${points.length === 1 ? "" : "s"} and settings.`;
  }

  function deleteSelectedProfile() {
    const id = profileSelect.value;
    if (!id) {
      profileStatus.textContent = "Pick a template to delete first.";
      return;
    }
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return;
    const ok = window.confirm(`Delete template "${prof.name}"? This can't be undone — your current saved colours are unaffected.`);
    if (!ok) return;
    profiles = profiles.filter((p) => p.id !== id);
    saveCvProfiles();
    renderProfileSelect();
    profileStatus.textContent = `Deleted template "${prof.name}".`;
  }

  function renderPresetGrid() {
    presetGrid.innerHTML = "";
    CVD_PRESETS.forEach((preset) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "preset-card";
      card.setAttribute("aria-label", `${preset.label}. Calibrate this colour.`);
      const sw = document.createElement("div");
      sw.className = "preset-swatch";
      sw.style.background = preset.hex;
      const label = document.createElement("div");
      label.className = "preset-label";
      label.textContent = preset.label;
      card.appendChild(sw);
      card.appendChild(label);
      card.addEventListener("click", () => {
        choosePanel.classList.add("hide");
        openTuneForNewPoint(cvHexToRgb01(preset.hex));
      });
      presetGrid.appendChild(card);
    });
  }

  function openChoosePanel() {
    hideCvOverlayPanels();
    renderPresetGrid();
    choosePanelReturnFocusEl = calibrateBtn;
    choosePanel.classList.remove("hide");
    chooseAimBtn.focus();
  }

  function closeChoosePanel() {
    choosePanel.classList.add("hide");
    if (choosePanelReturnFocusEl) choosePanelReturnFocusEl.focus();
    choosePanelReturnFocusEl = null;
  }

  function closePointsPanel() {
    pointsPanel.classList.add("hide");
    importExportStatus.textContent = "";
    profileStatus.textContent = "";
    pointsBtn.focus();
  }

  // ---- Export / import ----

  function isValidImportedPoint(p) {
    return p && typeof p === "object" &&
      Array.isArray(p.sourceColor) && p.sourceColor.length === 3 &&
      p.sourceColor.every((c) => typeof c === "number" && c >= 0 && c <= 1) &&
      typeof p.hueShift === "number" &&
      typeof p.satAdjust === "number" &&
      typeof p.lightAdjust === "number" &&
      (p.contrastAdjust === undefined || typeof p.contrastAdjust === "number") &&
      (p.exposureAdjust === undefined || typeof p.exposureAdjust === "number");
  }

  function cvDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPoints() {
    if (points.length === 0) {
      importExportStatus.textContent = "No saved colours to export yet.";
      return;
    }
    const blob = new Blob([JSON.stringify(points, null, 2)], { type: "application/json" });
    cvDownloadBlob(blob, `colour-vision-calibration-${new Date().toISOString().slice(0, 10)}.json`);
    importExportStatus.textContent = `Exported ${points.length} colour${points.length === 1 ? "" : "s"}.`;
  }

  function importPointsFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        importExportStatus.textContent = "Import failed: not a valid JSON file.";
        return;
      }
      const incoming = Array.isArray(parsed) ? parsed : [];
      const valid = incoming.filter(isValidImportedPoint);
      if (valid.length === 0) {
        importExportStatus.textContent = "Import failed: no valid saved colours found in that file.";
        return;
      }
      const room = MAX_POINTS - points.length;
      const toAdd = valid.slice(0, Math.max(0, room)).map((p) => ({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: typeof p.label === "string" ? p.label.slice(0, 40) : "",
        sourceColor: p.sourceColor,
        hueShift: p.hueShift,
        satAdjust: p.satAdjust,
        lightAdjust: p.lightAdjust,
        contrastAdjust: p.contrastAdjust || 0,
        exposureAdjust: p.exposureAdjust || 0
      }));
      points = points.concat(toAdd);
      saveCvPoints();
      uploadPointUniforms();
      updatePointsCount();
      renderPointsGrid();
      const skipped = valid.length - toAdd.length;
      importExportStatus.textContent = `Imported ${toAdd.length} colour${toAdd.length === 1 ? "" : "s"}.` +
        (skipped > 0 ? ` ${skipped} skipped (limit of ${MAX_POINTS} reached).` : "");
    };
    reader.onerror = () => {
      importExportStatus.textContent = "Import failed: could not read that file.";
    };
    reader.readAsText(file);
  }

  function isTransientCameraError(err) {
    // These typically mean the camera hardware/OS briefly refused to
    // start (e.g. another app still holding it, or the previous session's
    // handle not yet released) rather than "this device has no torch" —
    // worth one retry after a short delay instead of giving up immediately.
    const name = err && err.name;
    return name === "NotReadableError" || name === "AbortError" || name === "TrackStartError";
  }

  function acquireCameraTrack() {
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((camStream) => camStream.getVideoTracks()[0]);
  }

  async function requestFlashCapability() {
    flashStatus.classList.remove("hide");

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      appendFlashStatus(
        "Camera flash isn't available in this browser." +
          (vibrateSupported ? " Vibrate-only mode armed." : "")
      );
      return;
    }

    let track;
    try {
      track = await acquireCameraTrack();
    } catch (err) {
      if (!isTransientCameraError(err)) {
        appendFlashStatus(
          "Couldn't access the camera for flash: " +
            (err && err.message ? err.message : err) +
            (vibrateSupported ? " Vibrate-only mode armed." : "")
        );
        return;
      }
      appendFlashStatus("Camera busy — retrying...");
      await sleep(700);
      try {
        track = await acquireCameraTrack();
      } catch (err2) {
        appendFlashStatus(
          "Couldn't access the camera for flash: " +
            (err2 && err2.message ? err2.message : err2) +
            " Close any other app or tab using the camera, then toggle flash off and back on to retry." +
            (vibrateSupported ? " Vibrate-only mode armed for now." : "")
        );
        return;
      }
    }

    refreshCameraDeviceList(); // permission just granted — labels may now be readable

    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps && caps.torch) {
      torchTrack = track;
      torchSupported = true;
      torchFailCount = 0;
      track.addEventListener("ended", () =>
        handleTorchLost(
          "The camera connection ended (often caused by the screen locking " +
            "or the tab losing focus). Turn the flash toggle off and back on to reconnect."
        )
      );
      appendFlashStatus(
        vibrateSupported
          ? "Flash + vibrate armed."
          : "Flash armed (vibrate unsupported)."
      );
    } else {
      track.stop();
      appendFlashStatus(
        "This device/browser doesn't expose a camera flash (common on iPhone/Safari)." +
          (vibrateSupported ? " Vibrate-only mode armed." : "")
      );
    }
  }

  function appendFlashStatus(text) {
    flashStatus.textContent = text;
  }

  async function setTorchBaseline(on) {
    // Callers hold torchBusy for the duration of this call so a
    // beat-triggered pulse can never interleave with it — without that,
    // a baseline "on" call and an organic beat's "off" call could race,
    // and whichever happened to resolve last would silently win.
    if (!torchTrack) return;
    try {
      await setTorchConstraint(on);
      return;
    } catch (err) {
      // Some devices reject a torch constraint applied immediately after
      // getUserMedia resolves, before the camera preview has actually
      // started streaming frames — one retry after a short delay usually
      // clears it.
    }
    await sleep(250);
    try {
      await setTorchConstraint(on);
    } catch (err2) {
      // Unlike regular beat pulses (which tolerate a transient failure
      // silently — one missed flash isn't worth reporting), a failed
      // *baseline* call means the light may just never turn on with no
      // other feedback, so this one is surfaced.
      appendFlashStatus(
        "The camera flash didn't respond to the initial " +
          (on ? "on" : "off") +
          " command (" +
          (err2 && err2.message ? err2.message : err2) +
          "). Try toggling the flash off and back on."
      );
    }
  }

  async function armFlash() {
    flashEnabled = true;
    torchBusy = true; // hold off beat-triggered pulses until arming settles
    try {
      if (!torchSupported) {
        // First arm, or a previous arm was lost — (re)request the camera.
        await requestFlashCapability();
      }
      flashBtn.textContent = "Flash + vibrate on beat: On";
      flashBtn.classList.add("active");
      if (torchSupported && torchTrack && torchInverted) {
        // Inverted mode's base state is ON; establish it as soon as armed.
        await setTorchBaseline(true);
      }
    } finally {
      torchBusy = false;
    }
  }

  async function disarmFlash() {
    flashEnabled = false;
    flashBtn.textContent = "Flash + vibrate on beat: Off";
    flashBtn.classList.remove("active");
    if (!torchTrack) return;
    torchBusy = true;
    try {
      await setTorchBaseline(false);
    } finally {
      torchBusy = false;
    }
  }

  async function toggleFlash() {
    if (flashEnabled) {
      await disarmFlash();
    } else {
      await armFlash();
    }
  }

  function updateSensitivity() {
    sensitivity = Number(sensitivitySlider.value) / 100;
    saveNumberPref(SENSITIVITY_KEY, sensitivitySlider.value);
  }

  function updateSyncDelay() {
    syncDelayMs = Number(syncDelaySlider.value);
    syncDelayLabel.textContent = `${syncDelayMs} ms`;
    saveNumberPref(SYNC_DELAY_KEY, syncDelayMs);
  }

  // ---- Tablet viewer (WebRTC, signaled over public MQTT relays) ----
  // Streams this same stage canvas to a second device (e.g. a tablet or
  // TV) as a read-only viewer — same room-code pairing pattern as
  // colorvision.js/restore.js's "Connect tablet" feature (and viewer.html
  // is the same generic viewer page; a single stream here just lands in
  // its plain single-pane fallback, since there's no original/corrected
  // pair to compare for a visualiser). When the camera background is on,
  // a second raw stream also goes out alongside the composited canvas —
  // viewer.html shows both side by side, and a Sound Nebula receiver (see
  // "Receiving a camera feed from another device" below) uses that raw
  // stream as its own local camera background instead of viewer.html's
  // read-only display.

  const LIVE_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt",
    "wss://test.mosquitto.org:8081/mqtt",
  ];

  function makeRoomCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function makeDeviceId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function signalTopic(room) {
    return `sound-visualiser-pair/${room}/signal`;
  }

  const broadcastShare = {
    active: false,
    cameraOnly: false,
    room: null,
    deviceId: makeDeviceId(),
    clients: [],
    peers: new Map(), // viewerId -> { pc }
  };

  function loadMqttLib() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the live-pairing library — check your internet connection."));
      document.head.appendChild(s);
    });
  }

  function publishSignal(fields, opts) {
    opts = opts || {};
    if (!broadcastShare.room) return;
    const msg = Object.assign({ v: 1, from: broadcastShare.deviceId, to: null, ts: Date.now() }, fields);
    const payload = JSON.stringify(msg);
    const topic = signalTopic(broadcastShare.room);
    broadcastShare.clients.forEach((c) => {
      if (c.connected) c.publish(topic, payload, { retain: !!opts.retain, qos: opts.qos != null ? opts.qos : 0 });
    });
  }

  function connectBroadcastSignaling(room) {
    return loadMqttLib().then(() => new Promise((resolve, reject) => {
      let resolved = false;
      const topic = signalTopic(room);
      LIVE_BROKERS.forEach((url) => {
        try {
          const client = window.mqtt.connect(url, { connectTimeout: 9000, reconnectPeriod: 5000 });
          client.on("connect", () => {
            client.subscribe(topic, { qos: 1 });
            if (!resolved) { resolved = true; resolve(); }
          });
          client.on("message", (t, payload) => {
            if (t === topic) handleBroadcastSignal(payload.toString());
          });
          broadcastShare.clients.push(client);
        } catch (e) { /* other relays may still work */ }
      });
      setTimeout(() => { if (!resolved) reject(new Error("Couldn't reach a relay.")); }, 9000);
    }));
  }

  function handleBroadcastSignal(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.from === broadcastShare.deviceId) return;
    if (msg.type === "viewer-here") { ensureBroadcastPeerFor(msg.from); return; }
    if (msg.type === "answer" && msg.to === broadcastShare.deviceId) handleBroadcastAnswer(msg);
  }

  // Mirrors broadcast status into both the normal "Connect tablet" panel
  // (viewerStatus) and the camera-only mode's own standalone panel
  // (cameraOnlyStatusText, only ever shown in camera-only mode) — whichever
  // one is actually visible stays in sync automatically.
  function setViewerStatus(text) {
    viewerStatus.textContent = text;
    cameraOnlyStatusText.textContent = text;
  }

  function updateViewerConnectedBadge() {
    const anyConnected = Array.from(broadcastShare.peers.values()).some(
      (entry) => entry.pc && entry.pc.connectionState === "connected"
    );
    viewerConnectedBadge.classList.toggle("hide", !anyConnected);
    if (anyConnected) setViewerStatus("Tablet connected.");
  }

  async function ensureBroadcastPeerFor(viewerId) {
    if (broadcastShare.peers.has(viewerId)) return; // dedupe repeated viewer-here / multi-broker echoes
    if (typeof canvas.captureStream !== "function") {
      setViewerStatus("Viewer streaming isn't supported in this browser.");
      return;
    }
    const entry = { pc: null };
    broadcastShare.peers.set(viewerId, entry);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    entry.pc = pc;
    const canvasStream = canvas.captureStream(30);
    canvasStream.getTracks().forEach((t) => pc.addTrack(t, canvasStream));
    // Raw camera feed, sent alongside the composited canvas whenever it's
    // available — a Sound Nebula receiver uses this as its own camera
    // background, and viewer.html shows it side by side with the
    // composited view for anyone just watching.
    const rawStream = cameraBackgroundEnabled && cameraStream ? cameraStream : null;
    if (rawStream) {
      rawStream.getVideoTracks().forEach((t) => pc.addTrack(t, rawStream));
    }

    pc.addEventListener("connectionstatechange", () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (broadcastShare.peers.get(viewerId) === entry) broadcastShare.peers.delete(viewerId);
      }
      updateViewerConnectedBadge();
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);
      publishSignal({
        type: "offer",
        to: viewerId,
        sdp: pc.localDescription.sdp,
        correctedStreamId: canvasStream.id,
        originalStreamId: rawStream ? rawStream.id : null
      }, { qos: 1 });
    } catch (err) {
      broadcastShare.peers.delete(viewerId);
      setViewerStatus("Couldn't connect to the other device: " + (err.message || err.name || "unknown error"));
    }
  }

  async function handleBroadcastAnswer(msg) {
    const entry = broadcastShare.peers.get(msg.from);
    if (!entry || !entry.pc) return;
    if (entry.pc.signalingState !== "have-local-offer") return; // dedupe: already answered / stale
    try {
      await entry.pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
    } catch (e) {}
  }

  // Waiting for ICE gathering to finish before sending the offer means
  // every candidate is already embedded in the SDP — no separate ICE
  // candidate exchange needed over the relay.
  function waitForIceGatheringComplete(peer) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        peer.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
      function check() {
        if (peer.iceGatheringState === "complete") finish();
      }
      peer.addEventListener("icegatheringstatechange", check);
      setTimeout(finish, 3500);
    });
  }

  function stopTabletShare(message) {
    broadcastShare.active = false;
    broadcastShare.cameraOnly = false;
    broadcastShare.peers.forEach((entry) => { try { if (entry.pc) entry.pc.close(); } catch (e) {} });
    broadcastShare.peers.clear();
    broadcastShare.clients.forEach((c) => { try { c.end(true); } catch (e) {} });
    broadcastShare.clients = [];
    broadcastShare.room = null;
    shareCodeBlock.classList.add("hide");
    viewerConnectedBadge.classList.add("hide");
    setViewerStatus(message || "");
    startShareBtn.textContent = "Start live sharing";
    startShareBtn.disabled = false;
  }

  async function startTabletShare() {
    startShareBtn.disabled = true;
    setViewerStatus("Connecting to relay…");
    const room = makeRoomCode();
    broadcastShare.room = room;

    try {
      await connectBroadcastSignaling(room);
    } catch (err) {
      setViewerStatus(err.message || "Couldn't start live sharing.");
      broadcastShare.room = null;
      startShareBtn.disabled = false;
      return;
    }

    broadcastShare.active = true;
    shareRoomCode.textContent = room;
    cameraOnlyRoomCode.textContent = room;
    const viewUrl = new URL("viewer.html", location.href);
    viewUrl.searchParams.set("room", room);
    shareViewUrlText.textContent = viewUrl.toString();
    shareCodeBlock.classList.remove("hide");
    setViewerStatus("Waiting for the other device to connect…");
    startShareBtn.textContent = "Stop live sharing";
    startShareBtn.disabled = false;
  }

  function toggleTabletShare() {
    if (broadcastShare.active) {
      stopTabletShare("Sharing stopped.");
    } else {
      startTabletShare();
    }
  }

  // ---- Camera-only broadcast mode ----
  // For a two-device setup: this device just streams its raw camera feed,
  // with no controls of its own to fumble with once it's mounted somewhere.
  // All calibration/control happens on whichever other device connects via
  // "Receive camera from another device" below — that device gets the raw
  // feed and runs it through its own local camera-background pipeline,
  // same as if it had its own camera. This reuses the same tablet-share
  // plumbing as "Connect tablet" above (ensureBroadcastPeerFor already
  // sends the raw stream alongside the composited canvas whenever the
  // camera background is on); it just also hides this device's own HUD in
  // favour of a small non-blocking corner badge with the room code.
  async function enterCameraOnlyMode() {
    if (!cameraBackgroundEnabled) return;
    broadcastShare.cameraOnly = true;
    hud.classList.add("hide");
    cameraOnlyBadge.classList.remove("hide");
    cameraOnlyBtn.textContent = "Camera-only broadcast: On";
    cameraOnlyBtn.setAttribute("aria-pressed", "true");
    cameraOnlyStatusText.textContent = "Connecting to relay…";
    await startTabletShare();
    updateFloatingCaptureBarVisibility();
  }

  function exitCameraOnlyMode() {
    stopTabletShare("");
    cameraOnlyBadge.classList.add("hide");
    hud.classList.remove("hide");
    cameraOnlyBtn.textContent = "Camera-only broadcast: Off";
    cameraOnlyBtn.setAttribute("aria-pressed", "false");
    updateFloatingCaptureBarVisibility();
  }

  function toggleCameraOnlyMode() {
    if (broadcastShare.cameraOnly) {
      exitCameraOnlyMode();
    } else {
      enterCameraOnlyMode();
    }
  }

  // ---- Receiving a camera feed from another device ----
  // The reverse of "Connect tablet"/camera-only broadcast above: this is
  // the *answerer* side of the same room-code/WebRTC pairing, but instead
  // of displaying the incoming video read-only (like viewer.html does),
  // the raw ("original") track becomes this device's own camera
  // background — so Nebula's existing camera-background/colour-vision
  // pipeline runs against it exactly as if it came from a local camera.
  // Lets one device (e.g. a phone in Camera-only broadcast mode, mounted
  // somewhere) just point at the scene while another device does all the
  // sensitivity tuning, colour calibration, and beat-effect control.
  let receiverConnection = null;
  let isReceiverMode = false;
  let receiverStarted = false;

  // Mirrors receiver-side status into a small badge that stays visible
  // even with the HUD hidden, so the connection/error state stays visible
  // for troubleshooting instead of silently going dark.
  function setReceiverStatus(text) {
    receiverStatusBadge.textContent = text;
    receiverStatusBadge.classList.toggle("hide", !text);
  }

  function connectAsReceiver(room) {
    const deviceId = makeDeviceId();
    let clients = [];
    let pc = null;
    let heartbeatTimer = null;
    let torn = false;
    let pendingIds = null;

    function publish(fields, opts) {
      opts = opts || {};
      const msg = Object.assign({ v: 1, from: deviceId, to: null, ts: Date.now() }, fields);
      const payload = JSON.stringify(msg);
      const topic = signalTopic(room);
      clients.forEach((c) => {
        if (c.connected) c.publish(topic, payload, { retain: !!opts.retain, qos: opts.qos != null ? opts.qos : 0 });
      });
    }

    function stopHeartbeat() {
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    }
    function startHeartbeat() {
      stopHeartbeat();
      publish({ type: "viewer-here" });
      heartbeatTimer = setInterval(() => publish({ type: "viewer-here" }), 3000);
    }

    async function handleOffer(msg) {
      if (pc && ["new", "connecting", "connected"].includes(pc.connectionState)) return;
      pendingIds = { corrected: msg.correctedStreamId || null, original: msg.originalStreamId || null };
      if (!pendingIds.original) {
        setReceiverStatus("The camera device isn't broadcasting its raw feed — turn on its Camera background first.");
        return;
      }
      setReceiverStatus("Camera device found — connecting…");

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.addEventListener("track", (e) => {
        const streamId = e.streams[0] && e.streams[0].id;
        if (streamId !== pendingIds.original) return; // only the raw feed matters here
        cameraFeed.srcObject = e.streams[0];
        cameraFeed.play().catch(() => {});
        finishReceiverStart();
      });

      pc.addEventListener("connectionstatechange", () => {
        if (!pc || torn) return;
        if (pc.connectionState === "connected") {
          setReceiverStatus("Receiving from camera device.");
        } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          setReceiverStatus("Connection to the camera device was lost.");
        }
      });

      try {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        publish({ type: "answer", to: msg.from, sdp: pc.localDescription.sdp }, { qos: 1 });
      } catch (err) {
        setReceiverStatus(err.message || err.name || "Couldn't connect.");
      }
    }

    function handleMessage(raw) {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || msg.from === deviceId) return;
      if (msg.type === "offer" && msg.to === deviceId) handleOffer(msg);
    }

    setReceiverStatus("Connecting to relay…");

    const ready = new Promise((resolveReady, rejectReady) => {
      loadMqttLib().then(() => {
        if (torn) { rejectReady(new Error("cancelled")); return; }
        let resolved = false;
        const topic = signalTopic(room);
        clients = LIVE_BROKERS.map((url) => {
          const client = window.mqtt.connect(url, { connectTimeout: 9000, reconnectPeriod: 5000 });
          client.on("connect", () => {
            client.subscribe(topic, { qos: 1 });
            if (!resolved) {
              resolved = true;
              setReceiverStatus("Waiting for the camera device…");
              startHeartbeat();
              resolveReady();
            }
          });
          client.on("message", (t, payload) => {
            if (t === topic) handleMessage(payload.toString());
          });
          return client;
        });

        setTimeout(() => {
          if (resolved || torn) return;
          rejectReady(new Error("Couldn't reach a relay — check your internet connection and try again."));
        }, 9000);
      }).catch((err) => {
        if (torn) return;
        rejectReady(err);
      });
    });

    return {
      ready,
      teardown() {
        torn = true;
        stopHeartbeat();
        if (pc) { pc.close(); pc = null; }
        clients.forEach((c) => { try { c.end(true); } catch (e) {} });
        clients = [];
      }
    };
  }

  function finishReceiverStart() {
    if (receiverStarted) return;
    receiverStarted = true;
    isReceiverMode = true;
    setReceiverStatus("Receiving from camera device.");
    cameraBackgroundEnabled = true;
    cameraBgBtn.textContent = "Camera background: On";
    cameraBgBtn.classList.add("active");
    cameraBgBtn.setAttribute("aria-pressed", "true");
    ensureCorrectionCanvas();
    applyReceiverModeUi();
    closeViewerPanel();
    updateFloatingCaptureBarVisibility();
  }

  function applyReceiverModeUi() {
    // No local camera hardware on this device to control or broadcast
    // further — these only make sense for a camera physically attached to
    // it, and keeping a two-device setup to exactly two devices avoids a
    // confusing daisy chain.
    cameraSelectWrap.classList.add("hide");
    cameraBgBtn.classList.add("hide");
    cameraOnlyBtn.classList.add("hide");
    connectTabletBtn.classList.add("hide");
  }

  function startReceiving() {
    const room = receiveRoomInput.value.trim().toUpperCase();
    if (room.length < 4) {
      setReceiverStatus("Enter the room code shown on the camera device.");
      return;
    }
    receiveConnectBtn.disabled = true;
    receiverConnection = connectAsReceiver(room);
    receiverConnection.ready.catch((err) => {
      receiverConnection = null;
      setReceiverStatus((err && err.message) || "Couldn't connect. Check your internet connection and try again.");
      receiveConnectBtn.disabled = false;
    });
  }

  // Mobile browsers throttle requestAnimationFrame hard (often to ~1fps or
  // less) in a tab that isn't the active/foreground one — which is exactly
  // the render loop that feeds the shared canvas, so backgrounding this
  // tab (e.g. switching to the viewer in a second tab on the same phone)
  // makes the connected viewer's screen freeze or go blank even though the
  // WebRTC connection itself is still "connected". Surfacing that here is
  // the most this page can do about it — there's no way for a background
  // tab to force full-rate rendering.
  document.addEventListener("visibilitychange", () => {
    if (!broadcastShare.active) return;
    if (document.hidden) {
      viewerStatus.textContent = "This tab is in the background — the shared view will freeze until it's active again.";
    } else {
      const anyConnected = Array.from(broadcastShare.peers.values()).some(
        (entry) => entry.pc && entry.pc.connectionState === "connected"
      );
      viewerStatus.textContent = anyConnected ? "Tablet connected." : "Waiting for a tablet to connect…";
      updateViewerConnectedBadge();
    }
  });

  function openViewerPanel() {
    hideCvOverlayPanels();
    viewerPanel.classList.remove("hide");
    closeViewerPanelBtn.focus();
  }

  function closeViewerPanel() {
    viewerPanel.classList.add("hide");
    connectTabletBtn.focus();
  }

  startBtn.addEventListener("click", startAudio);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  micModeBtn.addEventListener("click", toggleMicMode);
  updateMicModeBtn();
  flashBtn.addEventListener("click", toggleFlash);
  sensitivitySlider.addEventListener("input", updateSensitivity);
  speedSlider.addEventListener("input", updateFlashSpeed);
  dimToggle.addEventListener("change", () => {
    dimFlickerEnabled = dimToggle.checked;
    saveBoolPref(DIM_FLICKER_KEY, dimFlickerEnabled);
  });
  invertToggle.addEventListener("change", async () => {
    torchInverted = invertToggle.checked;
    saveBoolPref(TORCH_INVERTED_KEY, torchInverted);
    if (torchInverted && !flashEnabled) {
      // Checking Invert should activate the flash system by itself,
      // without requiring the separate Flash button to already be on.
      await armFlash();
      return;
    }
    if (flashEnabled && torchSupported && torchTrack && !torchBusy) {
      // Switch the base state immediately: ON for inverted mode, OFF for normal.
      torchBusy = true;
      try {
        await setTorchBaseline(torchInverted);
      } finally {
        torchBusy = false;
      }
    }
  });
  screenFlashToggle.addEventListener("change", () => {
    screenFlashEnabled = screenFlashToggle.checked;
    saveBoolPref(SCREEN_FLASH_KEY, screenFlashEnabled);
  });
  testFlashBtn.addEventListener("click", () => {
    // Bypasses beat detection entirely — a bright white pop so it's
    // obviously visible regardless of the current bass/mid/treble mix.
    flashScreen("hsl(0, 0%, 100%)", 260, 1);
  });
  freqLowSlider.addEventListener("input", () => updateFreqRange("low"));
  freqHighSlider.addEventListener("input", () => updateFreqRange("high"));
  freqAllBtn.addEventListener("click", () => {
    freqLowSlider.value = freqLowSlider.min;
    freqHighSlider.value = freqHighSlider.max;
    updateFreqRange("low");
  });
  syncDelaySlider.addEventListener("input", updateSyncDelay);
  cameraBgBtn.addEventListener("click", toggleCameraBackground);
  cameraSelect.addEventListener("change", () => switchCamera(cameraSelect.value));
  if ("mediaDevices" in navigator && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", refreshCameraDeviceList);
  }
  nebulaBtn.addEventListener("click", toggleNebula);
  outlinesBtn.addEventListener("click", toggleOutlinesMode);
  outlineThicknessSlider.addEventListener("input", () => {
    outlineThickness = parseFloat(outlineThicknessSlider.value);
    outlineThicknessLabel.textContent = `${outlineThickness}px`;
    saveOutlineThicknessPref();
  });
  outlineBlendSlider.addEventListener("input", () => {
    outlineBlend = parseFloat(outlineBlendSlider.value) / 100;
    outlineBlendLabel.textContent = `${outlineBlendSlider.value}%`;
    saveOutlineBlendPref();
  });
  outlineOpacitySlider.addEventListener("input", () => {
    outlineOpacity = parseFloat(outlineOpacitySlider.value) / 100;
    outlineOpacityLabel.textContent = `${outlineOpacitySlider.value}%`;
    saveOutlineOpacityPref();
  });
  outlineColorInput.addEventListener("input", () => {
    outlineColor = outlineColorInput.value;
    outlineColorRgb = cvHexToRgb01(outlineColor);
    saveOutlineColorPref();
  });
  outlineThicknessSlider.value = String(outlineThickness);
  outlineThicknessLabel.textContent = `${outlineThickness}px`;
  outlineBlendSlider.value = String(Math.round(outlineBlend * 100));
  outlineBlendLabel.textContent = `${outlineBlendSlider.value}%`;
  outlineOpacitySlider.value = String(Math.round(outlineOpacity * 100));
  outlineOpacityLabel.textContent = `${outlineOpacitySlider.value}%`;
  outlineColorInput.value = outlineColor;
  updateOutlinesUi();
  cartoonBtn.addEventListener("click", toggleCartoonMode);
  cartoonLevelsSlider.addEventListener("input", () => {
    cartoonLevels = parseFloat(cartoonLevelsSlider.value);
    cartoonLevelsLabel.textContent = String(cartoonLevels);
    saveCartoonLevelsPref();
  });
  cartoonLevelsSlider.value = String(cartoonLevels);
  cartoonLevelsLabel.textContent = String(cartoonLevels);
  cartoonEdgeThicknessSlider.addEventListener("input", () => {
    cartoonEdgeThickness = parseFloat(cartoonEdgeThicknessSlider.value);
    cartoonEdgeThicknessLabel.textContent = `${cartoonEdgeThickness}px`;
    saveCartoonEdgeThicknessPref();
  });
  cartoonEdgeThicknessSlider.value = String(cartoonEdgeThickness);
  cartoonEdgeThicknessLabel.textContent = `${cartoonEdgeThickness}px`;
  cartoonEdgeStrengthSlider.addEventListener("input", () => {
    cartoonEdgeStrength = parseFloat(cartoonEdgeStrengthSlider.value) / 100;
    cartoonEdgeStrengthLabel.textContent = `${cartoonEdgeStrengthSlider.value}%`;
    saveCartoonEdgeStrengthPref();
  });
  cartoonEdgeStrengthSlider.value = String(Math.round(cartoonEdgeStrength * 100));
  cartoonEdgeStrengthLabel.textContent = `${cartoonEdgeStrengthSlider.value}%`;
  cartoonSaturationSlider.addEventListener("input", () => {
    cartoonSaturation = parseFloat(cartoonSaturationSlider.value) / 100;
    cartoonSaturationLabel.textContent = `${cartoonSaturationSlider.value}%`;
    saveCartoonSaturationPref();
  });
  cartoonSaturationSlider.value = String(Math.round(cartoonSaturation * 100));
  cartoonSaturationLabel.textContent = `${cartoonSaturationSlider.value}%`;
  updateCartoonUi();
  connectTabletBtn.addEventListener("click", openViewerPanel);
  startShareBtn.addEventListener("click", toggleTabletShare);
  closeViewerPanelBtn.addEventListener("click", closeViewerPanel);
  cameraOnlyBtn.addEventListener("click", toggleCameraOnlyMode);
  cameraOnlyStopBtn.addEventListener("click", exitCameraOnlyMode);
  showReceiveBtn.addEventListener("click", () => {
    receiveForm.classList.remove("hide");
    showReceiveBtn.classList.add("hide");
  });
  receiveConnectBtn.addEventListener("click", startReceiving);
  receiveRoomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") startReceiving();
  });
  // Reflect the persisted settings loaded earlier back into their controls
  // before the update*() calls below re-derive state from them — otherwise
  // the controls would keep showing their HTML defaults even though the
  // underlying values were actually restored.
  sensitivitySlider.value = String(Math.round(sensitivity * 100));
  speedSlider.value = String(Math.round(flashSpeed * 100));
  dimToggle.checked = dimFlickerEnabled;
  invertToggle.checked = torchInverted;
  screenFlashToggle.checked = screenFlashEnabled;
  freqLowSlider.value = String(loadOutlineNumberPref(FREQ_LOW_KEY, Number(freqLowSlider.value)));
  freqHighSlider.value = String(loadOutlineNumberPref(FREQ_HIGH_KEY, Number(freqHighSlider.value)));
  syncDelaySlider.value = String(syncDelayMs);
  nebulaBtn.textContent = nebulaEnabled ? "Nebula: On" : "Nebula: Off";
  nebulaBtn.classList.toggle("active", !nebulaEnabled);
  nebulaBtn.setAttribute("aria-pressed", String(!nebulaEnabled));
  updateSensitivity();
  updateFlashSpeed();
  updateFreqRange("low");
  updateSyncDelay();

  // ---- Colour vision wiring ----

  colourVisionBtn.addEventListener("click", toggleColourVision);
  colourVisionFlashBtn.addEventListener("click", toggleColourVisionFlash);

  blendSlider.value = String(loadOutlineNumberPref(BLEND_KEY, Number(blendSlider.value)));
  blendSlider.addEventListener("input", () => {
    blendLabel.textContent = `${blendSlider.value}%`;
    saveNumberPref(BLEND_KEY, blendSlider.value);
  });

  spreadSlider.addEventListener("input", () => {
    spread = parseFloat(spreadSlider.value);
    spreadLabel.textContent = spreadDescription(spread);
    saveSpreadPref();
  });

  cvdTypeSelect.addEventListener("change", () => {
    cvdType = cvdTypeSelect.value;
    cvdStrengthWrap.classList.toggle("hide", cvdType === "none");
    saveCvdTypePref();
  });

  cvdStrengthSlider.addEventListener("input", () => {
    cvdStrength = parseFloat(cvdStrengthSlider.value) / 100;
    cvdStrengthLabel.textContent = `${cvdStrengthSlider.value}%`;
    saveCvdStrengthPref();
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveRotatePref();
  });

  calibrateBtn.addEventListener("click", openChoosePanel);
  chooseAimBtn.addEventListener("click", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    startAiming();
  });
  floatingCalibrateBtn.addEventListener("click", () => {
    hideCvOverlayPanels();
    choosePanelReturnFocusEl = null;
    startAiming();
  });
  photoBtn.addEventListener("click", takePhoto);
  recordFpsSelect.value = String(recordFps);
  recordFpsSelect.addEventListener("change", () => {
    recordFps = parseInt(recordFpsSelect.value, 10);
    try { localStorage.setItem(RECORD_FPS_KEY, String(recordFps)); } catch (e) {}
  });
  recordBtn.addEventListener("click", toggleRecording);
  floatingPhotoBtn.addEventListener("click", takePhoto);
  floatingRecordBtn.addEventListener("click", toggleRecording);
  setupDraggableCaptureBar();
  applyFloatingCapturePos();
  colourPickerInput.addEventListener("input", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    openTuneForNewPoint(cvHexToRgb01(colourPickerInput.value));
  });
  closeChooseBtn.addEventListener("click", closeChoosePanel);

  cancelAimBtn.addEventListener("click", stopAiming);

  // Tap anywhere in the camera view while aiming to move the sample point
  // there instead of it always being locked to dead-center — the reticle
  // and freeze/cancel buttons are excluded so their own taps still work.
  reticleLayer.addEventListener("click", (e) => {
    if (!aiming) return;
    if (e.target.closest && e.target.closest("#freezeBtn, #cancelAimBtn")) return;
    moveReticleTo(e.clientX, e.clientY);
  });

  freezeBtn.addEventListener("click", () => {
    const c = sampleCenterColor();
    stopAiming();
    openTuneForNewPoint(c);
  });

  [hueSlider, satSlider, lightSlider, contrastSlider, exposureSlider].forEach((el) => {
    el.addEventListener("input", refreshTunePreview);
  });
  savePointBtn.addEventListener("click", saveCvPoint);
  deletePointBtn.addEventListener("click", deleteCurrentCvPoint);
  closeTuneBtn.addEventListener("click", closeTunePanel);

  pointsBtn.addEventListener("click", () => {
    hideCvOverlayPanels();
    setSelectMode(false);
    importExportStatus.textContent = "";
    profileStatus.textContent = "";
    pointsPanel.classList.remove("hide");
    closePointsBtn.focus();
  });
  closePointsBtn.addEventListener("click", closePointsPanel);
  selectModeBtn.addEventListener("click", () => setSelectMode(!selectMode));
  deleteSelectedBtn.addEventListener("click", deleteSelected);
  clearAllBtn.addEventListener("click", clearAllPoints);

  exportBtn.addEventListener("click", exportPoints);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => {
    if (importFile.files && importFile.files[0]) {
      importPointsFromFile(importFile.files[0]);
    }
    importFile.value = "";
  });

  saveProfileBtn.addEventListener("click", saveCurrentAsProfile);
  loadProfileBtn.addEventListener("click", loadSelectedProfile);
  deleteProfileBtn.addEventListener("click", deleteSelectedProfile);
  profileNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveCurrentAsProfile();
  });

  // Best-effort hardware shutter: most browsers never forward physical
  // volume-button presses to page JavaScript at all (iOS Safari and
  // desktop never do), and even where a browser does — mainly some
  // Android/Chrome versions, especially as an installed PWA — the OS may
  // still also change the system volume alongside it. Where it works,
  // volume-down fires the current shutter mode (photo or video) and
  // volume-up switches which mode that is; the on-screen Photo/Record
  // buttons are the reliable fallback everywhere else.
  document.addEventListener("keydown", (e) => {
    const isDown = e.key === "AudioVolumeDown" || e.code === "AudioVolumeDown";
    const isUp = e.key === "AudioVolumeUp" || e.code === "AudioVolumeUp";
    if (!isDown && !isUp) return;
    if (!stream) return;
    e.preventDefault();
    if (isUp) toggleShutterMode();
    else fireShutter();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!tunePanel.classList.contains("hide")) {
      closeTunePanel();
    } else if (!pointsPanel.classList.contains("hide")) {
      closePointsPanel();
    } else if (!choosePanel.classList.contains("hide")) {
      closeChoosePanel();
    } else if (!viewerPanel.classList.contains("hide")) {
      closeViewerPanel();
    } else if (aiming) {
      stopAiming();
    }
  });

  updatePointsCount();
  renderProfileSelect();
  blendLabel.textContent = `${blendSlider.value}%`;
  spreadSlider.value = String(spread);
  spreadLabel.textContent = spreadDescription(spread);
  rotateBtn.classList.toggle("active", rotate180);
  cvdTypeSelect.value = cvdType;
  cvdStrengthSlider.value = String(Math.round(cvdStrength * 100));
  cvdStrengthLabel.textContent = `${cvdStrengthSlider.value}%`;

  // Tap the empty screen to hide/show the menu; double-tap to black out
  // the screen. Beat detection and effects (torch/vibrate/screen flash)
  // keep running underneath either way — only the visuals are hidden.
  const DOUBLE_TAP_MS = 300;
  let singleTapTimer = null;
  let lastTapAt = 0;

  function isMenuTarget(el) {
    return !!(el && el.closest && el.closest(
      "#hud, #overlay, .flash-status, #viewerPanel, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel, #floatingCaptureBar, #cameraOnlyBadge, #receiverStatusBadge"
    ));
  }

  function toggleHud() {
    hud.classList.toggle("hide");
    updateFloatingCaptureBarVisibility();
  }

  function toggleBlackout() {
    blackoutEl.classList.toggle("active");
  }

  document.body.addEventListener("click", (e) => {
    if (isMenuTarget(e.target)) return;
    const now = Date.now();
    if (now - lastTapAt < DOUBLE_TAP_MS) {
      clearTimeout(singleTapTimer);
      singleTapTimer = null;
      lastTapAt = 0;
      toggleBlackout();
    } else {
      lastTapAt = now;
      singleTapTimer = setTimeout(() => {
        toggleHud();
        lastTapAt = 0;
      }, DOUBLE_TAP_MS);
    }
  });
})();
