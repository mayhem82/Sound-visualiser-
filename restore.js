(() => {
  "use strict";

  const MAX_POINTS = 32;
  const STORAGE_KEY = "pcCalibrationPoints_v1";
  const ROTATE_KEY = "pcRotate180_v1";
  const SPREAD_KEY = "pcSpread_v1";
  const DEFAULT_SPREAD = 4;
  const SAMPLE_AREA_KEY = "pcSampleArea_v1";
  const DEFAULT_SAMPLE_AREA = 15;
  const OUTLINE_ENABLED_KEY = "outlinesEnabled_propertyColour_v1";
  const OUTLINE_THICKNESS_KEY = "outlineThickness_propertyColour_v1";
  const OUTLINE_BLEND_KEY = "outlineBlend_propertyColour_v1";
  const OUTLINE_OPACITY_KEY = "outlineOpacity_propertyColour_v1";
  const OUTLINE_DEFAULT_THICKNESS = 2;
  const OUTLINE_DEFAULT_BLEND = 1;
  const OUTLINE_DEFAULT_OPACITY = 1;
  // Public, no-signup STUN server — needed for NAT traversal even between
  // devices on the same wifi network in many router configurations. No
  // TURN relay is configured (would need a paid or self-hosted server),
  // so very restrictive networks can still block the connection.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  const stage = document.getElementById("stage");
  const video = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");
  const cameraOnlyModeCheckbox = document.getElementById("cameraOnlyModeCheckbox");
  const cameraOnlyBadge = document.getElementById("cameraOnlyBadge");
  const cameraOnlyRoomCode = document.getElementById("cameraOnlyRoomCode");
  const cameraOnlyStatusText = document.getElementById("cameraOnlyStatusText");
  const cameraOnlyStopBtn = document.getElementById("cameraOnlyStopBtn");
  const showReceiveBtn = document.getElementById("showReceiveBtn");
  const receiveForm = document.getElementById("receiveForm");
  const receiveRoomInput = document.getElementById("receiveRoomInput");
  const receiveConnectBtn = document.getElementById("receiveConnectBtn");
  const receiverStatusBadge = document.getElementById("receiverStatusBadge");

  const hud = document.getElementById("hud");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const spreadSlider = document.getElementById("spreadSlider");
  const spreadLabel = document.getElementById("spreadLabel");
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
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const pointsCount = document.getElementById("pointsCount");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const exposureModeBtn = document.getElementById("exposureModeBtn");
  const shutterWrap = document.getElementById("shutterWrap");
  const shutterSlider = document.getElementById("shutterSlider");
  const shutterLabel = document.getElementById("shutterLabel");
  const isoWrap = document.getElementById("isoWrap");
  const isoSlider = document.getElementById("isoSlider");
  const isoLabel = document.getElementById("isoLabel");
  const evWrap = document.getElementById("evWrap");
  const evSlider = document.getElementById("evSlider");
  const evLabel = document.getElementById("evLabel");
  const switchCameraBtn = document.getElementById("switchCameraBtn");
  const photoBtn = document.getElementById("photoBtn");
  const recordBtn = document.getElementById("recordBtn");
  const cameraStatus = document.getElementById("cameraStatus");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const recordingIndicatorTime = document.getElementById("recordingIndicatorTime");

  const connectTabletBtn = document.getElementById("connectTabletBtn");
  const viewerPanel = document.getElementById("viewerPanel");
  const startShareBtn = document.getElementById("startShareBtn");
  const shareCodeBlock = document.getElementById("shareCodeBlock");
  const shareRoomCode = document.getElementById("shareRoomCode");
  const shareViewUrlText = document.getElementById("shareViewUrlText");
  const viewerStatus = document.getElementById("viewerStatus");
  const closeViewerPanelBtn = document.getElementById("closeViewerPanelBtn");
  const viewerConnectedBadge = document.getElementById("viewerConnectedBadge");

  const maskBtn = document.getElementById("maskBtn");
  const maskCanvas = document.getElementById("maskCanvas");
  const maskAnalysisCanvas = document.getElementById("maskAnalysisCanvas");
  const maskLayer = document.getElementById("maskLayer");
  const maskExcludeBtn = document.getElementById("maskExcludeBtn");
  const maskRestoreBtn = document.getElementById("maskRestoreBtn");
  const maskModeBrushBtn = document.getElementById("maskModeBrushBtn");
  const maskModeSmartBtn = document.getElementById("maskModeSmartBtn");
  const maskBrushWrap = document.getElementById("maskBrushWrap");
  const maskBrushSlider = document.getElementById("maskBrushSlider");
  const maskBrushLabel = document.getElementById("maskBrushLabel");
  const maskToleranceWrap = document.getElementById("maskToleranceWrap");
  const maskToleranceSlider = document.getElementById("maskToleranceSlider");
  const maskToleranceLabel = document.getElementById("maskToleranceLabel");
  const maskHint = document.getElementById("maskHint");
  const clearMaskBtn = document.getElementById("clearMaskBtn");
  const doneMaskBtn = document.getElementById("doneMaskBtn");
  const maskActiveBadge = document.getElementById("maskActiveBadge");

  const reticleLayer = document.getElementById("reticleLayer");
  const reticle = document.getElementById("reticle");
  const reticleSwatch = document.getElementById("reticleSwatch");
  const reticleColorName = document.getElementById("reticleColorName");
  const sampleAreaSlider = document.getElementById("sampleAreaSlider");
  const sampleAreaLabel = document.getElementById("sampleAreaLabel");
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
  const categoryWallBtn = document.getElementById("categoryWallBtn");
  const categoryOtherBtn = document.getElementById("categoryOtherBtn");
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

  const choosePanel = document.getElementById("choosePanel");
  const chooseAimBtn = document.getElementById("chooseAimBtn");
  const colourPickerInput = document.getElementById("colourPickerInput");
  const presetGrid = document.getElementById("presetGrid");
  const closeChooseBtn = document.getElementById("closeChooseBtn");

  // Neutral references useful as calibration starting points for property
  // documentation — a grey card and white/black references are standard
  // photographic targets; the paint neutrals are common enough starting
  // shades to tune from. None of these are a substitute for calibrating
  // against your own actual paint chip, swatch, or matched sample.
  const REFERENCE_PRESETS = [
    { label: "Pure white reference", hex: "#ffffff" },
    { label: "18% grey card", hex: "#8a8a8a" },
    { label: "Black reference", hex: "#1a1a1a" },
    { label: "Warm white paint", hex: "#f5f0e6" },
    { label: "Cool white paint", hex: "#f0f2f5" },
    { label: "Beige / greige", hex: "#d9cfc1" },
    { label: "Taupe", hex: "#b8a99a" },
    { label: "Charcoal trim", hex: "#3a3a3a" },
    { label: "Terracotta roof tile", hex: "#b5652c" },
    { label: "Sage green trim", hex: "#8f9779" }
  ];

  // Each saved point is a real colour the user aimed at and personally tuned:
  // { id, label, sourceColor: [r,g,b 0-1], hueShift (deg), satAdjust, lightAdjust (-1..1) }.
  // The shader blends correction across the whole frame by weighting each
  // point's contribution by inverse Lab-distance from the pixel's own colour,
  // so nearby real-world colours inherit similar correction and coverage
  // improves the more points get calibrated.
  let points = loadPoints();
  let editingPointId = null;
  let frozenColor = null;
  let editingCategory = "other"; // "wall" | "other" — which the tune panel's picker is currently set to
  let tuneReturnFocusEl = null;
  let choosePanelReturnFocusEl = null;
  let aiming = false;
  let paused = false;
  let selectMode = false;
  let selectedIds = new Set();
  // Some phones (notably several Android back cameras) deliver frames
  // pre-rotated 180° at the driver/OS level — unrelated to WebGL's own
  // texture-space Y-flip, and not something we can reliably detect, so it's
  // a manual per-device toggle instead, persisted once the user sets it.
  let rotate180 = loadRotatePref();
  let spread = loadSpreadPref();
  let sampleArea = loadSampleAreaPref();
  let outlinesEnabled = (() => {
    try { return localStorage.getItem(OUTLINE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let outlineThickness = loadOutlineNumberPref(OUTLINE_THICKNESS_KEY, OUTLINE_DEFAULT_THICKNESS);
  let outlineBlend = loadOutlineNumberPref(OUTLINE_BLEND_KEY, OUTLINE_DEFAULT_BLEND);
  let outlineOpacity = loadOutlineNumberPref(OUTLINE_OPACITY_KEY, OUTLINE_DEFAULT_OPACITY);
  const maskCtx = maskCanvas.getContext("2d");
  let maskTexture = null;
  let maskDirty = true;
  let maskModeActive = false;
  let currentMaskTool = "exclude";
  let maskBrushSize = 35;
  let maskHasExclusions = false;
  let lastMaskPaintPos = null;
  let maskPaintMode = "brush";
  let smartSelectTolerance = 20;
  let torchTrack = null;
  let torchOn = false;
  let torchSupported = false;
  let exposureTrack = null;
  let currentExposureMode = "continuous";
  let exposureModeSupported = false;
  let currentStream = null;
  let videoDevices = [];
  let currentDeviceIndex = -1;
  let switchingCamera = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingMimeType = "";
  let isRecording = false;
  let recordingStartedAt = 0;
  let recordingTimerId = null;
  let gl, program, uniforms, quadBuffer, videoTexture;
  // Lazily created only once a viewer actually connects — a second,
  // colour-correction-free feed of the same camera view (orientation
  // handling included) so the viewer can show "what the camera really
  // sees" alongside the corrected view instead of just the corrected one.
  let originalCanvas = null, originalCtx = null;
  // Lazily created alongside originalCanvas — a second WebGL context
  // rendering the exact same correction pinned to full strength (blend 1.0)
  // for viewers, decoupled from the operator's own adjustable local view.
  let fixedCorrectionCanvas = null, fixedGl = null, fixedProgram = null,
    fixedUniforms = null, fixedQuadBuffer = null, fixedVideoTexture = null, fixedMaskTexture = null;
  let rafId = null;
  let aimIntervalId = null;

  // ---- Colour math (mirrors the shader's math for JS-side previews) ----

  function rgb2hsl(r, g, b) {
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

  function hsl2rgb(h, s, l) {
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

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgb2lab(r, g, b) {
    const rl = srgbToLinear(r);
    const gl_ = srgbToLinear(g);
    const bl = srgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function applyCorrection([r, g, b], hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust) {
    let [h, s, l] = rgb2hsl(r, g, b);
    h = (h + hueShift + 360) % 360;
    s = Math.min(1, Math.max(0, s + satAdjust));
    l = Math.min(1, Math.max(0, l + lightAdjust));
    let [r1, g1, b1] = hsl2rgb(h, s, l);
    // Exposure: multiplicative brightness in stops. Contrast: spread around midpoint.
    const expMul = Math.pow(2, exposureAdjust || 0);
    const contMul = 1 + (contrastAdjust || 0);
    r1 = (r1 * expMul - 0.5) * contMul + 0.5;
    g1 = (g1 * expMul - 0.5) * contMul + 0.5;
    b1 = (b1 * expMul - 0.5) * contMul + 0.5;
    return [clamp01(r1), clamp01(g1), clamp01(b1)];
  }

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function rgbToCss([r, g, b]) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  function hexToRgb01(hex) {
    const m = hex.replace("#", "");
    const r = parseInt(m.substring(0, 2), 16) / 255;
    const g = parseInt(m.substring(2, 4), 16) / 255;
    const b = parseInt(m.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  // A quick plain-language name next to every swatch — faster to read at a
  // glance than judging a colour patch, especially outdoors or on a small
  // screen.
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

  // ---- Persistence ----

  function loadPoints() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function savePoints() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch (e) {
      setStatus("Could not save (storage full or unavailable).");
    }
  }

  function loadRotatePref() {
    try {
      return localStorage.getItem(ROTATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveRotatePref() {
    try {
      localStorage.setItem(ROTATE_KEY, rotate180 ? "1" : "0");
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
  }

  function loadSpreadPref() {
    try {
      const raw = parseFloat(localStorage.getItem(SPREAD_KEY));
      return Number.isFinite(raw) ? raw : DEFAULT_SPREAD;
    } catch (e) {
      return DEFAULT_SPREAD;
    }
  }

  function saveSpreadPref() {
    try {
      localStorage.setItem(SPREAD_KEY, String(spread));
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
  }

  function spreadDescription(value) {
    if (value <= 3) return "Tight";
    if (value <= 10) return "Medium";
    if (value <= 22) return "Wide";
    return "Very wide";
  }

  function loadOutlineNumberPref(key, fallback) {
    try {
      const raw = parseFloat(localStorage.getItem(key));
      return Number.isFinite(raw) ? raw : fallback;
    } catch (e) {
      return fallback;
    }
  }
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

  function updateOutlinesUi() {
    outlinesBtn.textContent = outlinesEnabled ? "Outlines mode: On" : "Outlines mode: Off";
    outlinesBtn.classList.toggle("active", outlinesEnabled);
    outlinesBtn.setAttribute("aria-pressed", String(outlinesEnabled));
    [outlineThicknessWrap, outlineBlendWrap, outlineOpacityWrap].forEach((el) =>
      el.classList.toggle("hide", !outlinesEnabled)
    );
  }

  function toggleOutlinesMode() {
    outlinesEnabled = !outlinesEnabled;
    saveOutlinesEnabledPref();
    updateOutlinesUi();
  }

  function loadSampleAreaPref() {
    try {
      const raw = parseFloat(localStorage.getItem(SAMPLE_AREA_KEY));
      return Number.isFinite(raw) ? raw : DEFAULT_SAMPLE_AREA;
    } catch (e) {
      return DEFAULT_SAMPLE_AREA;
    }
  }

  function saveSampleAreaPref() {
    try {
      localStorage.setItem(SAMPLE_AREA_KEY, String(sampleArea));
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
  }

  function sampleAreaDescription(value) {
    if (value <= 10) return "Point";
    if (value <= 20) return "Small";
    if (value <= 35) return "Medium";
    if (value <= 50) return "Large";
    return "Very large";
  }

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  // ---- WebGL ----
  // One shader does both true and corrected colour and mixes them by uBlend,
  // rather than rendering two passes and compositing.

  const VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    varying vec2 vMaskUv;
    uniform float uRotate180;
    // Crops the video to fill the canvas without distortion ("object-fit:
    // cover") — without this, whenever the camera's native aspect ratio
    // doesn't match the screen's (routinely the case in landscape), the
    // frame gets stretched non-uniformly to fill the quad and looks
    // squished. uUvScale/uUvOffset are computed in JS from the actual
    // video and canvas dimensions each frame. The mask is painted directly
    // onto the on-screen canvas (screen-space pointer coordinates), not
    // tied to the video's own pixel aspect, so it keeps sampling the
    // uncropped UV (vMaskUv) — only the video texture crops.
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      vec2 croppedUv = uv * uUvScale + uUvOffset;
      vUv = uRotate180 > 0.5 ? (1.0 - croppedUv) : croppedUv;
      vMaskUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    varying vec2 vMaskUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform float uOutlineEnabled;
    uniform float uOutlineThickness;
    uniform float uOutlineBlend;
    uniform float uOutlineOpacity;
    uniform vec2 uTexelSize;
    uniform float uSpread;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];   // hueShift(deg), satAdjust, lightAdjust
    uniform vec2 uCorrection2[${MAX_POINTS}];  // contrastAdjust, exposureAdjust
    uniform int uCategory[${MAX_POINTS}];      // 0 = wall, 1 = other
    uniform sampler2D uMaskTex;                // painted correction mask: white=apply, black=protect

    float srgbToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
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
    // real scene edges regardless of the current blend/mask settings.
    float cvEdgeStrength(vec2 uv) {
      vec2 t = uTexelSize * max(uOutlineThickness, 0.0001);
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

    void main() {
      vec3 original = texture2D(uTex, vUv).rgb;
      vec3 correction = vec3(0.0);
      vec2 correction2 = vec2(0.0);

      if (uPointCount > 0) {
        // Two independent weighted averages (one per category), each using
        // the same Lab-distance generalisation as before — then blended
        // by which category's *nearest* point is closer, using uSpread
        // again as the softness of that classification. A pixel much
        // closer to a wall reference than any "other" one gets (almost)
        // purely the wall group's correction, and vice versa, so a
        // precisely-tuned wall colour doesn't bleed onto trim/roof/sky
        // just because a room happens to have a similar tone somewhere
        // else. With only one category in use this degenerates back to
        // exactly the original single-group weighted average.
        vec3 labP = rgb2lab(original);
        float wallWeight = 0.0, otherWeight = 0.0;
        vec3 wallSum = vec3(0.0), otherSum = vec3(0.0);
        vec2 wallSum2 = vec2(0.0), otherSum2 = vec2(0.0);
        float wallMinDist = 1.0e6, otherMinDist = 1.0e6;
        for (int i = 0; i < ${MAX_POINTS}; i++) {
          if (i >= uPointCount) break;
          float d = distance(labP, uSourceLab[i]);
          float w = 1.0 / (d * d + uSpread);
          if (uCategory[i] == 0) {
            wallSum += uCorrection[i] * w;
            wallSum2 += uCorrection2[i] * w;
            wallWeight += w;
            wallMinDist = min(wallMinDist, d);
          } else {
            otherSum += uCorrection[i] * w;
            otherSum2 += uCorrection2[i] * w;
            otherWeight += w;
            otherMinDist = min(otherMinDist, d);
          }
        }
        vec3 wallCorr = wallWeight > 0.0 ? wallSum / wallWeight : vec3(0.0);
        vec3 otherCorr = otherWeight > 0.0 ? otherSum / otherWeight : vec3(0.0);
        vec2 wallCorr2 = wallWeight > 0.0 ? wallSum2 / wallWeight : vec2(0.0);
        vec2 otherCorr2 = otherWeight > 0.0 ? otherSum2 / otherWeight : vec2(0.0);

        float wCat = wallWeight > 0.0 ? 1.0 / (wallMinDist * wallMinDist + uSpread) : 0.0;
        float oCat = otherWeight > 0.0 ? 1.0 / (otherMinDist * otherMinDist + uSpread) : 0.0;
        float totalCatWeight = wCat + oCat;
        if (totalCatWeight > 0.0) {
          correction = (wallCorr * wCat + otherCorr * oCat) / totalCatWeight;
          correction2 = (wallCorr2 * wCat + otherCorr2 * oCat) / totalCatWeight;
        }
      }

      vec3 hsl = rgb2hsl(original);
      hsl.x = mod(hsl.x + correction.x + 360.0, 360.0);
      hsl.y = clamp(hsl.y + correction.y, 0.0, 1.0);
      hsl.z = clamp(hsl.z + correction.z, 0.0, 1.0);
      vec3 corrected = hsl2rgb(hsl);

      float contMul = 1.0 + correction2.x;
      float expMul = pow(2.0, correction2.y);
      corrected = clamp((corrected * expMul - 0.5) * contMul + 0.5, 0.0, 1.0);

      float maskFactor = texture2D(uMaskTex, vMaskUv).r;
      vec3 filled = mix(original, corrected, uBlend * maskFactor);
      vec3 finalColor = filled;
      if (uOutlineEnabled > 0.5) {
        float edge = cvEdgeStrength(vUv) * uOutlineOpacity;
        vec3 outlineColor = vec3(edge);
        finalColor = mix(filled, outlineColor, uOutlineBlend);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function compileShaderFor(glCtx, type, src) {
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

  // Builds a fresh WebGL context + compiled program + quad + video/mask
  // textures on the given canvas, running the same correction shader as the
  // main stage. Used both for the main on-screen stage and for a second,
  // off-screen context that always renders at full correction (see
  // ensureFixedCorrectionCanvas) — a canvas.captureStream() can only ever
  // reflect one canvas's content, so showing the operator's own live
  // (adjustable) view and sending a fixed one to viewers means rendering
  // to two separate canvases, each with its own WebGL context.
  function initGLContext(canvas) {
    // preserveDrawingBuffer is needed for the photo/video capture buttons:
    // without it the browser is free to clear the backbuffer right after
    // compositing, and a toDataURL()/toBlob() call outside the render loop
    // (or captureStream() picking up a stale frame) can read back nothing.
    const glCtx = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) ||
      canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!glCtx) throw new Error("WebGL not supported on this device/browser.");

    const vs = compileShaderFor(glCtx, glCtx.VERTEX_SHADER, VERT_SRC);
    const fs = compileShaderFor(glCtx, glCtx.FRAGMENT_SHADER, FRAG_SRC);
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
      throw new Error("Program link error: " + glCtx.getProgramInfoLog(prog));
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
    // Video frames upload top-row-first, but WebGL texture space has its
    // origin at the bottom-left, so without this every frame renders upside-down.
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);

    const maskTex = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, maskTex);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);
    // A 1x1 fully-white pixel is a no-op mask (uMaskTex sampled anywhere
    // returns 1.0) so correction behaves exactly as before until the real
    // mask canvas gets uploaded.
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, 1, 1, 0, glCtx.RGBA, glCtx.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    const uni = {
      uTex: glCtx.getUniformLocation(prog, "uTex"),
      uBlend: glCtx.getUniformLocation(prog, "uBlend"),
      uOutlineEnabled: glCtx.getUniformLocation(prog, "uOutlineEnabled"),
      uOutlineThickness: glCtx.getUniformLocation(prog, "uOutlineThickness"),
      uOutlineBlend: glCtx.getUniformLocation(prog, "uOutlineBlend"),
      uOutlineOpacity: glCtx.getUniformLocation(prog, "uOutlineOpacity"),
      uTexelSize: glCtx.getUniformLocation(prog, "uTexelSize"),
      uSpread: glCtx.getUniformLocation(prog, "uSpread"),
      uRotate180: glCtx.getUniformLocation(prog, "uRotate180"),
      uUvScale: glCtx.getUniformLocation(prog, "uUvScale"),
      uUvOffset: glCtx.getUniformLocation(prog, "uUvOffset"),
      uPointCount: glCtx.getUniformLocation(prog, "uPointCount"),
      uSourceLab: glCtx.getUniformLocation(prog, "uSourceLab"),
      uCorrection: glCtx.getUniformLocation(prog, "uCorrection"),
      uCorrection2: glCtx.getUniformLocation(prog, "uCorrection2"),
      uCategory: glCtx.getUniformLocation(prog, "uCategory"),
      uMaskTex: glCtx.getUniformLocation(prog, "uMaskTex")
    };
    return { gl: glCtx, program: prog, uniforms: uni, quadBuffer: qBuf, videoTexture: tex, maskTexture: maskTex };
  }

  function initGL() {
    const ctxState = initGLContext(stage);
    gl = ctxState.gl;
    program = ctxState.program;
    uniforms = ctxState.uniforms;
    quadBuffer = ctxState.quadBuffer;
    videoTexture = ctxState.videoTexture;
    maskTexture = ctxState.maskTexture;
  }

  function resizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.round(window.innerWidth * dpr);
    stage.height = Math.round(window.innerHeight * dpr);
    if (gl) gl.viewport(0, 0, stage.width, stage.height);
    if (originalCanvas) {
      originalCanvas.width = stage.width;
      originalCanvas.height = stage.height;
    }
    if (fixedCorrectionCanvas) {
      fixedCorrectionCanvas.width = stage.width;
      fixedCorrectionCanvas.height = stage.height;
      fixedGl.viewport(0, 0, fixedCorrectionCanvas.width, fixedCorrectionCanvas.height);
    }
  }

  function ensureOriginalCanvas() {
    if (originalCanvas) return;
    originalCanvas = document.createElement("canvas");
    originalCanvas.width = stage.width;
    originalCanvas.height = stage.height;
    // Off-screen but still in the document and not display:none — some
    // browsers (notably WebKit) throttle or stop updating captureStream()
    // output from a canvas that's display:none or never painted.
    originalCanvas.style.position = "fixed";
    originalCanvas.style.left = "-99999px";
    originalCanvas.style.top = "0";
    document.body.appendChild(originalCanvas);
    originalCtx = originalCanvas.getContext("2d");
  }

  // A second, independent render of the exact same correction — same
  // calibrated points, mask, spread, rotation — except uBlend is always
  // 1.0 here, regardless of the operator's own "True <-> Corrected" slider
  // on the main stage. That slider is for locally previewing how strong
  // the correction looks; what gets sent to a viewer as "Modified" should
  // always be the full correction, not whatever the operator happens to be
  // locally scrubbing through.
  function ensureFixedCorrectionCanvas() {
    if (fixedCorrectionCanvas) return;
    fixedCorrectionCanvas = document.createElement("canvas");
    fixedCorrectionCanvas.width = stage.width;
    fixedCorrectionCanvas.height = stage.height;
    fixedCorrectionCanvas.style.position = "fixed";
    fixedCorrectionCanvas.style.left = "-99999px";
    fixedCorrectionCanvas.style.top = "0";
    document.body.appendChild(fixedCorrectionCanvas);
    const ctxState = initGLContext(fixedCorrectionCanvas);
    fixedGl = ctxState.gl;
    fixedProgram = ctxState.program;
    fixedUniforms = ctxState.uniforms;
    fixedQuadBuffer = ctxState.quadBuffer;
    fixedVideoTexture = ctxState.videoTexture;
    fixedMaskTexture = ctxState.maskTexture;
    fixedGl.viewport(0, 0, fixedCorrectionCanvas.width, fixedCorrectionCanvas.height);
    uploadPointUniforms();
    maskDirty = true; // force the mask onto the new context's texture next frame
  }

  // Resizing a canvas clears its bitmap, which would silently wipe a
  // painted mask on orientation change or window resize — so the
  // existing content is snapshotted and rescaled onto the new size
  // instead of just wiped.
  function resizeMaskCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const newW = Math.round(window.innerWidth * dpr);
    const newH = Math.round(window.innerHeight * dpr);
    if (maskCanvas.width === newW && maskCanvas.height === newH) return;
    const hadContent = maskCanvas.width > 0 && maskCanvas.height > 0;
    let snapshot = null;
    if (hadContent) {
      snapshot = document.createElement("canvas");
      snapshot.width = maskCanvas.width;
      snapshot.height = maskCanvas.height;
      snapshot.getContext("2d").drawImage(maskCanvas, 0, 0);
    }
    maskCanvas.width = newW;
    maskCanvas.height = newH;
    maskCtx.fillStyle = "#ffffff";
    maskCtx.fillRect(0, 0, newW, newH);
    if (snapshot) maskCtx.drawImage(snapshot, 0, 0, newW, newH);
    maskDirty = true;
  }

  function uploadPointUniformsTo(glCtx, prog, uni) {
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    const catArr = new Int32Array(MAX_POINTS);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = rgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
      corr2Arr[i * 2] = p.contrastAdjust || 0; corr2Arr[i * 2 + 1] = p.exposureAdjust || 0;
      catArr[i] = p.category === "wall" ? 0 : 1;
    }
    glCtx.useProgram(prog);
    glCtx.uniform1i(uni.uPointCount, count);
    glCtx.uniform3fv(uni.uSourceLab, labArr);
    glCtx.uniform3fv(uni.uCorrection, corrArr);
    glCtx.uniform2fv(uni.uCorrection2, corr2Arr);
    glCtx.uniform1iv(uni.uCategory, catArr);
  }

  function uploadPointUniforms() {
    uploadPointUniformsTo(gl, program, uniforms);
    if (fixedGl) uploadPointUniformsTo(fixedGl, fixedProgram, fixedUniforms);
  }

  // "object-fit: cover" for the video-in-canvas draws below: crops
  // whichever axis the video overhangs on, so the frame always fills the
  // canvas without distorting — otherwise a camera aspect ratio that
  // doesn't match the screen's (routinely the case in landscape) gets
  // stretched non-uniformly and looks squished. Only applied to the video
  // texture, not the mask (see uMaskTex/vMaskUv above).
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

  function renderLoop() {
    if (!paused && video.readyState >= video.HAVE_CURRENT_DATA) {
      // Captured once so both the main and fixed-correction contexts (if
      // the latter exists) get a chance to re-upload the mask on the same
      // frame it changed — maskDirty itself is only cleared once, below,
      // after both have had that chance.
      const shouldUploadMask = maskDirty;
      const cover = computeCoverUv(video.videoWidth, video.videoHeight, stage.width, stage.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);

      // Only re-uploaded when the mask has actually changed (maskDirty),
      // to avoid paying a texture upload every single frame for a canvas
      // that usually isn't being painted on.
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      if (shouldUploadMask) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
      }
      gl.uniform1i(uniforms.uMaskTex, 1);

      gl.uniform1f(uniforms.uBlend, parseFloat(blendSlider.value) / 100);
      gl.uniform1f(uniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uOutlineThickness, outlineThickness);
      gl.uniform1f(uniforms.uOutlineBlend, outlineBlend);
      gl.uniform1f(uniforms.uOutlineOpacity, outlineOpacity);
      gl.uniform2f(uniforms.uTexelSize, 1 / video.videoWidth, 1 / video.videoHeight);
      gl.uniform1f(uniforms.uSpread, spread);
      gl.uniform1f(uniforms.uRotate180, rotate180 ? 1 : 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (originalCtx) {
        // Same cover-crop as the main draw above, computed directly as a
        // source rect in video pixels since this is a 2D canvas rather
        // than a shader — and same rotate180 handling, so the two stay in
        // matching orientation and framing side by side.
        const vw = video.videoWidth, vh = video.videoHeight;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        const videoAspect = vw / vh;
        const canvasAspect = originalCanvas.width / originalCanvas.height;
        if (videoAspect > canvasAspect) {
          sw = vh * canvasAspect;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / canvasAspect;
          sy = (vh - sh) / 2;
        }
        originalCtx.save();
        if (rotate180) {
          originalCtx.translate(originalCanvas.width, originalCanvas.height);
          originalCtx.rotate(Math.PI);
        }
        originalCtx.drawImage(video, sx, sy, sw, sh, 0, 0, originalCanvas.width, originalCanvas.height);
        originalCtx.restore();
      }

      if (fixedGl) {
        // Same correction as the main draw above (points, mask, spread,
        // rotation, cover-crop) — the only deliberate difference is uBlend
        // pinned to 1.0 instead of following the local blendSlider, so
        // what's shared to a viewer is always the full correction
        // regardless of what the operator is locally previewing.
        fixedGl.activeTexture(fixedGl.TEXTURE0);
        fixedGl.bindTexture(fixedGl.TEXTURE_2D, fixedVideoTexture);
        fixedGl.texImage2D(fixedGl.TEXTURE_2D, 0, fixedGl.RGBA, fixedGl.RGBA, fixedGl.UNSIGNED_BYTE, video);
        fixedGl.uniform1i(fixedUniforms.uTex, 0);

        fixedGl.activeTexture(fixedGl.TEXTURE1);
        fixedGl.bindTexture(fixedGl.TEXTURE_2D, fixedMaskTexture);
        if (shouldUploadMask) {
          fixedGl.texImage2D(fixedGl.TEXTURE_2D, 0, fixedGl.RGBA, fixedGl.RGBA, fixedGl.UNSIGNED_BYTE, maskCanvas);
        }
        fixedGl.uniform1i(fixedUniforms.uMaskTex, 1);

        fixedGl.uniform1f(fixedUniforms.uBlend, 1);
        fixedGl.uniform1f(fixedUniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uOutlineThickness, outlineThickness);
        fixedGl.uniform1f(fixedUniforms.uOutlineBlend, outlineBlend);
        fixedGl.uniform1f(fixedUniforms.uOutlineOpacity, outlineOpacity);
        fixedGl.uniform2f(fixedUniforms.uTexelSize, 1 / video.videoWidth, 1 / video.videoHeight);
        fixedGl.uniform1f(fixedUniforms.uSpread, spread);
        fixedGl.uniform1f(fixedUniforms.uRotate180, rotate180 ? 1 : 0);
        fixedGl.uniform2f(fixedUniforms.uUvScale, cover.sx, cover.sy);
        fixedGl.uniform2f(fixedUniforms.uUvOffset, cover.ox, cover.oy);
        fixedGl.drawArrays(fixedGl.TRIANGLE_STRIP, 0, 4);
      }

      if (shouldUploadMask) maskDirty = false;
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  // ---- Camera ----

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      await attachStream(stream);
      resizeStage();
      resizeMaskCanvas();
      initGL();
      uploadPointUniforms();
      renderLoop();
      refreshVideoDevices();
      if (cameraOnlyModeCheckbox.checked) {
        await enterCameraOnlyMode();
      } else {
        overlay.classList.add("hide");
        hud.classList.remove("hide");
      }
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  // ---- Camera-only broadcast mode ----
  // For a two-device setup: this device just points at the property and
  // streams its raw feed, with no controls of its own to fumble with once
  // it's mounted on a tripod. All calibration/correction/control happens
  // on whichever other device connects via "Receive camera from another
  // device" (see connectAsReceiver below) — that device gets the raw feed
  // and runs its own full local correction pipeline against it, same as
  // if it had its own camera.
  //
  // The camera view itself stays fully visible the whole time — this only
  // hides the *overlay* (start screen), same as a normal local start, and
  // shows a small non-blocking corner badge with the room code instead of
  // the full control HUD. The phone remains useful as its own monitor.
  async function enterCameraOnlyMode() {
    overlay.classList.add("hide");
    cameraOnlyBadge.classList.remove("hide");
    cameraOnlyStatusText.textContent = "Connecting to relay…";
    await startTabletShare();
  }

  function exitCameraOnlyMode() {
    stopTabletShare("");
    cameraOnlyBadge.classList.add("hide");
    hud.classList.remove("hide");
  }

  async function attachStream(stream) {
    currentStream = stream;
    video.srcObject = stream;
    await video.play();
    const track = stream.getVideoTracks()[0];
    setupTorch(track);
    setupExposure(track);
  }

  function stopCurrentStream() {
    if (!currentStream) return;
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  function showCameraStatus(msg) {
    cameraStatus.textContent = msg;
    cameraStatus.classList.remove("hide");
  }

  function hideCameraStatus() {
    cameraStatus.classList.add("hide");
    cameraStatus.textContent = "";
  }

  // ---- Camera switching ----
  // Phones commonly expose more than the simple front/back pair (extra
  // wide, telephoto, multiple back lenses), so devices are enumerated and
  // cycled by deviceId rather than just flipping a front/back facingMode.

  async function refreshVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      switchCameraBtn.classList.toggle("hide", videoDevices.length <= 1);
      const track = currentStream && currentStream.getVideoTracks()[0];
      const activeId = track && track.getSettings ? track.getSettings().deviceId : null;
      currentDeviceIndex = activeId ? videoDevices.findIndex((d) => d.deviceId === activeId) : -1;
      if (currentDeviceIndex === -1) currentDeviceIndex = 0;
    } catch (err) {
      switchCameraBtn.classList.add("hide");
    }
  }

  async function switchCamera() {
    if (videoDevices.length <= 1 || switchingCamera) return;
    switchingCamera = true;
    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    // Release the current camera before requesting the next one. Many
    // phones — especially Android — refuse or silently fail a second
    // concurrent camera open, so grabbing the new stream while the old
    // one is still held (the previous ordering here) could fail on real
    // hardware even though it works fine against a single mocked device.
    stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false
      });
      await attachStream(stream);
      currentDeviceIndex = nextIndex;
      hideCameraStatus();
      await refreshVideoDevices();
    } catch (err) {
      showCameraStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
      // The old camera is already released at this point — try to recover
      // some feed rather than leave the screen dark.
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        await attachStream(fallback);
        await refreshVideoDevices();
      } catch (err2) {
        showCameraStatus("Camera lost — reload the page to reconnect.");
      }
    } finally {
      switchingCamera = false;
    }
  }

  // ---- Flashlight (torch) ----
  // The torch constraint is only exposed on some Android/Chrome-based
  // environment-facing cameras — not iOS Safari, not desktops without a
  // torch-capable camera — so the button only appears once capability is
  // actually confirmed on the live track, rather than assumed.

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
      // Commonly fires when the screen locks or the tab loses focus, which
      // can end the camera connection outright — the torch goes with it.
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
      // Some devices report the capability but reject the constraint in
      // practice — stop offering it rather than leave a dead button.
      torchSupported = false;
      torchBtn.classList.add("hide");
    }
  }

  // ---- Manual exposure ----
  // Auto-exposure constantly re-adjusts brightness in response to the
  // scene, which can shift how a colour reads from one moment to the next
  // — locking it down keeps the corrected view (and the reference colour
  // it's matched against) consistent instead of drifting as the camera
  // hunts for exposure. Same capability-detection pattern as the torch:
  // only exposed on some Android/Chrome-based cameras, not iOS Safari.

  function setupExposure(track) {
    exposureTrack = track;
    currentExposureMode = "continuous";
    exposureModeSupported = false;
    exposureModeBtn.classList.add("hide");
    exposureModeBtn.classList.remove("active");
    exposureModeBtn.setAttribute("aria-pressed", "false");
    exposureModeBtn.textContent = "Exposure: Auto";
    shutterWrap.classList.add("hide");
    isoWrap.classList.add("hide");
    evWrap.classList.add("hide");

    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const settings = track.getSettings ? track.getSettings() : {};

    exposureModeSupported = Array.isArray(caps.exposureMode) && caps.exposureMode.includes("manual");
    exposureModeBtn.classList.toggle("hide", !exposureModeSupported);

    if (caps.exposureTime) {
      shutterSlider.min = caps.exposureTime.min;
      shutterSlider.max = caps.exposureTime.max;
      shutterSlider.step = caps.exposureTime.step || 1;
      shutterSlider.value = settings.exposureTime != null ? settings.exposureTime : caps.exposureTime.min;
      shutterLabel.textContent = shutterSlider.value;
      shutterWrap.classList.remove("hide");
    }
    if (caps.iso) {
      isoSlider.min = caps.iso.min;
      isoSlider.max = caps.iso.max;
      isoSlider.step = caps.iso.step || 1;
      isoSlider.value = settings.iso != null ? settings.iso : caps.iso.min;
      isoLabel.textContent = isoSlider.value;
      isoWrap.classList.remove("hide");
    }
    if (caps.exposureCompensation) {
      evSlider.min = caps.exposureCompensation.min;
      evSlider.max = caps.exposureCompensation.max;
      evSlider.step = caps.exposureCompensation.step || 0.1;
      evSlider.value = settings.exposureCompensation != null ? settings.exposureCompensation : 0;
      evLabel.textContent = evSlider.value;
      evWrap.classList.remove("hide");
    }

    track.addEventListener("ended", () => {
      // Same reasoning as the torch's own "ended" handler — the controls
      // go with the track that stops backing them.
      exposureModeSupported = false;
      exposureModeBtn.classList.add("hide");
      shutterWrap.classList.add("hide");
      isoWrap.classList.add("hide");
      evWrap.classList.add("hide");
    });
  }

  async function setExposureMode(mode) {
    if (!exposureTrack) return;
    try {
      await exposureTrack.applyConstraints({ advanced: [{ exposureMode: mode }] });
      currentExposureMode = mode;
    } catch (err) {
      // Device advertised the mode but rejected switching to it — leave
      // the UI reflecting whatever actually took effect below.
    }
    exposureModeBtn.textContent = "Exposure: " + (currentExposureMode === "manual" ? "Manual" : "Auto");
    exposureModeBtn.classList.toggle("active", currentExposureMode === "manual");
    exposureModeBtn.setAttribute("aria-pressed", String(currentExposureMode === "manual"));
  }

  function toggleExposureMode() {
    if (!exposureModeSupported) return;
    setExposureMode(currentExposureMode === "manual" ? "continuous" : "manual");
  }

  async function applyShutter() {
    shutterLabel.textContent = shutterSlider.value;
    if (!exposureTrack) return;
    if (currentExposureMode !== "manual") await setExposureMode("manual");
    try {
      await exposureTrack.applyConstraints({ advanced: [{ exposureTime: parseFloat(shutterSlider.value) }] });
    } catch (err) {}
  }

  async function applyIso() {
    isoLabel.textContent = isoSlider.value;
    if (!exposureTrack) return;
    if (currentExposureMode !== "manual") await setExposureMode("manual");
    try {
      await exposureTrack.applyConstraints({ advanced: [{ iso: parseFloat(isoSlider.value) }] });
    } catch (err) {}
  }

  async function applyExposureCompensation() {
    evLabel.textContent = evSlider.value;
    if (!exposureTrack) return;
    // Unlike shutter/ISO, exposure compensation is meaningful in auto mode
    // too (it's what an EV +/- dial does on a regular camera), so this one
    // doesn't force a switch to manual.
    try {
      await exposureTrack.applyConstraints({ advanced: [{ exposureCompensation: parseFloat(evSlider.value) }] });
    } catch (err) {}
  }

  // ---- Photo & video capture ----
  // Captures the fully-composited stage canvas — true/corrected blend and
  // per-point calibration all baked in — exactly what's currently on
  // screen, not a re-render.

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // Programmatic a.click() still dispatches a real, bubbling click event.
    // Without this it reaches the tap-to-hide-HUD listener on document.body
    // (the anchor is outside every excluded container) and silently closes
    // the HUD right after every photo, video, or export download.
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
    if (!gl) return;
    stage.toBlob((blob) => {
      if (!blob) {
        showCameraStatus("Couldn't capture a photo — try again.");
        return;
      }
      downloadBlob(blob, `property-colour-photo-${timestampForFilename()}.png`);
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
    recordingIndicatorTime.textContent = `${mm}:${ss}`;
  }

  function startRecording() {
    if (isRecording || !gl || typeof stage.captureStream !== "function") return;
    recordingMimeType = pickRecordingMimeType();
    if (!recordingMimeType) {
      showCameraStatus("Video recording isn't supported in this browser.");
      return;
    }
    let canvasStream;
    try {
      canvasStream = stage.captureStream(30);
    } catch (err) {
      showCameraStatus("Couldn't start recording: " + (err.message || err.name || "unknown error"));
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
        downloadBlob(blob, `property-colour-video-${timestampForFilename()}.${ext}`);
      } else {
        showCameraStatus("Recording produced no data — try again.");
      }
    });
    mediaRecorder.start();
    isRecording = true;
    recordingStartedAt = Date.now();
    recordBtn.classList.add("recording");
    recordBtn.setAttribute("aria-pressed", "true");
    recordingIndicator.classList.remove("hide");
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
    recordingIndicator.classList.add("hide");
    if (recordingTimerId) { clearInterval(recordingTimerId); recordingTimerId = null; }
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  // ---- Tablet viewer (WebRTC, signaled over public MQTT relays) ----
  // Streams the same fully-composited stage canvas used for photo/video
  // capture to a second device (e.g. a tablet, or a client watching along)
  // as a read-only viewer. The video itself is still direct peer-to-peer
  // WebRTC — no backend needed for that — but the one-time offer/answer
  // handshake used to be a manual copy/paste of an SDP blob, which doesn't
  // work between two unrelated devices with no clipboard sync between
  // them. Instead, a short room code is generated here and the handshake
  // rides a few public MQTT-over-websocket brokers (retained messages,
  // addressed by device ID so other rooms' traffic is ignored) — the
  // other device only has to type in a 5-character code. viewer.html is
  // the minimal read-only page that receives it. Same pattern as the
  // live-sharing feature in this author's darts scorer app.

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
    // Lets a connected viewer remote-control the camera-switch button —
    // useful when the phone is mounted or otherwise out of easy reach.
    // switchCamera() already no-ops if there's only one camera or a
    // switch is already in progress.
    if (msg.type === "switch-camera" && msg.to === broadcastShare.deviceId) switchCamera();
  }

  // Mirrors broadcast status into both the normal "Connect tablet" panel
  // (viewerStatus) and the camera-only mode's own standalone panel
  // (cameraOnlyStatusText, only ever shown in camera-only mode) — whichever
  // one the operator is actually looking at stays in sync automatically.
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
    if (!gl || typeof stage.captureStream !== "function") {
      setViewerStatus("Viewer streaming isn't supported in this browser.");
      return;
    }
    ensureOriginalCanvas();
    ensureFixedCorrectionCanvas();

    const entry = { pc: null };
    broadcastShare.peers.set(viewerId, entry);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    entry.pc = pc;
    // Two separate MediaStreams (not two tracks on one stream — a <video>
    // element only ever renders one video track per stream) so the viewer
    // can tell them apart and show both at once, original alongside
    // corrected. WebRTC preserves each MediaStream's id end-to-end (it's
    // part of the SDP as the track's msid), so that id — sent as plain
    // metadata on the offer below — is what the viewer matches against,
    // rather than guessing from which track event fires first.
    // correctedStream comes from fixedCorrectionCanvas (always full
    // correction), not the main stage — the stage reflects whatever the
    // operator's own local blend slider is currently set to, which is for
    // local preview only and shouldn't affect what a viewer sees.
    const correctedStream = fixedCorrectionCanvas.captureStream(30);
    const originalStream = originalCanvas.captureStream(30);
    correctedStream.getTracks().forEach((t) => pc.addTrack(t, correctedStream));
    originalStream.getTracks().forEach((t) => pc.addTrack(t, originalStream));

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
        correctedStreamId: correctedStream.id,
        originalStreamId: originalStream.id
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
    // The same answer can arrive again (multiple relays, or the viewer's
    // heartbeat firing again before its own connection state updates)
    // right as the first delivery is still resolving — signalingState
    // hasn't caught up yet, so the guard above can't catch it. Harmless;
    // just ignore the redundant attempt.
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

  // ---- Receiving a camera feed from another device ----
  // The reverse of "Connect tablet" above: this is the *answerer* side of
  // the same room-code/WebRTC pairing, but instead of displaying the
  // incoming video read-only (like viewer.html does), the "original"
  // (raw, uncorrected) track becomes this page's own video source — so
  // the whole existing calibration/correction pipeline below runs against
  // it exactly as if it came from a local camera. Lets one device (e.g. a
  // phone on a tripod, in camera-only mode above) just point at the
  // property while another device (e.g. a tablet on a table) does all the
  // calibration and shows clients the result.
  let receiverConnection = null;
  let isReceiverMode = false;
  let receiverStarted = false;

  // Mirrors receiver-side status into a small badge that stays visible
  // even after the start overlay hides (setStatus()'s own #status element
  // lives inside #panel, inside #overlay — invisible once connected) so
  // the connection/error state stays visible for troubleshooting instead
  // of silently going dark the moment the overlay hides.
  function setReceiverStatus(text) {
    setStatus(text);
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
    let hostId = null;

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
      hostId = msg.from;
      console.log("[receiver] offer received from camera device", { correctedStreamId: pendingIds.corrected, originalStreamId: pendingIds.original });
      setReceiverStatus("Camera device found — connecting…");

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.addEventListener("track", (e) => {
        const streamId = e.streams[0] && e.streams[0].id;
        console.log("[receiver] track event", { streamId, matchesOriginal: !pendingIds || !pendingIds.original || streamId === pendingIds.original });
        // Only the raw/original feed matters — correction happens locally
        // on this device, not on the camera device's.
        if (pendingIds && pendingIds.original && streamId !== pendingIds.original) return;
        video.srcObject = e.streams[0];
        video.play().catch((err) => console.log("[receiver] video.play() failed", err));
        finishReceiverStart();
      });

      pc.addEventListener("connectionstatechange", () => {
        if (!pc || torn) return;
        console.log("[receiver] connectionState:", pc.connectionState);
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
        console.log("[receiver] handleOffer failed", err);
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
        console.log("[receiver] subscribing for room", room, "topic", topic);
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
      // Remote-controls the camera device's own switch-camera button
      // (already listened for there — see handleBroadcastSignal above) —
      // useful when it's mounted or otherwise out of easy reach. No-ops on
      // the other end if it only has one camera.
      switchRemoteCamera() {
        publish({ type: "switch-camera", to: hostId });
      },
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
    console.log("[receiver] finishReceiverStart() running — revealing HUD");
    setReceiverStatus("Receiving from camera device.");
    overlay.classList.add("hide");
    hud.classList.remove("hide");
    resizeStage();
    resizeMaskCanvas();
    initGL();
    uploadPointUniforms();
    renderLoop();
    applyReceiverModeUi();
  }

  function applyReceiverModeUi() {
    // No local camera hardware on this device to control — these only
    // make sense for a camera physically attached to it.
    torchBtn.classList.add("hide");
    exposureModeBtn.classList.add("hide");
    shutterWrap.classList.add("hide");
    isoWrap.classList.add("hide");
    evWrap.classList.add("hide");
    // Broadcasting further from a receiving device isn't supported — keeps
    // a two-device setup to exactly two devices.
    connectTabletBtn.classList.add("hide");
    // Repurposed below to remote-control the camera device's lens instead
    // of switching this device's own (nonexistent) camera.
    switchCameraBtn.classList.remove("hide");
    switchCameraBtn.title = "Remotely switch the camera device's lens (no-op if it only has one).";
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
  // the render loop that feeds the shared canvases, so backgrounding this
  // tab (e.g. switching to the viewer in a second tab on the same phone)
  // makes the connected viewer's screen freeze or go blank even though the
  // WebRTC connection itself is still "connected". Surfacing that here is
  // the most this page can do about it — there's no way for a background
  // tab to force full-rate rendering.
  document.addEventListener("visibilitychange", () => {
    if (!broadcastShare.active) return;
    if (document.hidden) {
      setViewerStatus("This tab is in the background — the shared view will freeze until it's active again.");
    } else {
      const anyConnected = Array.from(broadcastShare.peers.values()).some(
        (entry) => entry.pc && entry.pc.connectionState === "connected"
      );
      setViewerStatus(anyConnected ? "Tablet connected." : "Waiting for a tablet to connect…");
      updateViewerConnectedBadge();
    }
  });

  function openViewerPanel() {
    hideOverlayPanels();
    viewerPanel.classList.remove("hide");
    closeViewerPanelBtn.focus();
  }

  function closeViewerPanel() {
    viewerPanel.classList.add("hide");
    connectTabletBtn.focus();
  }

  // ---- Correction mask ----
  // Colour-proximity blending alone can't separate two physically
  // different surfaces that happen to be similar shades (e.g. a wall and
  // a similarly off-white ceiling) — the mask adds a spatial layer on top:
  // paint over an area to protect it from any correction regardless of
  // colour. The mask canvas itself doubles as both the paint surface and
  // the WebGL mask texture source (white = corrected normally, painted
  // dark = protected), and is displayed directly over the stage via
  // mix-blend-mode while painting so the darkened areas are the preview.

  function maskBrushDescription(value) {
    if (value <= 25) return "Small";
    if (value <= 60) return "Medium";
    return "Large";
  }

  function maskToleranceDescription(value) {
    if (value <= 12) return "Tight";
    if (value <= 30) return "Medium";
    return "Loose";
  }

  function paintMaskAt(x, y, tool) {
    const radius = maskBrushSize * (maskCanvas.width / window.innerWidth);
    const grad = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
    if (tool === "exclude") {
      grad.addColorStop(0, "rgba(0,0,0,0.35)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      maskHasExclusions = true;
    } else {
      grad.addColorStop(0, "rgba(255,255,255,0.4)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
    }
    maskCtx.fillStyle = grad;
    maskCtx.beginPath();
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
    maskDirty = true;
  }

  function maskPointerToCanvasCoords(e) {
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  }

  function handleMaskPointerDown(e) {
    if (!maskModeActive) return;
    e.preventDefault();
    const [x, y] = maskPointerToCanvasCoords(e);
    if (maskPaintMode === "smart") {
      runSmartSelect(x, y);
      return;
    }
    if (maskCanvas.setPointerCapture) maskCanvas.setPointerCapture(e.pointerId);
    lastMaskPaintPos = [x, y];
    paintMaskAt(x, y, currentMaskTool);
  }

  function handleMaskPointerMove(e) {
    if (!maskModeActive || maskPaintMode !== "brush" || !lastMaskPaintPos) return;
    e.preventDefault();
    const [x, y] = maskPointerToCanvasCoords(e);
    const [lx, ly] = lastMaskPaintPos;
    const radiusPx = maskBrushSize * (maskCanvas.width / window.innerWidth);
    const dist = Math.hypot(x - lx, y - ly);
    const step = Math.max(4, radiusPx / 4);
    const steps = Math.max(1, Math.floor(dist / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      paintMaskAt(lx + (x - lx) * t, ly + (y - ly) * t, currentMaskTool);
    }
    lastMaskPaintPos = [x, y];
  }

  function handleMaskPointerUp() {
    lastMaskPaintPos = null;
    updateMaskActiveBadge();
  }

  function updateMaskActiveBadge() {
    maskActiveBadge.classList.toggle("hide", !maskHasExclusions);
  }

  function setMaskTool(tool) {
    currentMaskTool = tool;
    maskExcludeBtn.setAttribute("aria-pressed", String(tool === "exclude"));
    maskRestoreBtn.setAttribute("aria-pressed", String(tool === "restore"));
  }

  function setMaskPaintMode(mode) {
    maskPaintMode = mode;
    lastMaskPaintPos = null;
    maskModeBrushBtn.setAttribute("aria-pressed", String(mode === "brush"));
    maskModeSmartBtn.setAttribute("aria-pressed", String(mode === "smart"));
    maskBrushWrap.classList.toggle("hide", mode !== "brush");
    maskToleranceWrap.classList.toggle("hide", mode !== "smart");
    maskHint.textContent = mode === "smart"
      ? "Tap once inside a surface (like a ceiling) to auto-select the whole area — it follows real edges, not just colour."
      : "Paint over areas to exclude them from any correction — dark areas are protected. The view is paused while you paint.";
  }

  // Draws the current paused frame into the analysis canvas at a reduced
  // resolution, applying the same 180° flip as rotate180 so its pixel grid
  // lines up with what's actually on screen (and therefore with mask
  // canvas coordinates) without needing to reverse-engineer the shader's
  // own UV math.
  function captureAnalysisFrame() {
    const maxDim = 260;
    const aspect = video.videoWidth / video.videoHeight || 1;
    const aw = aspect >= 1 ? maxDim : Math.max(1, Math.round(maxDim * aspect));
    const ah = aspect >= 1 ? Math.max(1, Math.round(maxDim / aspect)) : maxDim;
    maskAnalysisCanvas.width = aw;
    maskAnalysisCanvas.height = ah;
    const actx = maskAnalysisCanvas.getContext("2d", { willReadFrequently: true });
    actx.save();
    if (rotate180) {
      actx.translate(aw, ah);
      actx.rotate(Math.PI);
    }
    actx.drawImage(video, 0, 0, aw, ah);
    actx.restore();
    return { ctx: actx, width: aw, height: ah };
  }

  // Classic flood-fill / "magic wand" selection: each candidate pixel is
  // compared to its already-included NEIGHBOUR (not the original seed
  // colour), in Lab space for a perceptually meaningful distance. That
  // local comparison is what lets it follow a smooth gradient across one
  // surface (a shadow falling across the same wall) while still stopping
  // at a real edge (the wall-to-ceiling boundary), rather than either
  // fragmenting on every shadow or spilling across onto a similar colour
  // that happens to be a different surface.
  function floodFillFromPoint(imageData, w, h, startX, startY, toleranceLab) {
    const data = imageData.data;
    const visited = new Uint8Array(w * h);
    const included = new Uint8Array(w * h);
    const labCache = new Map();

    function labAt(idx, x, y) {
      let v = labCache.get(idx);
      if (!v) {
        const i = idx * 4;
        v = rgb2lab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
        labCache.set(idx, v);
      }
      return v;
    }

    const startIdx = startY * w + startX;
    visited[startIdx] = 1;
    included[startIdx] = 1;
    const stack = [[startX, startY]];

    while (stack.length) {
      const [cx, cy] = stack.pop();
      const cLab = labAt(cy * w + cx, cx, cy);
      const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (visited[nIdx]) continue;
        visited[nIdx] = 1;
        const nLab = labAt(nIdx, nx, ny);
        const d = Math.hypot(nLab[0] - cLab[0], nLab[1] - cLab[1], nLab[2] - cLab[2]);
        if (d <= toleranceLab) {
          included[nIdx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
    return included;
  }

  function applySmartSelection(included, aw, ah, tool) {
    const scaleX = maskCanvas.width / aw;
    const scaleY = maskCanvas.height / ah;
    maskCtx.fillStyle = tool === "exclude" ? "#000000" : "#ffffff";
    for (let y = 0; y < ah; y++) {
      for (let x = 0; x < aw; x++) {
        if (included[y * aw + x]) {
          maskCtx.fillRect(
            Math.floor(x * scaleX), Math.floor(y * scaleY),
            Math.ceil(scaleX), Math.ceil(scaleY)
          );
        }
      }
    }
    maskDirty = true;
    if (tool === "exclude") maskHasExclusions = true;
    updateMaskActiveBadge();
  }

  function runSmartSelect(canvasX, canvasY) {
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    const { ctx: actx, width: aw, height: ah } = captureAnalysisFrame();
    const seedX = Math.min(aw - 1, Math.max(0, Math.round((canvasX / maskCanvas.width) * aw)));
    const seedY = Math.min(ah - 1, Math.max(0, Math.round((canvasY / maskCanvas.height) * ah)));
    const imageData = actx.getImageData(0, 0, aw, ah);
    const included = floodFillFromPoint(imageData, aw, ah, seedX, seedY, smartSelectTolerance);
    applySmartSelection(included, aw, ah, currentMaskTool);
  }

  function clearMask() {
    maskCtx.fillStyle = "#ffffff";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskDirty = true;
    maskHasExclusions = false;
    updateMaskActiveBadge();
  }

  function enterMaskMode() {
    hideOverlayPanels();
    maskModeActive = true;
    // Painting only makes sense against a held-steady frame — a moving
    // live feed underneath would make the mask's alignment meaningless
    // the moment the camera shifts.
    if (!paused) {
      paused = true;
      pauseBtn.textContent = "Resume";
      pauseBtn.setAttribute("aria-pressed", "true");
    }
    resizeMaskCanvas();
    maskCanvas.classList.add("mask-active");
    maskLayer.classList.remove("hide");
    maskExcludeBtn.focus();
  }

  function exitMaskMode() {
    maskModeActive = false;
    lastMaskPaintPos = null;
    maskCanvas.classList.remove("mask-active");
    maskLayer.classList.add("hide");
    maskBtn.focus();
  }

  // ---- Sampling for calibration ----
  // Averages a patch from the raw video frame (not the shader's corrected
  // output) so matching is always anchored to the real colour. The patch
  // size is adjustable (sampleArea) rather than fixed: a real wall, roof,
  // or run of windows shows a range of shades from shadows and reflections,
  // not one flat colour, so widening the sampled area averages across more
  // of that real variation instead of anchoring to a single spot that might
  // happen to be a highlight or a shadow.

  const SAMPLE_CANVAS_SIZE = 64;

  function sampleCenterColor() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    sampleCanvas.width = SAMPLE_CANVAS_SIZE;
    sampleCanvas.height = SAMPLE_CANVAS_SIZE;
    const vw = video.videoWidth, vh = video.videoHeight;
    const cropSize = Math.min(vw, vh) * (sampleArea / 100);
    const sx = vw / 2 - cropSize / 2;
    const sy = vh / 2 - cropSize / 2;
    sampleCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, SAMPLE_CANVAS_SIZE, SAMPLE_CANVAS_SIZE);
    const data = sampleCtx.getImageData(0, 0, SAMPLE_CANVAS_SIZE, SAMPLE_CANVAS_SIZE).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  // The on-screen reticle is sized to visually match the fraction of the
  // frame actually being averaged, so what you see is what you get —
  // widening the slider grows the circle, not just a number.
  function updateReticleSize() {
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const diameter = Math.round(vmin * (sampleArea / 100));
    reticle.style.width = diameter + "px";
    reticle.style.height = diameter + "px";
  }

  function startAiming() {
    aiming = true;
    updateReticleSize();
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
    calibrateBtn.focus();
  }

  // ---- Tune panel ----
  // The four bottom-docked overlays (tune, saved-references, choose-colour,
  // viewer-pairing) share a z-index and their triggers (HUD buttons) stay
  // reachable even while one is open, so only one may ever be shown at a
  // time. Hiding the viewer panel here does NOT disconnect an active
  // broadcast — that keeps running in the background, same as recording.

  function hideOverlayPanels() {
    tunePanel.classList.add("hide");
    pointsPanel.classList.add("hide");
    choosePanel.classList.add("hide");
    viewerPanel.classList.add("hide");
    if (maskModeActive) exitMaskMode();
  }

  function setCategoryPicker(category) {
    editingCategory = category === "wall" ? "wall" : "other";
    categoryWallBtn.classList.toggle("active", editingCategory === "wall");
    categoryWallBtn.setAttribute("aria-pressed", String(editingCategory === "wall"));
    categoryOtherBtn.classList.toggle("active", editingCategory === "other");
    categoryOtherBtn.setAttribute("aria-pressed", String(editingCategory === "other"));
  }

  function openTuneForNewPoint(sourceColor) {
    hideOverlayPanels();
    editingPointId = null;
    frozenColor = sourceColor;
    hueSlider.value = 0; satSlider.value = 0; lightSlider.value = 0;
    contrastSlider.value = 0; exposureSlider.value = 0;
    labelInput.value = "";
    setCategoryPicker("other");
    deletePointBtn.classList.add("hide");
    refreshTunePreview();
    tuneReturnFocusEl = calibrateBtn;
    tunePanel.classList.remove("hide");
    hueSlider.focus();
  }

  function openTuneForExistingPoint(point) {
    hideOverlayPanels();
    editingPointId = point.id;
    frozenColor = point.sourceColor;
    hueSlider.value = point.hueShift;
    satSlider.value = Math.round(point.satAdjust * 100);
    lightSlider.value = Math.round(point.lightAdjust * 100);
    contrastSlider.value = Math.round((point.contrastAdjust || 0) * 100);
    exposureSlider.value = Math.round((point.exposureAdjust || 0) * 100);
    labelInput.value = point.label || "";
    setCategoryPicker(point.category);
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
    const corrected = applyCorrection(frozenColor, hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust);
    swatchOriginal.style.background = rgbToCss(frozenColor);
    swatchCorrected.style.background = rgbToCss(corrected);
    swatchOriginalName.textContent = nearestColorName(frozenColor);
    swatchCorrectedName.textContent = nearestColorName(corrected);
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

  function savePoint() {
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
        p.category = editingCategory;
      }
    } else {
      if (points.length >= MAX_POINTS) {
        setStatus(`Limit of ${MAX_POINTS} saved references reached — delete one to add another.`);
        return;
      }
      points.push({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: labelInput.value.trim(),
        sourceColor: frozenColor,
        category: editingCategory,
        hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust
      });
    }
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function deleteCurrentPoint() {
    if (!editingPointId) return;
    points = points.filter((p) => p.id !== editingPointId);
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function updatePointsCount() {
    pointsCount.textContent = String(points.length);
  }

  // ---- Saved-references grid ----

  function renderPointsGrid() {
    pointsGrid.innerHTML = "";
    if (points.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No references saved yet. Use \"Match a reference colour\" to add your first one.";
      pointsGrid.appendChild(empty);
      return;
    }
    points.forEach((p) => {
      const colorName = nearestColorName(p.sourceColor);
      const selected = selectedIds.has(p.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "point-card" + (selectMode ? " selectable" : "") + (selected ? " selected" : "");
      const categoryText = p.category === "wall" ? "Wall" : "Other";
      if (selectMode) {
        card.setAttribute("aria-pressed", String(selected));
        card.setAttribute("aria-label", `${p.label || "untitled"}, ${colorName}, ${categoryText}${selected ? ", selected" : ""}.`);
      } else {
        card.setAttribute("aria-label", `${p.label || "untitled"}, ${colorName}, ${categoryText}. Tap to review or re-tune.`);
      }
      const sw = document.createElement("div");
      sw.className = "point-swatch";
      sw.style.background = rgbToCss(p.sourceColor);
      const label = document.createElement("div");
      label.className = "point-label";
      label.textContent = p.label || "untitled";
      const name = document.createElement("div");
      name.className = "point-name";
      name.textContent = colorName;
      const category = document.createElement("div");
      category.className = "point-category" + (p.category === "wall" ? " wall" : "");
      category.textContent = p.category === "wall" ? "Wall" : "Other";
      card.appendChild(sw);
      card.appendChild(label);
      card.appendChild(name);
      card.appendChild(category);
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
      ? "Tap references to select, then delete the ones you no longer want."
      : "Tap a reference to review or re-tune it.";
    renderPointsGrid();
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    points = points.filter((p) => !selectedIds.has(p.id));
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

  function clearAllPoints() {
    if (points.length === 0) return;
    const ok = window.confirm(`Delete all ${points.length} saved references? This can't be undone.`);
    if (!ok) return;
    points = [];
    selectedIds.clear();
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

  // ---- Choose-colour panel ----

  function renderPresetGrid() {
    presetGrid.innerHTML = "";
    REFERENCE_PRESETS.forEach((preset) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "preset-card";
      card.setAttribute("aria-label", `${preset.label}. Match this reference colour.`);
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
        openTuneForNewPoint(hexToRgb01(preset.hex));
      });
      presetGrid.appendChild(card);
    });
  }

  function openChoosePanel() {
    hideOverlayPanels();
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

  // ---- Export / import ----
  // Calibration only ever lived in localStorage, so clearing site data or
  // switching devices silently wiped it. Export/import makes it a portable
  // file instead — a backup, and a way to carry references to another phone.

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

  function exportPoints() {
    if (points.length === 0) {
      importExportStatus.textContent = "No saved references to export yet.";
      return;
    }
    const blob = new Blob([JSON.stringify(points, null, 2)], { type: "application/json" });
    downloadBlob(blob, `property-colour-reference-${new Date().toISOString().slice(0, 10)}.json`);
    importExportStatus.textContent = `Exported ${points.length} reference${points.length === 1 ? "" : "s"}.`;
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
        importExportStatus.textContent = "Import failed: no valid saved references found in that file.";
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
      savePoints();
      uploadPointUniforms();
      updatePointsCount();
      renderPointsGrid();
      const skipped = valid.length - toAdd.length;
      importExportStatus.textContent = `Imported ${toAdd.length} reference${toAdd.length === 1 ? "" : "s"}.` +
        (skipped > 0 ? ` ${skipped} skipped (limit of ${MAX_POINTS} reached).` : "");
    };
    reader.onerror = () => {
      importExportStatus.textContent = "Import failed: could not read that file.";
    };
    reader.readAsText(file);
  }

  // ---- Wiring ----

  startBtn.addEventListener("click", startCamera);

  blendSlider.addEventListener("input", () => {
    blendLabel.textContent = `${blendSlider.value}%`;
  });

  spreadSlider.addEventListener("input", () => {
    spread = parseFloat(spreadSlider.value);
    spreadLabel.textContent = spreadDescription(spread);
    saveSpreadPref();
  });

  sampleAreaSlider.addEventListener("input", () => {
    sampleArea = parseFloat(sampleAreaSlider.value);
    sampleAreaLabel.textContent = sampleAreaDescription(sampleArea);
    saveSampleAreaPref();
    updateReticleSize();
  });

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
  outlineThicknessSlider.value = String(outlineThickness);
  outlineThicknessLabel.textContent = `${outlineThickness}px`;
  outlineBlendSlider.value = String(Math.round(outlineBlend * 100));
  outlineBlendLabel.textContent = `${outlineBlendSlider.value}%`;
  outlineOpacitySlider.value = String(Math.round(outlineOpacity * 100));
  outlineOpacityLabel.textContent = `${outlineOpacitySlider.value}%`;
  updateOutlinesUi();

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveRotatePref();
  });

  torchBtn.addEventListener("click", toggleTorch);
  exposureModeBtn.addEventListener("click", toggleExposureMode);
  shutterSlider.addEventListener("input", applyShutter);
  isoSlider.addEventListener("input", applyIso);
  evSlider.addEventListener("input", applyExposureCompensation);
  switchCameraBtn.addEventListener("click", () => {
    if (isReceiverMode && receiverConnection) receiverConnection.switchRemoteCamera();
    else switchCamera();
  });
  photoBtn.addEventListener("click", takePhoto);
  recordBtn.addEventListener("click", toggleRecording);

  connectTabletBtn.addEventListener("click", openViewerPanel);
  startShareBtn.addEventListener("click", toggleTabletShare);
  closeViewerPanelBtn.addEventListener("click", closeViewerPanel);

  cameraOnlyStopBtn.addEventListener("click", exitCameraOnlyMode);
  showReceiveBtn.addEventListener("click", () => {
    receiveForm.classList.remove("hide");
    showReceiveBtn.classList.add("hide");
  });
  receiveConnectBtn.addEventListener("click", startReceiving);
  receiveRoomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") startReceiving();
  });

  maskBtn.addEventListener("click", enterMaskMode);
  doneMaskBtn.addEventListener("click", exitMaskMode);
  maskExcludeBtn.addEventListener("click", () => setMaskTool("exclude"));
  maskRestoreBtn.addEventListener("click", () => setMaskTool("restore"));
  maskBrushSlider.addEventListener("input", () => {
    maskBrushSize = parseFloat(maskBrushSlider.value);
    maskBrushLabel.textContent = maskBrushDescription(maskBrushSize);
  });
  maskModeBrushBtn.addEventListener("click", () => setMaskPaintMode("brush"));
  maskModeSmartBtn.addEventListener("click", () => setMaskPaintMode("smart"));
  maskToleranceSlider.addEventListener("input", () => {
    smartSelectTolerance = parseFloat(maskToleranceSlider.value);
    maskToleranceLabel.textContent = maskToleranceDescription(smartSelectTolerance);
  });
  clearMaskBtn.addEventListener("click", clearMask);
  maskCanvas.addEventListener("pointerdown", handleMaskPointerDown);
  maskCanvas.addEventListener("pointermove", handleMaskPointerMove);
  maskCanvas.addEventListener("pointerup", handleMaskPointerUp);
  maskCanvas.addEventListener("pointercancel", handleMaskPointerUp);

  // Best-effort hardware shutter: most browsers never forward physical
  // volume-button presses to page JavaScript at all (iOS Safari and
  // desktop never do), and even where a browser does — mainly some
  // Android/Chrome versions, especially as an installed PWA — the OS may
  // still also change the system volume alongside it. Where it works,
  // volume-down takes a photo, same convention as native camera apps; the
  // on-screen Photo button is the reliable fallback everywhere else.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "AudioVolumeDown" && e.code !== "AudioVolumeDown") return;
    if (!currentStream) return;
    e.preventDefault();
    takePhoto();
  });

  calibrateBtn.addEventListener("click", openChoosePanel);
  chooseAimBtn.addEventListener("click", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    startAiming();
  });
  colourPickerInput.addEventListener("input", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    openTuneForNewPoint(hexToRgb01(colourPickerInput.value));
  });
  closeChooseBtn.addEventListener("click", closeChoosePanel);

  cancelAimBtn.addEventListener("click", stopAiming);

  freezeBtn.addEventListener("click", () => {
    const c = sampleCenterColor();
    stopAiming();
    openTuneForNewPoint(c);
  });

  [hueSlider, satSlider, lightSlider, contrastSlider, exposureSlider].forEach((el) => {
    el.addEventListener("input", refreshTunePreview);
  });

  categoryWallBtn.addEventListener("click", () => setCategoryPicker("wall"));
  categoryOtherBtn.addEventListener("click", () => setCategoryPicker("other"));
  savePointBtn.addEventListener("click", savePoint);
  deletePointBtn.addEventListener("click", deleteCurrentPoint);
  closeTuneBtn.addEventListener("click", closeTunePanel);

  function closePointsPanel() {
    pointsPanel.classList.add("hide");
    importExportStatus.textContent = "";
    pointsBtn.focus();
  }

  pointsBtn.addEventListener("click", () => {
    hideOverlayPanels();
    setSelectMode(false);
    importExportStatus.textContent = "";
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
    } else if (maskModeActive) {
      exitMaskMode();
    } else if (aiming) {
      stopAiming();
    }
  });

  window.addEventListener("resize", resizeStage);
  window.addEventListener("resize", () => {
    if (aiming) updateReticleSize();
  });
  window.addEventListener("resize", () => {
    if (gl) resizeMaskCanvas();
  });

  // Tap the empty camera view to hide/show the HUD — same pattern as the
  // main Sound Nebula page: taps on any button, panel, or status readout
  // are excluded so those keep working normally; only taps on the clear
  // corrected feed itself toggle the HUD away.
  function isHudTapTarget(el) {
    return !!(el && el.closest && el.closest(
      "#hud, #overlay, #cameraStatus, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel, #viewerPanel, #maskCanvas, #maskLayer, #cameraOnlyBadge, #receiverStatusBadge"
    ));
  }

  document.body.addEventListener("click", (e) => {
    if (isHudTapTarget(e.target)) return;
    hud.classList.toggle("hide");
  });

  updatePointsCount();
  blendLabel.textContent = `${blendSlider.value}%`;
  spreadSlider.value = String(spread);
  spreadLabel.textContent = spreadDescription(spread);
  rotateBtn.classList.toggle("active", rotate180);
  sampleAreaSlider.value = String(sampleArea);
  sampleAreaLabel.textContent = sampleAreaDescription(sampleArea);
  maskBrushSlider.value = String(maskBrushSize);
  maskBrushLabel.textContent = maskBrushDescription(maskBrushSize);
  maskToleranceSlider.value = String(smartSelectTolerance);
  maskToleranceLabel.textContent = maskToleranceDescription(smartSelectTolerance);
})();
