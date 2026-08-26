(() => {
  "use strict";

  const MAX_POINTS = 32;
  const STORAGE_KEY = "cvCalibrationPoints_v1";
  const PROFILES_KEY = "cvProfiles_colorVision_v1";
  const BUILTIN_TEMPLATES_SEEDED_KEY = "builtinTemplatesSeeded_colorVision_v1";
  const ROTATE_KEY = "cvRotate180_v1";
  const SPREAD_KEY = "cvSpread_v1";
  const DEFAULT_SPREAD = 4;
  const CVD_TYPE_KEY = "cvCvdType_v1";
  const CVD_STRENGTH_KEY = "cvCvdStrength_v1";
  const CVD_TYPE_CODES = { none: 0, protan: 1, deutan: 2, tritan: 3 };
  const OUTLINE_ENABLED_KEY = "outlinesEnabled_colorVision_v1";
  const OUTLINE_THICKNESS_KEY = "outlineThickness_colorVision_v1";
  const OUTLINE_BLEND_KEY = "outlineBlend_colorVision_v1";
  const OUTLINE_OPACITY_KEY = "outlineOpacity_colorVision_v1";
  const OUTLINE_DEFAULT_THICKNESS = 2;
  const OUTLINE_DEFAULT_BLEND = 1;
  const OUTLINE_DEFAULT_OPACITY = 1;
  const OUTLINE_COLOR_KEY = "outlineColor_colorVision_v1";
  const OUTLINE_DEFAULT_COLOR = "#ffffff";
  const FREEZE_ENABLED_KEY = "freezeIsolateEnabled_colorVision_v1";
  const FREEZE_BLEND_KEY = "freezeBlend_colorVision_v1";
  const FREEZE_SPREAD_KEY = "freezeSpread_colorVision_v1";
  const FREEZE_DEFAULT_BLEND = 1;
  const FREEZE_DEFAULT_SPREAD = 15;
  const CARTOON_ENABLED_KEY = "cartoonEnabled_colorVision_v1";
  const CARTOON_LEVELS_KEY = "cartoonLevels_colorVision_v1";
  const CARTOON_DEFAULT_LEVELS = 6;
  const CARTOON_EDGE_THICKNESS_KEY = "cartoonEdgeThickness_colorVision_v1";
  const CARTOON_EDGE_STRENGTH_KEY = "cartoonEdgeStrength_colorVision_v1";
  const CARTOON_SATURATION_KEY = "cartoonSaturation_colorVision_v1";
  const CARTOON_DEFAULT_EDGE_THICKNESS = 2;
  const CARTOON_DEFAULT_EDGE_STRENGTH = 0.6;
  const CARTOON_DEFAULT_SATURATION = 1.35;
  const CARTOON_THEME_KEY = "cartoonTheme_colorVision_v1";
  const CARTOON_THEME_NAMES = ["none", "greyscale", "sepia", "desert", "oasis"];
  const CARTOON_DEFAULT_THEME = "none";
  // Presets just populate the two duotone colour pickers below — the shader
  // itself no longer knows about named themes, only the live lo/hi colours.
  const CARTOON_THEME_PRESETS = {
    greyscale: { lo: "#0d0d0d", hi: "#f2f2f2" },
    sepia: { lo: "#24170f", hi: "#e8d6a8" },
    desert: { lo: "#4c240f", hi: "#e8b866" },
    oasis: { lo: "#053d3b", hi: "#8fe3bf" }
  };
  const CARTOON_THEME_ENABLED_KEY = "cartoonThemeEnabled_colorVision_v1";
  const CARTOON_THEME_LO_KEY = "cartoonThemeLo_colorVision_v1";
  const CARTOON_THEME_HI_KEY = "cartoonThemeHi_colorVision_v1";
  const CARTOON_THEME_DEFAULT_LO = "#0d0d0d";
  const CARTOON_THEME_DEFAULT_HI = "#f2f2f2";
  const SHUTTER_MODE_KEY = "shutterMode_colorVision_v1";
  const FLOATING_CAPTURE_POS_KEY = "floatingCapturePos_colorVision_v1";
  const AUDIO_TINT_ENABLED_KEY = "audioTintEnabled_colorVision_v1";
  const AUDIO_TINT_STRENGTH_KEY = "audioTintStrength_colorVision_v1";
  const AUDIO_TINT_DEFAULT_STRENGTH = 0.4;
  const AUDIO_TINT_SAT_STRENGTH_KEY = "audioTintSatStrength_colorVision_v1";
  const AUDIO_TINT_LIGHT_STRENGTH_KEY = "audioTintLightStrength_colorVision_v1";
  const AUDIO_TINT_DEFAULT_SAT_STRENGTH = 0;
  const AUDIO_TINT_DEFAULT_LIGHT_STRENGTH = 0;
  const AUDIO_TINT_SMOOTHING_KEY = "audioTintSmoothing_colorVision_v1";
  const AUDIO_TINT_DEFAULT_SMOOTHING = 0.7;
  const AUDIO_TINT_FFT_SIZE_KEY = "audioTintFftSize_colorVision_v1";
  const AUDIO_TINT_DEFAULT_FFT_SIZE = 1024;
  const AUDIO_TINT_FFT_SIZE_OPTIONS = [256, 512, 1024, 2048, 4096, 8192];
  // audioTintFftSizeSlider is index-based (0..options.length-1) like every
  // other audio tint control is a plain <input type="range"> — these two
  // convert between that index and the actual FFT size value.
  function audioTintFftSizeIndex(value) {
    const idx = AUDIO_TINT_FFT_SIZE_OPTIONS.indexOf(value);
    return idx === -1 ? AUDIO_TINT_FFT_SIZE_OPTIONS.indexOf(AUDIO_TINT_DEFAULT_FFT_SIZE) : idx;
  }
  const AUDIO_TINT_UPDATE_MS_KEY = "audioTintUpdateMs_colorVision_v1";
  const AUDIO_TINT_DEFAULT_UPDATE_MS = 80;
  const AUDIO_TINT_EXTRA_BANDS_VISIBLE_KEY = "audioTintExtraBandsVisible_colorVision_v1";
  // A second, artistic source of colour besides the camera: live mic
  // input, split into bands (and hues) similar to Sound Nebula's particle
  // visualiser, so the "mood" of whatever's playing can nudge the corrected
  // view's hue. hue/gain/fromHz/toHz/enabled are all user-adjustable via
  // sliders (see updateAudioTintBandsFromUi); these are just the shipped
  // defaults and the id-prefix used to find each band's five controls.
  // Bass/Mid/Treble are on by default; Band4-6 are extra, fully open
  // (20Hz-20kHz) bands a user can tune and switch on for more customisation,
  // off by default so they don't change the out-of-the-box sound.
  const AUDIO_TINT_BAND_DEFS = [
    { key: "Bass", hue: 262, gain: 1.0, fromHz: 20, toHz: 150, enabled: true },     // violet — bass/kick
    { key: "Mid", hue: 189, gain: 1.0, fromHz: 150, toHz: 2000, enabled: true },    // cyan — mids
    { key: "Treble", hue: 330, gain: 0.85, fromHz: 2000, toHz: 9000, enabled: true }, // pink — treble
    { key: "Band4", hue: 30, gain: 1.0, fromHz: 20, toHz: 20000, enabled: false },
    { key: "Band5", hue: 90, gain: 1.0, fromHz: 20, toHz: 20000, enabled: false },
    { key: "Band6", hue: 210, gain: 1.0, fromHz: 20, toHz: 20000, enabled: false }
  ];
  function audioTintBandKey(bandKey, field) {
    return `audioTint${bandKey}${field}_colorVision_v1`;
  }
  function loadAudioTintBandBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) {
      return fallback;
    }
  }
  // Populated from localStorage/sliders in updateAudioTintBandsFromUi(); from/to
  // (fractions of the Nyquist frequency) are filled in once audio tint starts.
  const AUDIO_TINT_BANDS = AUDIO_TINT_BAND_DEFS.map((def) => ({
    hue: loadOutlineNumberPref(audioTintBandKey(def.key, "Hue"), def.hue),
    gain: loadOutlineNumberPref(audioTintBandKey(def.key, "Gain"), def.gain),
    fromHz: loadOutlineNumberPref(audioTintBandKey(def.key, "FromHz"), def.fromHz),
    toHz: loadOutlineNumberPref(audioTintBandKey(def.key, "ToHz"), def.toHz),
    enabled: loadAudioTintBandBoolPref(audioTintBandKey(def.key, "Enabled"), def.enabled),
    from: 0,
    to: 0,
    rawEnergy: 0
  }));

  // ---- Beat flash (ported from Sound Nebula's beat detection) ----
  // Reuses the same microphone AudioContext/analyser as audio colour tint
  // above (see audioAnalysisTick/audioAnalysisNeeded) rather than opening a
  // second mic stream, and reuses the Bass band's own frequency range
  // (AUDIO_TINT_BANDS[0]) as the beat detector's listening range.
  const BEAT_FLASH_ENABLED_KEY = "beatFlashEnabled_colorVision_v1";
  const BEAT_SENSITIVITY_KEY = "beatSensitivity_colorVision_v1";
  const BEAT_FLASH_SPEED_KEY = "beatFlashSpeed_colorVision_v1";
  const BEAT_DIM_FLICKER_KEY = "beatDimFlicker_colorVision_v1";
  const BEAT_TORCH_INVERTED_KEY = "beatTorchInverted_colorVision_v1";
  const BEAT_SCREEN_FLASH_KEY = "beatScreenFlash_colorVision_v1";
  const BEAT_SYNC_DELAY_KEY = "beatSyncDelay_colorVision_v1";
  const BEAT_HISTORY_LEN = 40;
  // Beat strength (0..1, how far above the detection threshold a hit
  // landed) at or above which the screen flash blacks out instead of
  // showing the usual band-weighted colour.
  const SCREEN_FLASH_BLACK_THRESHOLD = 0.65;
  // There's no real brightness control for camera torch on the web
  // platform — it's on/off only. This rapidly toggles the torch during
  // each pulse to approximate a dimmer look; a rough illusion, not real
  // dimming, capped by how fast the device's camera hardware can respond.
  const FLICKER_PERIOD_MS = 30;
  const FLICKER_DUTY = 0.45;
  const BEAT_TORCH_MAX_FAILS = 5;

  const LONG_PRESS_MS = 450;
  const DRAG_CANCEL_PX = 10;
  const RECORD_FPS_KEY = "recordFps_colorVision_v1";
  const DEFAULT_RECORD_FPS = 30;
  const RECORD_FPS_OPTIONS = [15, 24, 30, 60];
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
  const audioTintBtn = document.getElementById("audioTintBtn");
  const audioTintResetBtn = document.getElementById("audioTintResetBtn");
  const audioTintStrengthWrap = document.getElementById("audioTintStrengthWrap");
  const audioTintStrengthSlider = document.getElementById("audioTintStrengthSlider");
  const audioTintStrengthLabel = document.getElementById("audioTintStrengthLabel");
  const audioTintSatStrengthWrap = document.getElementById("audioTintSatStrengthWrap");
  const audioTintSatStrengthSlider = document.getElementById("audioTintSatStrengthSlider");
  const audioTintSatStrengthLabel = document.getElementById("audioTintSatStrengthLabel");
  const audioTintLightStrengthWrap = document.getElementById("audioTintLightStrengthWrap");
  const audioTintLightStrengthSlider = document.getElementById("audioTintLightStrengthSlider");
  const audioTintLightStrengthLabel = document.getElementById("audioTintLightStrengthLabel");
  const audioTintSmoothingWrap = document.getElementById("audioTintSmoothingWrap");
  const audioTintSmoothingSlider = document.getElementById("audioTintSmoothingSlider");
  const audioTintSmoothingLabel = document.getElementById("audioTintSmoothingLabel");
  const audioTintFftSizeWrap = document.getElementById("audioTintFftSizeWrap");
  const audioTintFftSizeSlider = document.getElementById("audioTintFftSizeSlider");
  const audioTintFftSizeLabel = document.getElementById("audioTintFftSizeLabel");
  const audioTintUpdateMsWrap = document.getElementById("audioTintUpdateMsWrap");
  const audioTintUpdateMsSlider = document.getElementById("audioTintUpdateMsSlider");
  const audioTintUpdateMsLabel = document.getElementById("audioTintUpdateMsLabel");
  const audioTintExtraBandsWrap = document.getElementById("audioTintExtraBandsWrap");
  const audioTintExtraBandsCheckbox = document.getElementById("audioTintExtraBandsCheckbox");
  // One { wrap, slider, label } triple per band per field (hue/gain/fromHz/toHz),
  // plus a { wrap, input } pair for enabled, keyed off AUDIO_TINT_BAND_DEFS'
  // id-prefixes (audioTintBassHue*, audioTintMidGain*, audioTintBand4Enabled*, ...).
  // Band4-6 are the "extra" bands, shown only when audioTintExtraBandsVisible.
  const AUDIO_TINT_EXTRA_BAND_KEYS = ["Band4", "Band5", "Band6"];
  const audioTintBandControls = AUDIO_TINT_BAND_DEFS.map((def) => ({
    enabled: {
      wrap: document.getElementById(`audioTint${def.key}EnabledWrap`),
      input: document.getElementById(`audioTint${def.key}EnabledCheckbox`)
    },
    hue: {
      wrap: document.getElementById(`audioTint${def.key}HueWrap`),
      slider: document.getElementById(`audioTint${def.key}HueSlider`),
      label: document.getElementById(`audioTint${def.key}HueLabel`)
    },
    gain: {
      wrap: document.getElementById(`audioTint${def.key}GainWrap`),
      slider: document.getElementById(`audioTint${def.key}GainSlider`),
      label: document.getElementById(`audioTint${def.key}GainLabel`)
    },
    fromHz: {
      wrap: document.getElementById(`audioTint${def.key}FromHzWrap`),
      slider: document.getElementById(`audioTint${def.key}FromHzSlider`),
      label: document.getElementById(`audioTint${def.key}FromHzLabel`)
    },
    toHz: {
      wrap: document.getElementById(`audioTint${def.key}ToHzWrap`),
      slider: document.getElementById(`audioTint${def.key}ToHzSlider`),
      label: document.getElementById(`audioTint${def.key}ToHzLabel`)
    }
  }));
  const screenFlashEl = document.getElementById("screenFlash");
  const beatFlashBtn = document.getElementById("beatFlashBtn");
  const beatSensitivityWrap = document.getElementById("beatSensitivityWrap");
  const beatSensitivitySlider = document.getElementById("beatSensitivitySlider");
  const beatSensitivityLabel = document.getElementById("beatSensitivityLabel");
  const beatFlashSpeedWrap = document.getElementById("beatFlashSpeedWrap");
  const beatFlashSpeedSlider = document.getElementById("beatFlashSpeedSlider");
  const beatFlashSpeedLabel = document.getElementById("beatFlashSpeedLabel");
  const beatDimFlickerWrap = document.getElementById("beatDimFlickerWrap");
  const beatDimFlickerCheckbox = document.getElementById("beatDimFlickerCheckbox");
  const beatTorchInvertedWrap = document.getElementById("beatTorchInvertedWrap");
  const beatTorchInvertedCheckbox = document.getElementById("beatTorchInvertedCheckbox");
  const beatScreenFlashWrap = document.getElementById("beatScreenFlashWrap");
  const beatScreenFlashCheckbox = document.getElementById("beatScreenFlashCheckbox");
  const beatTestFlashBtn = document.getElementById("beatTestFlashBtn");
  const beatSyncDelayWrap = document.getElementById("beatSyncDelayWrap");
  const beatSyncDelaySlider = document.getElementById("beatSyncDelaySlider");
  const beatSyncDelayLabel = document.getElementById("beatSyncDelayLabel");
  const cvdTypeSelect = document.getElementById("cvdTypeSelect");
  const cvdStrengthWrap = document.getElementById("cvdStrengthWrap");
  const cvdStrengthSlider = document.getElementById("cvdStrengthSlider");
  const cvdStrengthLabel = document.getElementById("cvdStrengthLabel");
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
  const freezeIsolateBtn = document.getElementById("freezeIsolateBtn");
  const freezeBlendWrap = document.getElementById("freezeBlendWrap");
  const freezeBlendSlider = document.getElementById("freezeBlendSlider");
  const freezeBlendLabel = document.getElementById("freezeBlendLabel");
  const freezeSpreadWrap = document.getElementById("freezeSpreadWrap");
  const freezeSpreadSlider = document.getElementById("freezeSpreadSlider");
  const freezeSpreadLabel = document.getElementById("freezeSpreadLabel");
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
  const cartoonThemeWrap = document.getElementById("cartoonThemeWrap");
  const cartoonThemeSelect = document.getElementById("cartoonThemeSelect");
  const cartoonThemeEnabledWrap = document.getElementById("cartoonThemeEnabledWrap");
  const cartoonThemeEnabledCheckbox = document.getElementById("cartoonThemeEnabledCheckbox");
  const cartoonThemeLoWrap = document.getElementById("cartoonThemeLoWrap");
  const cartoonThemeLoInput = document.getElementById("cartoonThemeLoInput");
  const cartoonThemeHiWrap = document.getElementById("cartoonThemeHiWrap");
  const cartoonThemeHiInput = document.getElementById("cartoonThemeHiInput");
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const pointsCount = document.getElementById("pointsCount");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const glassesModeBtn = document.getElementById("glassesModeBtn");
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
  const recordFpsSelect = document.getElementById("recordFpsSelect");
  const recordBtn = document.getElementById("recordBtn");
  const cameraStatus = document.getElementById("cameraStatus");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const recordingIndicatorTime = document.getElementById("recordingIndicatorTime");
  const floatingCaptureBar = document.getElementById("floatingCaptureBar");
  const floatingCalibrateBtn = document.getElementById("floatingCalibrateBtn");
  const floatingPhotoBtn = document.getElementById("floatingPhotoBtn");
  const floatingRecordBtn = document.getElementById("floatingRecordBtn");
  const floatingPointsBtn = document.getElementById("floatingPointsBtn");
  const floatingGlassesModeBtn = document.getElementById("floatingGlassesModeBtn");

  const connectTabletBtn = document.getElementById("connectTabletBtn");
  const viewerPanel = document.getElementById("viewerPanel");
  const startShareBtn = document.getElementById("startShareBtn");
  const shareCodeBlock = document.getElementById("shareCodeBlock");
  const shareRoomCode = document.getElementById("shareRoomCode");
  const shareViewUrlText = document.getElementById("shareViewUrlText");
  const viewerStatus = document.getElementById("viewerStatus");
  const closeViewerPanelBtn = document.getElementById("closeViewerPanelBtn");
  const viewerConnectedBadge = document.getElementById("viewerConnectedBadge");

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

  const choosePanel = document.getElementById("choosePanel");
  const chooseAimBtn = document.getElementById("chooseAimBtn");
  const colourPickerInput = document.getElementById("colourPickerInput");
  const presetGrid = document.getElementById("presetGrid");
  const closeChooseBtn = document.getElementById("closeChooseBtn");

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

  // Each saved point is a real colour the user aimed at and personally tuned:
  // { id, label, sourceColor: [r,g,b 0-1], hueShift (deg), satAdjust, lightAdjust (-1..1) }.
  // The shader blends correction across the whole frame by weighting each
  // point's contribution by inverse Lab-distance from the pixel's own colour,
  // so nearby real-world colours inherit similar correction and coverage
  // improves the more points get calibrated.
  let points = loadPoints();
  let profiles = loadProfiles();
  let editingPointId = null;
  let frozenColor = null;
  let tuneReturnFocusEl = null;
  let choosePanelReturnFocusEl = null;
  let aiming = false;
  // Where in the video frame calibration samples from — a fraction (0,0
  // top-left .. 1,1 bottom-right), defaulting to dead-center but movable
  // by tapping anywhere in the camera view while aiming (see
  // screenToVideoFraction/moveReticleTo below).
  let aimFracX = 0.5;
  let aimFracY = 0.5;
  let paused = false;
  let selectMode = false;
  let selectedIds = new Set();
  // Some phones (notably several Android back cameras) deliver frames
  // pre-rotated 180° at the driver/OS level — unrelated to WebGL's own
  // texture-space Y-flip, and not something we can reliably detect, so it's
  // a manual per-device toggle instead, persisted once the user sets it.
  let rotate180 = loadRotatePref();
  let spread = loadSpreadPref();
  let cvdType = loadCvdTypePref();
  let cvdStrength = loadCvdStrengthPref();
  let outlinesEnabled = (() => {
    try { return localStorage.getItem(OUTLINE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let outlineThickness = loadOutlineNumberPref(OUTLINE_THICKNESS_KEY, OUTLINE_DEFAULT_THICKNESS);
  let outlineBlend = loadOutlineNumberPref(OUTLINE_BLEND_KEY, OUTLINE_DEFAULT_BLEND);
  let outlineOpacity = loadOutlineNumberPref(OUTLINE_OPACITY_KEY, OUTLINE_DEFAULT_OPACITY);
  let outlineColor = loadOutlineColorPref();
  let outlineColorRgb = hexToRgb01(outlineColor);
  let freezeIsolateEnabled = (() => {
    try { return localStorage.getItem(FREEZE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let freezeBlend = loadOutlineNumberPref(FREEZE_BLEND_KEY, FREEZE_DEFAULT_BLEND);
  let freezeSpread = loadOutlineNumberPref(FREEZE_SPREAD_KEY, FREEZE_DEFAULT_SPREAD);
  let audioTintEnabled = (() => {
    try { return localStorage.getItem(AUDIO_TINT_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let audioTintStrength = loadOutlineNumberPref(AUDIO_TINT_STRENGTH_KEY, AUDIO_TINT_DEFAULT_STRENGTH);
  let audioTintSatStrength = loadOutlineNumberPref(AUDIO_TINT_SAT_STRENGTH_KEY, AUDIO_TINT_DEFAULT_SAT_STRENGTH);
  let audioTintLightStrength = loadOutlineNumberPref(AUDIO_TINT_LIGHT_STRENGTH_KEY, AUDIO_TINT_DEFAULT_LIGHT_STRENGTH);
  let audioTintSmoothing = loadOutlineNumberPref(AUDIO_TINT_SMOOTHING_KEY, AUDIO_TINT_DEFAULT_SMOOTHING);
  let audioTintFftSize = (() => {
    try {
      const raw = parseInt(localStorage.getItem(AUDIO_TINT_FFT_SIZE_KEY), 10);
      return AUDIO_TINT_FFT_SIZE_OPTIONS.includes(raw) ? raw : AUDIO_TINT_DEFAULT_FFT_SIZE;
    } catch (e) {
      return AUDIO_TINT_DEFAULT_FFT_SIZE;
    }
  })();
  let audioTintUpdateMs = loadOutlineNumberPref(AUDIO_TINT_UPDATE_MS_KEY, AUDIO_TINT_DEFAULT_UPDATE_MS);
  let audioTintExtraBandsVisible = (() => {
    try { return localStorage.getItem(AUDIO_TINT_EXTRA_BANDS_VISIBLE_KEY) === "1"; } catch (e) { return false; }
  })();
  let audioTintHue = 0;
  // 0..1 live loudness (post per-band gain), used by the saturation/lightness push.
  let audioTintLevel = 0;
  let audioTintCtx = null;
  let audioTintStream = null;
  let audioTintAnalyser = null;
  let audioTintFreqData = null;
  let audioTintIntervalId = null;
  let beatFlashEnabled = (() => {
    try { return localStorage.getItem(BEAT_FLASH_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let beatSensitivity = loadOutlineNumberPref(BEAT_SENSITIVITY_KEY, 50) / 100; // 0 (least sensitive) .. 1 (most sensitive)
  let beatFlashSpeed = loadOutlineNumberPref(BEAT_FLASH_SPEED_KEY, 50) / 100; // 0 (slow) .. 1 (fast strobe)
  let beatCooldownMs = 180;
  let beatMinFlashMs = 50;
  let beatMaxFlashMs = 160;
  let beatDimFlickerEnabled = (() => {
    try { return localStorage.getItem(BEAT_DIM_FLICKER_KEY) === "1"; } catch (e) { return false; }
  })();
  let beatTorchInverted = (() => {
    try { return localStorage.getItem(BEAT_TORCH_INVERTED_KEY) === "1"; } catch (e) { return false; }
  })();
  let beatScreenFlashEnabled = (() => {
    try { return localStorage.getItem(BEAT_SCREEN_FLASH_KEY) === "1"; } catch (e) { return false; }
  })();
  let beatSyncDelayMs = loadOutlineNumberPref(BEAT_SYNC_DELAY_KEY, 0);
  let bassHistory = [];
  let lastBeatAt = 0;
  let beatTorchBusy = false;
  let beatTorchFailCount = 0;
  const vibrateSupported = typeof navigator.vibrate === "function";
  let cartoonEnabled = (() => {
    try { return localStorage.getItem(CARTOON_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let cartoonLevels = loadOutlineNumberPref(CARTOON_LEVELS_KEY, CARTOON_DEFAULT_LEVELS);
  let cartoonEdgeThickness = loadOutlineNumberPref(CARTOON_EDGE_THICKNESS_KEY, CARTOON_DEFAULT_EDGE_THICKNESS);
  let cartoonEdgeStrength = loadOutlineNumberPref(CARTOON_EDGE_STRENGTH_KEY, CARTOON_DEFAULT_EDGE_STRENGTH);
  let cartoonSaturation = loadOutlineNumberPref(CARTOON_SATURATION_KEY, CARTOON_DEFAULT_SATURATION);
  let cartoonTheme = loadCartoonThemePref();
  let cartoonThemeEnabled = (() => {
    try { return localStorage.getItem(CARTOON_THEME_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let cartoonThemeLo = loadCartoonThemeColorPref(CARTOON_THEME_LO_KEY, CARTOON_THEME_DEFAULT_LO);
  let cartoonThemeHi = loadCartoonThemeColorPref(CARTOON_THEME_HI_KEY, CARTOON_THEME_DEFAULT_HI);
  let cartoonThemeLoRgb = hexToRgb01(cartoonThemeLo);
  let cartoonThemeHiRgb = hexToRgb01(cartoonThemeHi);
  let shutterMode = (() => {
    try { return localStorage.getItem(SHUTTER_MODE_KEY) === "video" ? "video" : "photo"; } catch (e) { return "photo"; }
  })();
  let shutterModeStatusTimer = null;
  let recordFps = (() => {
    try {
      const raw = parseInt(localStorage.getItem(RECORD_FPS_KEY), 10);
      return RECORD_FPS_OPTIONS.includes(raw) ? raw : DEFAULT_RECORD_FPS;
    } catch (e) { return DEFAULT_RECORD_FPS; }
  })();
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
    fixedUniforms = null, fixedQuadBuffer = null, fixedVideoTexture = null;
  let rafId = null;
  let aimIntervalId = null;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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

  // A colour swatch alone doesn't help the people this page is for — the
  // whole point is that colour perception can't be trusted, so every swatch
  // also gets a plain-language name from a fixed palette of familiar terms.
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

  function loadProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveProfiles() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      profileStatus.textContent = "Could not save template (storage full or unavailable).";
    }
  }

  // Every setting's shipped default, in the same shape currentSettingsSnapshot()
  // produces — the "nothing tuned yet" baseline the 7 built-in templates below
  // each start from and override just the handful of fields that define them.
  function fullDefaultsSnapshot() {
    return {
      blend: 100,
      spread: DEFAULT_SPREAD,
      rotate180: false,
      cvdType: "none",
      cvdStrength: 1,
      outlinesEnabled: false,
      outlineThickness: OUTLINE_DEFAULT_THICKNESS,
      outlineBlend: OUTLINE_DEFAULT_BLEND,
      outlineOpacity: OUTLINE_DEFAULT_OPACITY,
      outlineColor: OUTLINE_DEFAULT_COLOR,
      freezeIsolateEnabled: false,
      freezeBlend: FREEZE_DEFAULT_BLEND,
      freezeSpread: FREEZE_DEFAULT_SPREAD,
      cartoonEnabled: false,
      cartoonLevels: CARTOON_DEFAULT_LEVELS,
      cartoonEdgeThickness: CARTOON_DEFAULT_EDGE_THICKNESS,
      cartoonEdgeStrength: CARTOON_DEFAULT_EDGE_STRENGTH,
      cartoonSaturation: CARTOON_DEFAULT_SATURATION,
      cartoonTheme: CARTOON_DEFAULT_THEME,
      cartoonThemeEnabled: false,
      cartoonThemeLo: CARTOON_THEME_DEFAULT_LO,
      cartoonThemeHi: CARTOON_THEME_DEFAULT_HI,
      audioTintEnabled: false,
      ...audioTintDefaultsSnapshot(),
      beatFlashEnabled: false,
      beatSensitivity: 0.5,
      beatFlashSpeed: 0.5,
      beatDimFlickerEnabled: false,
      beatTorchInverted: false,
      beatScreenFlashEnabled: false,
      beatSyncDelayMs: 0
    };
  }

  // 7 ready-made "everything tuned" templates, seeded once into the user's
  // own templates list (see seedBuiltinTemplatesIfNeeded) so they show up
  // in Saved colours -> Templates immediately, with 0 calibrated colours —
  // calibration is inherently personal/live-camera, so these only cover the
  // settings that don't depend on it (CVD type, audio tint, cartoon, beat
  // flash, outlines).
  function builtinTemplates() {
    const base = fullDefaultsSnapshot();
    const preset = (id, name, overrides) => ({ id, name, points: [], settings: { ...base, ...overrides } });
    return [
      preset("builtin-protan", "Protanopia correction", { cvdType: "protan", cvdStrength: 1 }),
      preset("builtin-deutan", "Deuteranopia correction", { cvdType: "deutan", cvdStrength: 1 }),
      preset("builtin-tritan", "Tritanopia correction", { cvdType: "tritan", cvdStrength: 1 }),
      preset("builtin-chill-glow", "Chill audio glow", {
        audioTintEnabled: true,
        audioTintStrength: 0.25,
        audioTintSatStrength: 0.1,
        audioTintLightStrength: 0.05,
        audioTintSmoothing: 0.85,
        audioTintUpdateMs: 150
      }),
      preset("builtin-rave", "Rave mode", {
        cartoonEnabled: true,
        cartoonLevels: 5,
        cartoonSaturation: 2.0,
        cartoonThemeEnabled: true,
        cartoonThemeLo: "#1a0033",
        cartoonThemeHi: "#00f0ff",
        audioTintEnabled: true,
        audioTintStrength: 0.85,
        audioTintSatStrength: 0.4,
        audioTintLightStrength: 0.15,
        audioTintSmoothing: 0.4,
        audioTintExtraBandsVisible: true,
        audioTintBand4Enabled: true,
        audioTintBand5Enabled: true,
        audioTintBand6Enabled: true,
        beatFlashEnabled: true,
        beatSensitivity: 0.8,
        beatFlashSpeed: 0.9,
        beatScreenFlashEnabled: true
      }),
      preset("builtin-cartoon-sketch", "Cartoon sketch (outlined)", {
        cartoonEnabled: true,
        cartoonLevels: 6,
        cartoonEdgeThickness: 3,
        cartoonEdgeStrength: 0.8,
        cartoonSaturation: 1.5,
        outlinesEnabled: true,
        outlineThickness: 3,
        outlineBlend: 0.6,
        outlineOpacity: 1,
        outlineColor: "#ffcc00"
      }),
      preset("builtin-clean", "Clean correction (reset)", { spread: 12 })
    ];
  }

  // Adds the 7 built-ins to the user's own template list exactly once —
  // tracked by a separate flag rather than "profiles is empty", so deleting
  // one (or all of them) later doesn't bring it back on the next reload.
  function seedBuiltinTemplatesIfNeeded() {
    try {
      if (localStorage.getItem(BUILTIN_TEMPLATES_SEEDED_KEY) === "1") return;
    } catch (e) {
      return;
    }
    const existingIds = new Set(profiles.map((p) => p.id));
    builtinTemplates().forEach((tpl) => {
      if (!existingIds.has(tpl.id)) profiles.push(tpl);
    });
    saveProfiles();
    try { localStorage.setItem(BUILTIN_TEMPLATES_SEEDED_KEY, "1"); } catch (e) {}
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
  function saveFreezeIsolateEnabledPref() {
    try { localStorage.setItem(FREEZE_ENABLED_KEY, freezeIsolateEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveFreezeBlendPref() {
    try { localStorage.setItem(FREEZE_BLEND_KEY, String(freezeBlend)); } catch (e) {}
  }
  function saveFreezeSpreadPref() {
    try { localStorage.setItem(FREEZE_SPREAD_KEY, String(freezeSpread)); } catch (e) {}
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

  function saveAudioTintEnabledPref() {
    try { localStorage.setItem(AUDIO_TINT_ENABLED_KEY, audioTintEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveAudioTintStrengthPref() {
    try { localStorage.setItem(AUDIO_TINT_STRENGTH_KEY, String(audioTintStrength)); } catch (e) {}
  }
  function saveAudioTintSatStrengthPref() {
    try { localStorage.setItem(AUDIO_TINT_SAT_STRENGTH_KEY, String(audioTintSatStrength)); } catch (e) {}
  }
  function saveAudioTintLightStrengthPref() {
    try { localStorage.setItem(AUDIO_TINT_LIGHT_STRENGTH_KEY, String(audioTintLightStrength)); } catch (e) {}
  }
  function saveAudioTintSmoothingPref() {
    try { localStorage.setItem(AUDIO_TINT_SMOOTHING_KEY, String(audioTintSmoothing)); } catch (e) {}
  }
  function saveAudioTintFftSizePref() {
    try { localStorage.setItem(AUDIO_TINT_FFT_SIZE_KEY, String(audioTintFftSize)); } catch (e) {}
  }
  function saveAudioTintUpdateMsPref() {
    try { localStorage.setItem(AUDIO_TINT_UPDATE_MS_KEY, String(audioTintUpdateMs)); } catch (e) {}
  }
  function saveAudioTintExtraBandsVisiblePref() {
    try { localStorage.setItem(AUDIO_TINT_EXTRA_BANDS_VISIBLE_KEY, audioTintExtraBandsVisible ? "1" : "0"); } catch (e) {}
  }
  function saveAudioTintBandPref(bandKey, field, value) {
    try { localStorage.setItem(audioTintBandKey(bandKey, field), String(value)); } catch (e) {}
  }

  // Reads the current value of all band controls (enabled/hue/gain/fromHz/toHz
  // for bass/mid/treble/band4-6) into the live AUDIO_TINT_BANDS objects. Called
  // both on every slider/checkbox's own input event and once up front when
  // audio tint starts, so edits always take effect on the next
  // computeAudioTintHue() tick without needing to restart the microphone.
  function updateAudioTintBandsFromUi() {
    AUDIO_TINT_BAND_DEFS.forEach((def, i) => {
      const band = AUDIO_TINT_BANDS[i];
      const controls = audioTintBandControls[i];
      band.enabled = controls.enabled.input.checked;
      band.hue = parseFloat(controls.hue.slider.value);
      band.gain = parseFloat(controls.gain.slider.value) / 100;
      band.fromHz = parseFloat(controls.fromHz.slider.value);
      band.toHz = parseFloat(controls.toHz.slider.value);
    });
  }

  function updateAudioTintExtraBandsVisibility() {
    const show = audioTintEnabled && audioTintExtraBandsVisible;
    AUDIO_TINT_BAND_DEFS.forEach((def, i) => {
      if (!AUDIO_TINT_EXTRA_BAND_KEYS.includes(def.key)) return;
      const controls = audioTintBandControls[i];
      [controls.enabled.wrap, controls.hue.wrap, controls.gain.wrap, controls.fromHz.wrap, controls.toHz.wrap].forEach((el) =>
        el.classList.toggle("hide", !show)
      );
    });
  }

  function updateAudioTintUi() {
    audioTintBtn.textContent = audioTintEnabled ? "Audio colour tint: On" : "Audio colour tint: Off";
    audioTintBtn.classList.toggle("active", audioTintEnabled);
    audioTintBtn.setAttribute("aria-pressed", String(audioTintEnabled));
    const wraps = [
      audioTintResetBtn, audioTintStrengthWrap, audioTintSatStrengthWrap, audioTintLightStrengthWrap,
      audioTintSmoothingWrap, audioTintFftSizeWrap, audioTintUpdateMsWrap, audioTintExtraBandsWrap
    ];
    audioTintBandControls.forEach((controls, i) => {
      if (AUDIO_TINT_EXTRA_BAND_KEYS.includes(AUDIO_TINT_BAND_DEFS[i].key)) return; // handled by updateAudioTintExtraBandsVisibility
      wraps.push(controls.enabled.wrap, controls.hue.wrap, controls.gain.wrap, controls.fromHz.wrap, controls.toHz.wrap);
    });
    wraps.forEach((el) => el.classList.toggle("hide", !audioTintEnabled));
    updateAudioTintExtraBandsVisibility();
  }

  // Reads the live frequency spectrum and turns it into a single hue the
  // same way Sound Nebula's beatColor() does — each enabled band's average
  // energy (scaled by that band's own gain) weights its own hue, so whichever
  // band currently dominates the sound pulls the blended hue toward it.
  // from/to are recomputed from fromHz/toHz on every call (not just once at
  // start) so range slider edits take effect live. Also tracks
  // audioTintLevel, the overall (post-gain) loudness across enabled bands,
  // which drives the separate saturation/lightness push.
  function computeAudioTintHue() {
    if (!audioTintAnalyser || !audioTintCtx) return;
    const nyquist = audioTintCtx.sampleRate / 2;
    audioTintAnalyser.getByteFrequencyData(audioTintFreqData);
    const n = audioTintFreqData.length;
    let weightedHue = 0;
    let totalEnergy = 0;
    let activeBands = 0;
    for (const band of AUDIO_TINT_BANDS) {
      band.from = Math.min(1, band.fromHz / nyquist);
      band.to = Math.min(1, band.toHz / nyquist);
      const start = Math.floor(band.from * n);
      const end = Math.max(start + 1, Math.floor(band.to * n));
      let sum = 0;
      for (let i = start; i < end; i++) sum += audioTintFreqData[i];
      // Computed for every band regardless of its own enabled toggle — beat
      // detection reads AUDIO_TINT_BANDS[0] (Bass)'s rawEnergy directly, so
      // it keeps working even if Bass is muted out of the hue tint itself.
      band.rawEnergy = sum / (end - start) / 255;
      if (!band.enabled) continue;
      activeBands++;
      const energy = band.rawEnergy * band.gain;
      weightedHue += band.hue * energy;
      totalEnergy += energy;
    }
    if (totalEnergy > 0) audioTintHue = weightedHue / totalEnergy;
    audioTintLevel = activeBands > 0 ? Math.min(1, totalEnergy / activeBands) : 0;
  }

  // One shared microphone tick drives both audio colour tint (hue/level) and
  // beat-flash detection, so turning either one on is enough to start it and
  // both keep working off the same analyser without opening the mic twice.
  function audioAnalysisTick() {
    computeAudioTintHue();
    if (beatFlashEnabled) detectBeat();
  }

  function audioAnalysisNeeded() {
    return audioTintEnabled || beatFlashEnabled;
  }

  async function startAudioTint() {
    try {
      audioTintStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      showCameraStatus("Couldn't use the microphone for audio colour tint / beat flash: " + (err.message || err.name || "unknown error"));
      return false;
    }
    audioTintCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioTintCtx.createMediaStreamSource(audioTintStream);
    audioTintAnalyser = audioTintCtx.createAnalyser();
    audioTintAnalyser.fftSize = audioTintFftSize;
    audioTintAnalyser.smoothingTimeConstant = audioTintSmoothing;
    source.connect(audioTintAnalyser);
    audioTintFreqData = new Uint8Array(audioTintAnalyser.frequencyBinCount);
    updateAudioTintBandsFromUi();
    const nyquist = audioTintCtx.sampleRate / 2;
    AUDIO_TINT_BANDS.forEach((band) => {
      band.from = Math.min(1, band.fromHz / nyquist);
      band.to = Math.min(1, band.toHz / nyquist);
    });
    bassHistory = [];
    lastBeatAt = 0;
    audioTintIntervalId = setInterval(audioAnalysisTick, audioTintUpdateMs);
    return true;
  }

  function stopAudioTint() {
    if (audioTintIntervalId) { clearInterval(audioTintIntervalId); audioTintIntervalId = null; }
    if (audioTintStream) { audioTintStream.getTracks().forEach((t) => t.stop()); audioTintStream = null; }
    if (audioTintCtx) { audioTintCtx.close().catch(() => {}); audioTintCtx = null; }
    audioTintAnalyser = null;
    audioTintFreqData = null;
  }

  function maybeStopAudioAnalysis() {
    if (!audioAnalysisNeeded()) stopAudioTint();
  }

  async function toggleAudioTint() {
    if (audioTintEnabled) {
      audioTintEnabled = false;
      saveAudioTintEnabledPref();
      updateAudioTintUi();
      maybeStopAudioAnalysis();
      return;
    }
    const started = audioTintCtx ? true : await startAudioTint();
    if (!started) return;
    audioTintEnabled = true;
    saveAudioTintEnabledPref();
    updateAudioTintUi();
  }

  // ---- Beat flash (ported from Sound Nebula) ----

  // Same bass-energy-history threshold detector as Sound Nebula's
  // detectBeat(): a hit only counts once it clears both an absolute floor
  // and a multiple of its own recent rolling average, and only after a
  // cooldown since the last one so a single sustained hit doesn't retrigger.
  function detectBeat() {
    const bass = AUDIO_TINT_BANDS[0].rawEnergy;
    bassHistory.push(bass);
    if (bassHistory.length > BEAT_HISTORY_LEN) bassHistory.shift();
    if (bassHistory.length < 8) return;

    // sensitivity 0 -> harder to trigger (high bar), 1 -> easier (low bar).
    const absThreshold = lerp(0.30, 0.08, beatSensitivity);
    const relThreshold = lerp(1.6, 1.12, beatSensitivity);

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
      if (beatSyncDelayMs > 0) {
        setTimeout(() => fireBeatEffects(strength), beatSyncDelayMs);
      } else {
        fireBeatEffects(strength);
      }
    }
  }

  function fireBeatEffects(strength) {
    if (vibrateSupported) {
      try { navigator.vibrate(35); } catch (e) { /* ignore */ }
    }
    if (torchSupported && torchTrack && !beatTorchBusy) {
      pulseBeatTorch(lerp(beatMinFlashMs, beatMaxFlashMs, strength));
    }
    if (beatScreenFlashEnabled) {
      const duration = lerp(beatMinFlashMs, beatMaxFlashMs, strength) + 60;
      // Strong hits black the screen instead of flashing colour.
      const color = strength >= SCREEN_FLASH_BLACK_THRESHOLD ? "#000000" : beatColor(strength);
      flashScreen(color, duration, strength);
    }
  }

  // Reuses audioTintHue — the same gain/enabled-weighted band blend audio
  // colour tint already computes each tick — instead of a separate
  // bass/mid/treble average, so the beat flash colour always matches
  // whichever bands are actually turned on above.
  function beatColor(strength) {
    const light = lerp(65, 92, strength) / 100;
    const sat = lerp(90, 45, strength) / 100;
    return rgbToCss(hsl2rgb(audioTintHue, sat, light));
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

  function pulseBeatTorch(durationMs) {
    beatTorchBusy = true;
    if (beatTorchInverted) {
      // Base state is ON (set when beat flash was armed); a beat briefly
      // cuts it OFF then restores ON.
      setBeatTorchConstraint(false).then(() => {
        setTimeout(() => {
          setBeatTorchConstraint(true).finally(() => { beatTorchBusy = false; });
        }, durationMs);
      }).catch(() => { beatTorchBusy = false; });
      return;
    }
    if (beatDimFlickerEnabled) {
      flickerBeatTorch(durationMs).finally(() => { beatTorchBusy = false; });
      return;
    }
    setBeatTorchConstraint(true).then(() => {
      setTimeout(() => {
        setBeatTorchConstraint(false).finally(() => { beatTorchBusy = false; });
      }, durationMs);
    }).catch(() => { beatTorchBusy = false; });
  }

  async function flickerBeatTorch(durationMs) {
    const cycles = Math.max(1, Math.round(durationMs / FLICKER_PERIOD_MS));
    const onMs = FLICKER_PERIOD_MS * FLICKER_DUTY;
    const offMs = FLICKER_PERIOD_MS - onMs;
    for (let i = 0; i < cycles; i++) {
      if (!beatDimFlickerEnabled || !torchTrack || torchTrack.readyState === "ended") break;
      await setBeatTorchConstraint(true).catch(() => {});
      await sleep(onMs);
      if (!torchSupported) break;
      await setBeatTorchConstraint(false).catch(() => {});
      await sleep(offMs);
    }
    if (torchTrack && torchTrack.readyState !== "ended") {
      await setBeatTorchConstraint(false).catch(() => {});
    }
  }

  // Distinct from the manual flashlight's own toggleTorch() but shares the
  // same underlying camera track — never stops that track on failure (it's
  // also what the corrected view renders from), only stops offering torch.
  function setBeatTorchConstraint(on) {
    if (!torchTrack || !torchSupported) return Promise.reject(new Error("torch unavailable"));
    return torchTrack.applyConstraints({ advanced: [{ torch: on }] })
      .then(() => { beatTorchFailCount = 0; })
      .catch((err) => {
        beatTorchFailCount++;
        if (beatTorchFailCount >= BEAT_TORCH_MAX_FAILS) {
          torchSupported = false;
          torchBtn.classList.add("hide");
          showCameraStatus("The camera flash stopped responding for beat flash and has been disabled.");
        }
        throw err;
      });
  }

  function saveBeatFlashEnabledPref() {
    try { localStorage.setItem(BEAT_FLASH_ENABLED_KEY, beatFlashEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveBeatSensitivityPref() {
    try { localStorage.setItem(BEAT_SENSITIVITY_KEY, String(beatSensitivity)); } catch (e) {}
  }
  function saveBeatFlashSpeedPref() {
    try { localStorage.setItem(BEAT_FLASH_SPEED_KEY, String(beatFlashSpeed)); } catch (e) {}
  }
  function saveBeatDimFlickerPref() {
    try { localStorage.setItem(BEAT_DIM_FLICKER_KEY, beatDimFlickerEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveBeatTorchInvertedPref() {
    try { localStorage.setItem(BEAT_TORCH_INVERTED_KEY, beatTorchInverted ? "1" : "0"); } catch (e) {}
  }
  function saveBeatScreenFlashPref() {
    try { localStorage.setItem(BEAT_SCREEN_FLASH_KEY, beatScreenFlashEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveBeatSyncDelayPref() {
    try { localStorage.setItem(BEAT_SYNC_DELAY_KEY, String(beatSyncDelayMs)); } catch (e) {}
  }

  function updateBeatFlashSpeed() {
    beatFlashSpeed = parseFloat(beatFlashSpeedSlider.value) / 100;
    // Slowest: a beat can retrigger at most ~2.5x/sec. Fastest: ~14x/sec
    // (close to a genuine strobe). Flash pulse length stays well inside the
    // cooldown window so pulses never bleed into the next beat.
    beatCooldownMs = lerp(400, 70, beatFlashSpeed);
    beatMinFlashMs = Math.max(18, beatCooldownMs * 0.28);
    beatMaxFlashMs = Math.max(beatMinFlashMs + 10, beatCooldownMs * 0.75);
    beatFlashSpeedLabel.textContent = `${beatFlashSpeedSlider.value}%`;
    saveBeatFlashSpeedPref();
  }

  function updateBeatSensitivity() {
    beatSensitivity = parseFloat(beatSensitivitySlider.value) / 100;
    beatSensitivityLabel.textContent = `${beatSensitivitySlider.value}%`;
    saveBeatSensitivityPref();
  }

  function updateBeatSyncDelay() {
    beatSyncDelayMs = parseFloat(beatSyncDelaySlider.value);
    beatSyncDelayLabel.textContent = `${beatSyncDelayMs} ms`;
    saveBeatSyncDelayPref();
  }

  function updateBeatFlashUi() {
    beatFlashBtn.textContent = beatFlashEnabled ? "Flash + vibrate on beat: On" : "Flash + vibrate on beat: Off";
    beatFlashBtn.classList.toggle("active", beatFlashEnabled);
    beatFlashBtn.setAttribute("aria-pressed", String(beatFlashEnabled));
    [
      beatSensitivityWrap, beatFlashSpeedWrap, beatDimFlickerWrap, beatTorchInvertedWrap,
      beatScreenFlashWrap, beatTestFlashBtn, beatSyncDelayWrap
    ].forEach((el) => el.classList.toggle("hide", !beatFlashEnabled));
  }

  async function armBeatFlash() {
    const started = audioTintCtx ? true : await startAudioTint();
    if (!started) return;
    beatFlashEnabled = true;
    saveBeatFlashEnabledPref();
    updateBeatFlashUi();
    if (torchSupported && torchTrack && beatTorchInverted) {
      beatTorchBusy = true;
      try { await setBeatTorchConstraint(true); } catch (e) { /* ignore */ } finally { beatTorchBusy = false; }
    }
  }

  async function disarmBeatFlash() {
    beatFlashEnabled = false;
    saveBeatFlashEnabledPref();
    updateBeatFlashUi();
    if (torchTrack && torchSupported) {
      beatTorchBusy = true;
      try { await setBeatTorchConstraint(false); } catch (e) { /* ignore */ } finally { beatTorchBusy = false; }
    }
    maybeStopAudioAnalysis();
  }

  async function toggleBeatFlash() {
    if (beatFlashEnabled) {
      await disarmBeatFlash();
    } else {
      await armBeatFlash();
    }
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
    saveOutlinesEnabledPref();
    updateOutlinesUi();
  }

  function updateFreezeIsolateUi() {
    freezeIsolateBtn.textContent = freezeIsolateEnabled ? "Freeze isolate: On" : "Freeze isolate: Off";
    freezeIsolateBtn.classList.toggle("active", freezeIsolateEnabled);
    freezeIsolateBtn.setAttribute("aria-pressed", String(freezeIsolateEnabled));
    [freezeBlendWrap, freezeSpreadWrap].forEach((el) => el.classList.toggle("hide", !freezeIsolateEnabled));
  }

  function toggleFreezeIsolateMode() {
    freezeIsolateEnabled = !freezeIsolateEnabled;
    saveFreezeIsolateEnabledPref();
    updateFreezeIsolateUi();
  }

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
  function loadCartoonThemePref() {
    try {
      const raw = localStorage.getItem(CARTOON_THEME_KEY);
      return CARTOON_THEME_NAMES.includes(raw) ? raw : CARTOON_DEFAULT_THEME;
    } catch (e) {
      return CARTOON_DEFAULT_THEME;
    }
  }
  function saveCartoonThemePref() {
    try { localStorage.setItem(CARTOON_THEME_KEY, cartoonTheme); } catch (e) {}
  }
  function loadCartoonThemeColorPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveCartoonThemeEnabledPref() {
    try { localStorage.setItem(CARTOON_THEME_ENABLED_KEY, cartoonThemeEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveCartoonThemeLoPref() {
    try { localStorage.setItem(CARTOON_THEME_LO_KEY, cartoonThemeLo); } catch (e) {}
  }
  function saveCartoonThemeHiPref() {
    try { localStorage.setItem(CARTOON_THEME_HI_KEY, cartoonThemeHi); } catch (e) {}
  }

  // Cartoon mode and Outlines mode can both be on at once — the shader
  // applies Cartoon's posterize + ink lines first, then layers Outlines'
  // own coloured edge overlay on top of that result (see main()).
  function updateCartoonUi() {
    cartoonBtn.textContent = cartoonEnabled ? "Cartoon mode: On" : "Cartoon mode: Off";
    cartoonBtn.classList.toggle("active", cartoonEnabled);
    cartoonBtn.setAttribute("aria-pressed", String(cartoonEnabled));
    [
      cartoonLevelsWrap, cartoonEdgeThicknessWrap, cartoonEdgeStrengthWrap, cartoonSaturationWrap,
      cartoonThemeWrap, cartoonThemeEnabledWrap, cartoonThemeLoWrap, cartoonThemeHiWrap
    ].forEach((el) => el.classList.toggle("hide", !cartoonEnabled));
  }

  function toggleCartoonMode() {
    cartoonEnabled = !cartoonEnabled;
    saveCartoonEnabledPref();
    updateCartoonUi();
  }

  function loadCvdTypePref() {
    try {
      const raw = localStorage.getItem(CVD_TYPE_KEY);
      return Object.prototype.hasOwnProperty.call(CVD_TYPE_CODES, raw) ? raw : "none";
    } catch (e) {
      return "none";
    }
  }

  function saveCvdTypePref() {
    try {
      localStorage.setItem(CVD_TYPE_KEY, cvdType);
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
  }

  function loadCvdStrengthPref() {
    try {
      const raw = parseFloat(localStorage.getItem(CVD_STRENGTH_KEY));
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
    } catch (e) {
      return 1;
    }
  }

  function saveCvdStrengthPref() {
    try {
      localStorage.setItem(CVD_STRENGTH_KEY, String(cvdStrength));
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
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
    uniform float uRotate180;
    // Crops the video to fill the canvas without distortion ("object-fit:
    // cover") — without this, whenever the camera's native aspect ratio
    // doesn't match the screen's (routinely the case in landscape), the
    // frame gets stretched non-uniformly to fill the quad and looks
    // squished. uUvScale/uUvOffset are computed in JS from the actual
    // video and canvas dimensions each frame.
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      uv = uv * uUvScale + uUvOffset;
      vUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform float uOutlineEnabled;
    uniform float uOutlineThickness;
    uniform float uOutlineBlend;
    uniform float uOutlineOpacity;
    uniform vec3 uOutlineColor;
    uniform float uAudioTintEnabled;
    uniform float uAudioTintHue;
    uniform float uAudioTintStrength;
    uniform float uAudioTintSatStrength;
    uniform float uAudioTintLightStrength;
    uniform float uAudioTintLevel;
    uniform float uCartoonEnabled;
    uniform float uCartoonLevels;
    uniform float uCartoonEdgeThickness;
    uniform float uCartoonEdgeStrength;
    uniform float uCartoonSaturation;
    uniform float uCartoonThemeEnabled;
    uniform vec3 uCartoonThemeLo;
    uniform vec3 uCartoonThemeHi;
    uniform vec2 uTexelSize;
    uniform float uSpread;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];   // hueShift(deg), satAdjust, lightAdjust
    uniform vec2 uCorrection2[${MAX_POINTS}];  // contrastAdjust, exposureAdjust
    uniform int uCvdType;      // 0=none, 1=protan, 2=deutan, 3=tritan
    uniform float uCvdStrength;
    uniform float uFreezeEnabled;
    uniform float uFreezeBlend;
    uniform float uFreezeSpread;

    float srgbToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
    }

    float linearToSrgb(float c) {
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    }

    // Machado, Oliveira & Fonseca (2009) dichromacy-simulation matrices,
    // applied directly in linear RGB. Error-redistribution implements the
    // classic "Daltonize" technique (Fidaner, Lin & Ozguven): simulate what
    // a dichromat sees, take what's lost (error = original - simulated),
    // and push that lost information into the channels the deficiency
    // doesn't affect. The protan/deutan redistribution matrix is the one
    // from that original algorithm; the tritan one is an analogous
    // derivation of our own (blue-yellow deficiency is far less commonly
    // covered by published implementations than red-green is).
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

    // Recolours the already-posterized cartoon result through a two-colour
    // gradient keyed by its own luminance ("duotone" — the same technique
    // behind classic screen-printed poster art), instead of the original
    // hues. Runs after cvCartoonize so the colour bands stay bold/flat;
    // this only remaps which colours those bands actually are. lo/hi are
    // live, user-picked colours (uCartoonThemeLo/Hi) rather than a fixed
    // preset — callers only invoke this when uCartoonThemeEnabled is on.
    vec3 cvCartoonTheme(vec3 c, vec3 lo, vec3 hi) {
      float lum = cvLuminance(c);
      return mix(lo, hi, lum);
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
      // Cartoon and Outlines can both be on at once: Cartoon's posterize +
      // ink lines run first (if enabled), then Outlines' own coloured edge
      // overlay layers on top of whatever that produced — a plain outline
      // over flat cartoon colours instead of one replacing the other.
      if (uCartoonEnabled > 0.5) {
        vec3 toon = cvCartoonize(filled, uCartoonLevels, uCartoonSaturation);
        if (uCartoonThemeEnabled > 0.5) {
          toon = cvCartoonTheme(toon, uCartoonThemeLo, uCartoonThemeHi);
        }
        float line = cvCartoonLine(vUv, uCartoonEdgeThickness, uCartoonEdgeStrength);
        finalColor = mix(toon, vec3(0.02), line);
      }
      if (uOutlineEnabled > 0.5) {
        float edge = cvEdgeStrength(vUv, uOutlineThickness) * uOutlineOpacity;
        vec3 outlineColor = uOutlineColor * edge;
        finalColor = mix(finalColor, outlineColor, uOutlineBlend);
      }

      // Audio colour tint: a final nudge toward the live mic's dominant band
      // hue, taking the shortest way around the colour wheel so it never
      // jumps the long way round. Runs after everything else so it's a mood
      // pass over whatever's already on screen. Saturation/lightness are
      // optional (0 by default — pure hue-only tint, same as before);
      // uAudioTintLevel is the live overall loudness across enabled bands,
      // so louder audio pushes sat/lightness further in whichever direction
      // each strength slider is set (negative pulls the other way).
      if (uAudioTintEnabled > 0.5) {
        vec3 tintHsl = rgb2hsl(finalColor);
        float hueDiff = mod(uAudioTintHue - tintHsl.x + 540.0, 360.0) - 180.0;
        tintHsl.x = mod(tintHsl.x + hueDiff * uAudioTintStrength + 360.0, 360.0);
        tintHsl.y = clamp(tintHsl.y + uAudioTintLevel * uAudioTintSatStrength, 0.0, 1.0);
        tintHsl.z = clamp(tintHsl.z + uAudioTintLevel * uAudioTintLightStrength, 0.0, 1.0);
        finalColor = hsl2rgb(tintHsl);
      }

      // Freeze isolate: a final mask over everything above, so it works
      // the same regardless of what else (Cartoon, Outlines, audio tint)
      // is on. Matched against a small 5-tap neighbourhood average, not
      // the single raw texel "original" the correction loop above uses —
      // real camera video (and even the fake test device used to verify
      // this) has enough per-pixel noise that a single-texel Lab distance
      // put the calibrated colour itself right at the edge of its own
      // match zone, flickering in and out — the same noise that also let
      // plainly different colours drift into a loose "sort of matches"
      // zone instead of committing to black. Averaging first is the same
      // fix calibration itself already uses (sampleCenterColor averages a
      // 12x12 patch rather than reading one pixel). No saved colours
      // means minDist stays at its huge initial value, so the mask is 0
      // (fully black) everywhere, same as "only frozen colours, and
      // there are none".
      if (uFreezeEnabled > 0.5) {
        vec3 smoothed = texture2D(uTex, vUv).rgb;
        smoothed += texture2D(uTex, vUv + vec2(uTexelSize.x, 0.0)).rgb;
        smoothed += texture2D(uTex, vUv - vec2(uTexelSize.x, 0.0)).rgb;
        smoothed += texture2D(uTex, vUv + vec2(0.0, uTexelSize.y)).rgb;
        smoothed += texture2D(uTex, vUv - vec2(0.0, uTexelSize.y)).rgb;
        smoothed *= 0.2;
        vec3 labSmoothed = rgb2lab(smoothed);
        float minDist = 1.0e6;
        for (int i = 0; i < ${MAX_POINTS}; i++) {
          if (i >= uPointCount) break;
          minDist = min(minDist, distance(labSmoothed, uSourceLab[i]));
        }
        float mask = 1.0 - smoothstep(uFreezeSpread * 0.5, uFreezeSpread, minDist);
        finalColor = mix(finalColor, finalColor * mask, uFreezeBlend);
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

  // Builds a fresh WebGL context + compiled program + quad + video texture
  // on the given canvas, running the same correction shader as the main
  // stage. Used both for the main on-screen stage and for a second,
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

    const uni = {
      uTex: glCtx.getUniformLocation(prog, "uTex"),
      uBlend: glCtx.getUniformLocation(prog, "uBlend"),
      uOutlineEnabled: glCtx.getUniformLocation(prog, "uOutlineEnabled"),
      uOutlineThickness: glCtx.getUniformLocation(prog, "uOutlineThickness"),
      uOutlineBlend: glCtx.getUniformLocation(prog, "uOutlineBlend"),
      uOutlineOpacity: glCtx.getUniformLocation(prog, "uOutlineOpacity"),
      uOutlineColor: glCtx.getUniformLocation(prog, "uOutlineColor"),
      uAudioTintEnabled: glCtx.getUniformLocation(prog, "uAudioTintEnabled"),
      uAudioTintHue: glCtx.getUniformLocation(prog, "uAudioTintHue"),
      uAudioTintStrength: glCtx.getUniformLocation(prog, "uAudioTintStrength"),
      uAudioTintSatStrength: glCtx.getUniformLocation(prog, "uAudioTintSatStrength"),
      uAudioTintLightStrength: glCtx.getUniformLocation(prog, "uAudioTintLightStrength"),
      uAudioTintLevel: glCtx.getUniformLocation(prog, "uAudioTintLevel"),
      uCartoonEnabled: glCtx.getUniformLocation(prog, "uCartoonEnabled"),
      uCartoonLevels: glCtx.getUniformLocation(prog, "uCartoonLevels"),
      uCartoonEdgeThickness: glCtx.getUniformLocation(prog, "uCartoonEdgeThickness"),
      uCartoonEdgeStrength: glCtx.getUniformLocation(prog, "uCartoonEdgeStrength"),
      uCartoonSaturation: glCtx.getUniformLocation(prog, "uCartoonSaturation"),
      uCartoonThemeEnabled: glCtx.getUniformLocation(prog, "uCartoonThemeEnabled"),
      uCartoonThemeLo: glCtx.getUniformLocation(prog, "uCartoonThemeLo"),
      uCartoonThemeHi: glCtx.getUniformLocation(prog, "uCartoonThemeHi"),
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
      uCvdStrength: glCtx.getUniformLocation(prog, "uCvdStrength"),
      uFreezeEnabled: glCtx.getUniformLocation(prog, "uFreezeEnabled"),
      uFreezeBlend: glCtx.getUniformLocation(prog, "uFreezeBlend"),
      uFreezeSpread: glCtx.getUniformLocation(prog, "uFreezeSpread")
    };
    return { gl: glCtx, program: prog, uniforms: uni, quadBuffer: qBuf, videoTexture: tex };
  }

  function initGL() {
    const ctxState = initGLContext(stage);
    gl = ctxState.gl;
    program = ctxState.program;
    uniforms = ctxState.uniforms;
    quadBuffer = ctxState.quadBuffer;
    videoTexture = ctxState.videoTexture;
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
  // calibrated points, CVD type, spread, rotation — except uBlend is
  // always 1.0 here, regardless of the operator's own "True <-> Corrected"
  // slider on the main stage. That slider is for locally previewing how
  // strong the correction looks; what gets sent to a viewer as "Modified"
  // should always be the full correction, not whatever the operator
  // happens to be locally scrubbing through.
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
    fixedGl.viewport(0, 0, fixedCorrectionCanvas.width, fixedCorrectionCanvas.height);
    uploadPointUniforms();
  }

  function uploadPointUniformsTo(glCtx, prog, uni) {
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = rgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
      corr2Arr[i * 2] = p.contrastAdjust || 0; corr2Arr[i * 2 + 1] = p.exposureAdjust || 0;
    }
    glCtx.useProgram(prog);
    glCtx.uniform1i(uni.uPointCount, count);
    glCtx.uniform3fv(uni.uSourceLab, labArr);
    glCtx.uniform3fv(uni.uCorrection, corrArr);
    glCtx.uniform2fv(uni.uCorrection2, corr2Arr);
  }

  function uploadPointUniforms() {
    uploadPointUniformsTo(gl, program, uniforms);
    if (fixedGl) uploadPointUniformsTo(fixedGl, fixedProgram, fixedUniforms);
  }

  // "object-fit: cover" for the video-in-canvas draws below: crops
  // whichever axis the video overhangs on, so the frame always fills the
  // canvas without distorting — otherwise a camera aspect ratio that
  // doesn't match the screen's (routinely the case in landscape) gets
  // stretched non-uniformly and looks squished.
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
      const cover = computeCoverUv(video.videoWidth, video.videoHeight, stage.width, stage.height);

      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, parseFloat(blendSlider.value) / 100);
      gl.uniform1f(uniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uOutlineThickness, outlineThickness);
      gl.uniform1f(uniforms.uOutlineBlend, outlineBlend);
      gl.uniform1f(uniforms.uOutlineOpacity, outlineOpacity);
      gl.uniform3f(uniforms.uOutlineColor, outlineColorRgb[0], outlineColorRgb[1], outlineColorRgb[2]);
      gl.uniform1f(uniforms.uAudioTintEnabled, audioTintEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uAudioTintHue, audioTintHue);
      gl.uniform1f(uniforms.uAudioTintStrength, audioTintStrength);
      gl.uniform1f(uniforms.uAudioTintSatStrength, audioTintSatStrength);
      gl.uniform1f(uniforms.uAudioTintLightStrength, audioTintLightStrength);
      gl.uniform1f(uniforms.uAudioTintLevel, audioTintLevel);
      gl.uniform1f(uniforms.uCartoonEnabled, cartoonEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uCartoonLevels, cartoonLevels);
      gl.uniform1f(uniforms.uCartoonEdgeThickness, cartoonEdgeThickness);
      gl.uniform1f(uniforms.uCartoonEdgeStrength, cartoonEdgeStrength);
      gl.uniform1f(uniforms.uCartoonSaturation, cartoonSaturation);
      gl.uniform1f(uniforms.uCartoonThemeEnabled, cartoonThemeEnabled ? 1 : 0);
      gl.uniform3f(uniforms.uCartoonThemeLo, cartoonThemeLoRgb[0], cartoonThemeLoRgb[1], cartoonThemeLoRgb[2]);
      gl.uniform3f(uniforms.uCartoonThemeHi, cartoonThemeHiRgb[0], cartoonThemeHiRgb[1], cartoonThemeHiRgb[2]);
      gl.uniform2f(uniforms.uTexelSize, 1 / video.videoWidth, 1 / video.videoHeight);
      gl.uniform1f(uniforms.uSpread, spread);
      gl.uniform1f(uniforms.uRotate180, rotate180 ? 1 : 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.uniform1i(uniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
      gl.uniform1f(uniforms.uCvdStrength, cvdStrength);
      gl.uniform1f(uniforms.uFreezeEnabled, freezeIsolateEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uFreezeBlend, freezeBlend);
      gl.uniform1f(uniforms.uFreezeSpread, freezeSpread);
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
        // Same correction as the main draw above (points, spread, CVD type,
        // rotation, cover-crop) — the only deliberate difference is uBlend
        // pinned to 1.0 instead of following the local blendSlider, so
        // what's shared to a viewer is always the full correction
        // regardless of what the operator is locally previewing.
        fixedGl.bindTexture(fixedGl.TEXTURE_2D, fixedVideoTexture);
        fixedGl.texImage2D(fixedGl.TEXTURE_2D, 0, fixedGl.RGBA, fixedGl.RGBA, fixedGl.UNSIGNED_BYTE, video);
        fixedGl.uniform1i(fixedUniforms.uTex, 0);
        fixedGl.uniform1f(fixedUniforms.uBlend, 1);
        fixedGl.uniform1f(fixedUniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uOutlineThickness, outlineThickness);
        fixedGl.uniform1f(fixedUniforms.uOutlineBlend, outlineBlend);
        fixedGl.uniform1f(fixedUniforms.uOutlineOpacity, outlineOpacity);
        fixedGl.uniform3f(fixedUniforms.uOutlineColor, outlineColorRgb[0], outlineColorRgb[1], outlineColorRgb[2]);
        fixedGl.uniform1f(fixedUniforms.uAudioTintEnabled, audioTintEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uAudioTintHue, audioTintHue);
        fixedGl.uniform1f(fixedUniforms.uAudioTintStrength, audioTintStrength);
        fixedGl.uniform1f(fixedUniforms.uAudioTintSatStrength, audioTintSatStrength);
        fixedGl.uniform1f(fixedUniforms.uAudioTintLightStrength, audioTintLightStrength);
        fixedGl.uniform1f(fixedUniforms.uAudioTintLevel, audioTintLevel);
        fixedGl.uniform1f(fixedUniforms.uCartoonEnabled, cartoonEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uCartoonLevels, cartoonLevels);
        fixedGl.uniform1f(fixedUniforms.uCartoonEdgeThickness, cartoonEdgeThickness);
        fixedGl.uniform1f(fixedUniforms.uCartoonEdgeStrength, cartoonEdgeStrength);
        fixedGl.uniform1f(fixedUniforms.uCartoonSaturation, cartoonSaturation);
        fixedGl.uniform1f(fixedUniforms.uCartoonThemeEnabled, cartoonThemeEnabled ? 1 : 0);
        fixedGl.uniform3f(fixedUniforms.uCartoonThemeLo, cartoonThemeLoRgb[0], cartoonThemeLoRgb[1], cartoonThemeLoRgb[2]);
        fixedGl.uniform3f(fixedUniforms.uCartoonThemeHi, cartoonThemeHiRgb[0], cartoonThemeHiRgb[1], cartoonThemeHiRgb[2]);
        fixedGl.uniform2f(fixedUniforms.uTexelSize, 1 / video.videoWidth, 1 / video.videoHeight);
        fixedGl.uniform1f(fixedUniforms.uSpread, spread);
        fixedGl.uniform1f(fixedUniforms.uRotate180, rotate180 ? 1 : 0);
        fixedGl.uniform2f(fixedUniforms.uUvScale, cover.sx, cover.sy);
        fixedGl.uniform2f(fixedUniforms.uUvOffset, cover.ox, cover.oy);
        fixedGl.uniform1i(fixedUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
        fixedGl.uniform1f(fixedUniforms.uCvdStrength, cvdStrength);
        fixedGl.uniform1f(fixedUniforms.uFreezeEnabled, freezeIsolateEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uFreezeBlend, freezeBlend);
        fixedGl.uniform1f(fixedUniforms.uFreezeSpread, freezeSpread);
        fixedGl.drawArrays(fixedGl.TRIANGLE_STRIP, 0, 4);
      }
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
      updateFloatingCaptureBarVisibility();
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  // ---- Camera-only broadcast mode ----
  // For a two-device setup: this device just points somewhere and streams
  // its raw feed, with no controls of its own to fumble with. All
  // calibration/correction/control happens on whichever other device
  // connects via "Receive camera from another device" (see
  // connectAsReceiver below) — that device gets the raw feed and runs its
  // own full local correction pipeline against it, same as if it had its
  // own camera. The camera view itself stays fully visible the whole
  // time — this only hides the overlay, same as a normal local start, and
  // shows a small non-blocking corner badge with the room code instead of
  // the full control HUD.
  async function enterCameraOnlyMode() {
    overlay.classList.add("hide");
    cameraOnlyBadge.classList.remove("hide");
    cameraOnlyStatusText.textContent = "Connecting to relay…";
    await startTabletShare();
    updateFloatingCaptureBarVisibility();
  }

  function exitCameraOnlyMode() {
    stopTabletShare("");
    cameraOnlyBadge.classList.add("hide");
    hud.classList.remove("hide");
    updateFloatingCaptureBarVisibility();
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
  // — locking it down keeps the corrected view (and any colour you're
  // calibrating against) consistent instead of drifting as the camera
  // hunts for exposure. Same capability-detection pattern as the torch:
  // only exposed on some Android/Chrome-based cameras, not iOS Safari.

  // Some devices report exposureTime/iso/exposureCompensation as raw
  // floats with binary-rounding noise (e.g. an exposureCompensation of
  // "0" arriving as 2.98023224e-8) — rounding before display keeps the
  // labels readable instead of showing scientific notation or long
  // fractional tails.
  function formatExposureNumber(value, decimals) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(n * factor) / factor;
    return String(Object.is(rounded, -0) ? 0 : rounded);
  }

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
      shutterLabel.textContent = formatExposureNumber(shutterSlider.value, 0);
      shutterWrap.classList.remove("hide");
    }
    if (caps.iso) {
      isoSlider.min = caps.iso.min;
      isoSlider.max = caps.iso.max;
      isoSlider.step = caps.iso.step || 1;
      isoSlider.value = settings.iso != null ? settings.iso : caps.iso.min;
      isoLabel.textContent = formatExposureNumber(isoSlider.value, 0);
      isoWrap.classList.remove("hide");
    }
    if (caps.exposureCompensation) {
      evSlider.min = caps.exposureCompensation.min;
      evSlider.max = caps.exposureCompensation.max;
      evSlider.step = caps.exposureCompensation.step || 0.1;
      evSlider.value = settings.exposureCompensation != null ? settings.exposureCompensation : 0;
      evLabel.textContent = formatExposureNumber(evSlider.value, 2);
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
    shutterLabel.textContent = formatExposureNumber(shutterSlider.value, 0);
    if (!exposureTrack) return;
    if (currentExposureMode !== "manual") await setExposureMode("manual");
    try {
      await exposureTrack.applyConstraints({ advanced: [{ exposureTime: parseFloat(shutterSlider.value) }] });
    } catch (err) {}
  }

  async function applyIso() {
    isoLabel.textContent = formatExposureNumber(isoSlider.value, 0);
    if (!exposureTrack) return;
    if (currentExposureMode !== "manual") await setExposureMode("manual");
    try {
      await exposureTrack.applyConstraints({ advanced: [{ iso: parseFloat(isoSlider.value) }] });
    } catch (err) {}
  }

  async function applyExposureCompensation() {
    evLabel.textContent = formatExposureNumber(evSlider.value, 2);
    if (!exposureTrack) return;
    // Unlike shutter/ISO, exposure compensation is meaningful in auto mode
    // too (it's what an EV +/- dial does on a regular camera), so this one
    // doesn't force a switch to manual.
    try {
      await exposureTrack.applyConstraints({ advanced: [{ exposureCompensation: parseFloat(evSlider.value) }] });
    } catch (err) {}
  }

  // ---- Photo & video capture ----
  // Captures the fully-composited stage canvas — true/corrected blend,
  // per-point calibration, and any colour-blindness-type correction all
  // baked in — exactly what's currently on screen, not a re-render.

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
      downloadBlob(blob, `colour-vision-photo-${timestampForFilename()}.png`);
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
    if (isRecording || !gl || typeof stage.captureStream !== "function") return;
    recordingMimeType = pickRecordingMimeType();
    if (!recordingMimeType) {
      showCameraStatus("Video recording isn't supported in this browser.");
      return;
    }
    let canvasStream;
    try {
      canvasStream = stage.captureStream(recordFps);
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
        downloadBlob(blob, `colour-vision-video-${timestampForFilename()}.${ext}`);
      } else {
        showCameraStatus("Recording produced no data — try again.");
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

  // ---- Floating capture bar ----
  // Photo/Record live inside #hud, which the user can tap away entirely
  // (see the body click handler near the bottom of this file) — this
  // small floating duplicate stays reachable in that "no HUD" state, so
  // capture never needs the full control panel back up. It's draggable
  // (long-press, then move, then release) so it can be parked wherever's
  // convenient — out from under a thumb, or off the actual subject.

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

  // Only visible once a corrected view actually exists (gl set, whether
  // from a local camera or a received tablet feed) and the HUD itself is
  // hidden — camera-only broadcast mode has its own minimal badge and
  // doesn't need this duplicated on top of it.
  function updateFloatingCaptureBarVisibility() {
    const visible = !!gl && hud.classList.contains("hide") && cameraOnlyBadge.classList.contains("hide");
    floatingCaptureBar.classList.toggle("hide", !visible);
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
    // reaches the Photo/Record button's own listener underneath.
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
    showCameraStatus(`Volume shutter: ${shutterMode === "video" ? "Video" : "Photo"} mode`);
    if (shutterModeStatusTimer) clearTimeout(shutterModeStatusTimer);
    shutterModeStatusTimer = setTimeout(hideCameraStatus, 1600);
  }

  // ---- Tablet viewer (WebRTC, signaled over public MQTT relays) ----
  // Streams the same fully-composited stage canvas used for photo/video
  // capture to a second device (e.g. a tablet) as a read-only viewer. The
  // video itself is still direct peer-to-peer WebRTC — no backend needed
  // for that — but the one-time offer/answer handshake used to be a manual
  // copy/paste of an SDP blob, which doesn't work between two unrelated
  // devices with no clipboard sync between them. Instead, a short room code
  // is generated here and the handshake rides a few public MQTT-over-
  // websocket brokers (retained messages, addressed by device ID so other
  // rooms' traffic is ignored) — the other device only has to type in a
  // 5-character code. viewer.html is the minimal read-only page that
  // receives it. Same pattern as the live-sharing feature in this author's
  // darts scorer app.

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
  // (viewerStatus) and the camera-only mode's own corner badge
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
  // phone in camera-only mode above) just point somewhere while another
  // device (e.g. a tablet) does all the calibration and shows the result.
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
        video.play().catch((err) => console.error("[receiver] video.play() failed", err));
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
        console.error("[receiver] handleOffer failed", err);
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
    setReceiverStatus("Receiving from camera device.");
    overlay.classList.add("hide");
    hud.classList.remove("hide");
    resizeStage();
    initGL();
    uploadPointUniforms();
    renderLoop();
    applyReceiverModeUi();
    updateFloatingCaptureBarVisibility();
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

  // ---- Sampling for calibration ----
  // Averages a small patch from the raw video frame (not the shader's
  // corrected output) so calibration is always anchored to the real colour.

  const SAMPLE_SIZE = 12;

  function sampleCenterColor() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    sampleCanvas.width = 64;
    sampleCanvas.height = 64;
    const vw = video.videoWidth, vh = video.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.15;
    const sx = Math.min(Math.max(vw * aimFracX - cropSize / 2, 0), vw - cropSize);
    const sy = Math.min(Math.max(vh * aimFracY - cropSize / 2, 0), vh - cropSize);
    sampleCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 64, 64);
    const data = sampleCtx.getImageData(24, 24, SAMPLE_SIZE, SAMPLE_SIZE).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  // Converts a tap position (viewport CSS pixels) into a fraction of the
  // raw video frame (0,0 top-left .. 1,1 bottom-right) — the same
  // object-fit:cover cropping and rotate180 flip the correction shader
  // applies, run in reverse, so tapping a point on screen samples that
  // same point in the actual camera image rather than wherever it lands
  // in the video's native (possibly cropped/rotated) frame.
  function screenToVideoFraction(clientX, clientY) {
    const canvasUvX = clientX / window.innerWidth;
    const canvasUvY = 1 - clientY / window.innerHeight;
    const cover = computeCoverUv(video.videoWidth, video.videoHeight, window.innerWidth, window.innerHeight);
    let vx = canvasUvX * cover.sx + cover.ox;
    let vy = canvasUvY * cover.sy + cover.oy;
    if (rotate180) { vx = 1 - vx; vy = 1 - vy; }
    return { x: clamp01(vx), y: clamp01(1 - vy) };
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
  // The four bottom-docked overlays (tune, saved-colours, choose-colour,
  // viewer-pairing) share a z-index and their triggers (HUD buttons) stay
  // reachable even while one is open, so only one may ever be shown at a
  // time. Hiding the viewer panel here does NOT disconnect an active
  // broadcast — that keeps running in the background, same as recording.

  function hideOverlayPanels() {
    tunePanel.classList.add("hide");
    pointsPanel.classList.add("hide");
    choosePanel.classList.add("hide");
    viewerPanel.classList.add("hide");
  }

  function openTuneForNewPoint(sourceColor) {
    hideOverlayPanels();
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
    hideOverlayPanels();
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
      }
    } else {
      if (points.length >= MAX_POINTS) {
        setStatus(`Limit of ${MAX_POINTS} saved colours reached — delete one to add another.`);
        return;
      }
      points.push({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: labelInput.value.trim(),
        sourceColor: frozenColor,
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

  // ---- Saved-colours grid ----

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
      const colorName = nearestColorName(p.sourceColor);
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
      sw.style.background = rgbToCss(p.sourceColor);
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
    savePoints();
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
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

  // ---- Templates (named snapshots of the full correction setup) ----
  // Captures the saved-colours list plus the settings that don't already
  // persist on their own here (blend), and the ones that do (spread,
  // rotate, colour-blindness type/strength, outlines, cartoon mode) — so a
  // template is a complete correction setup you can switch back to, not
  // just a colour set. Older templates saved before this only ever had a
  // `points` array; applySettingsSnapshot() skips any field that isn't
  // present, so loading one just leaves those settings as they currently
  // are instead of erroring or zeroing them out.

  function currentSettingsSnapshot() {
    return {
      blend: Number(blendSlider.value),
      spread,
      rotate180,
      cvdType,
      cvdStrength,
      outlinesEnabled,
      outlineThickness,
      outlineBlend,
      outlineOpacity,
      outlineColor,
      freezeIsolateEnabled,
      freezeBlend,
      freezeSpread,
      cartoonEnabled,
      cartoonLevels,
      cartoonEdgeThickness,
      cartoonEdgeStrength,
      cartoonSaturation,
      cartoonTheme,
      // audioTintEnabled/beatFlashEnabled ARE captured — loading a template
      // is an explicit user action (clicking Load), so restoring them tries
      // the same silent-resume path already used for a page reload (works
      // if mic/camera permission is already granted; otherwise it prompts,
      // same as clicking the button by hand would).
      audioTintEnabled,
      audioTintStrength,
      audioTintSatStrength,
      audioTintLightStrength,
      audioTintSmoothing,
      audioTintFftSize,
      audioTintUpdateMs,
      audioTintExtraBandsVisible,
      ...audioTintBandsSnapshot(),
      cartoonThemeEnabled,
      cartoonThemeLo,
      cartoonThemeHi,
      beatFlashEnabled,
      beatSensitivity,
      beatFlashSpeed,
      beatDimFlickerEnabled,
      beatTorchInverted,
      beatScreenFlashEnabled,
      beatSyncDelayMs
    };
  }

  function audioTintBandSnapshotKey(bandKey, field) {
    return `audioTint${bandKey}${field}`;
  }

  function audioTintBandsSnapshot() {
    const snap = {};
    AUDIO_TINT_BAND_DEFS.forEach((def, i) => {
      const band = AUDIO_TINT_BANDS[i];
      snap[audioTintBandSnapshotKey(def.key, "Enabled")] = band.enabled;
      snap[audioTintBandSnapshotKey(def.key, "Hue")] = band.hue;
      snap[audioTintBandSnapshotKey(def.key, "Gain")] = band.gain;
      snap[audioTintBandSnapshotKey(def.key, "FromHz")] = band.fromHz;
      snap[audioTintBandSnapshotKey(def.key, "ToHz")] = band.toHz;
    });
    return snap;
  }

  // Every audio tint field's shipped default, in the exact same shape
  // applySettingsSnapshot() already knows how to restore — resetting is just
  // "load this instead of a saved template" rather than a separate code path.
  function audioTintDefaultsSnapshot() {
    const snap = {
      audioTintStrength: AUDIO_TINT_DEFAULT_STRENGTH,
      audioTintSatStrength: AUDIO_TINT_DEFAULT_SAT_STRENGTH,
      audioTintLightStrength: AUDIO_TINT_DEFAULT_LIGHT_STRENGTH,
      audioTintSmoothing: AUDIO_TINT_DEFAULT_SMOOTHING,
      audioTintFftSize: AUDIO_TINT_DEFAULT_FFT_SIZE,
      audioTintUpdateMs: AUDIO_TINT_DEFAULT_UPDATE_MS,
      audioTintExtraBandsVisible: false
    };
    AUDIO_TINT_BAND_DEFS.forEach((def) => {
      snap[audioTintBandSnapshotKey(def.key, "Enabled")] = def.enabled;
      snap[audioTintBandSnapshotKey(def.key, "Hue")] = def.hue;
      snap[audioTintBandSnapshotKey(def.key, "Gain")] = def.gain;
      snap[audioTintBandSnapshotKey(def.key, "FromHz")] = def.fromHz;
      snap[audioTintBandSnapshotKey(def.key, "ToHz")] = def.toHz;
    });
    return snap;
  }

  // Resets every audio tint slider/band back to its shipped default.
  // Deliberately doesn't touch audioTintEnabled — this resets the tuning,
  // not whether the feature itself is currently on.
  function resetAudioTint() {
    applySettingsSnapshot(audioTintDefaultsSnapshot());
  }

  function applySettingsSnapshot(s) {
    if (!s || typeof s !== "object") return;
    if (Number.isFinite(s.blend)) {
      blendSlider.value = String(s.blend);
      blendLabel.textContent = `${blendSlider.value}%`;
    }
    if (Number.isFinite(s.spread)) {
      spread = s.spread;
      spreadSlider.value = String(spread);
      spreadLabel.textContent = spreadDescription(spread);
      saveSpreadPref();
    }
    if (typeof s.rotate180 === "boolean") {
      rotate180 = s.rotate180;
      rotateBtn.classList.toggle("active", rotate180);
      saveRotatePref();
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
      outlineColorRgb = hexToRgb01(outlineColor);
      outlineColorInput.value = outlineColor;
      saveOutlineColorPref();
    }
    if (typeof s.freezeIsolateEnabled === "boolean" && s.freezeIsolateEnabled !== freezeIsolateEnabled) toggleFreezeIsolateMode();
    if (Number.isFinite(s.freezeBlend)) {
      freezeBlend = s.freezeBlend;
      freezeBlendSlider.value = String(Math.round(freezeBlend * 100));
      freezeBlendLabel.textContent = `${freezeBlendSlider.value}%`;
      saveFreezeBlendPref();
    }
    if (Number.isFinite(s.freezeSpread)) {
      freezeSpread = s.freezeSpread;
      freezeSpreadSlider.value = String(freezeSpread);
      freezeSpreadLabel.textContent = String(freezeSpread);
      saveFreezeSpreadPref();
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
    if (typeof s.cartoonTheme === "string" && CARTOON_THEME_NAMES.includes(s.cartoonTheme)) {
      cartoonTheme = s.cartoonTheme;
      cartoonThemeSelect.value = cartoonTheme;
      saveCartoonThemePref();
    }
    if (typeof s.cartoonThemeEnabled === "boolean") {
      cartoonThemeEnabled = s.cartoonThemeEnabled;
      cartoonThemeEnabledCheckbox.checked = cartoonThemeEnabled;
      saveCartoonThemeEnabledPref();
    }
    if (typeof s.cartoonThemeLo === "string" && /^#[0-9a-f]{6}$/i.test(s.cartoonThemeLo)) {
      cartoonThemeLo = s.cartoonThemeLo;
      cartoonThemeLoRgb = hexToRgb01(cartoonThemeLo);
      cartoonThemeLoInput.value = cartoonThemeLo;
      saveCartoonThemeLoPref();
    }
    if (typeof s.cartoonThemeHi === "string" && /^#[0-9a-f]{6}$/i.test(s.cartoonThemeHi)) {
      cartoonThemeHi = s.cartoonThemeHi;
      cartoonThemeHiRgb = hexToRgb01(cartoonThemeHi);
      cartoonThemeHiInput.value = cartoonThemeHi;
      saveCartoonThemeHiPref();
    }
    if (Number.isFinite(s.audioTintStrength)) {
      audioTintStrength = s.audioTintStrength;
      audioTintStrengthSlider.value = String(Math.round(audioTintStrength * 100));
      audioTintStrengthLabel.textContent = `${audioTintStrengthSlider.value}%`;
      saveAudioTintStrengthPref();
    }
    if (Number.isFinite(s.audioTintSatStrength)) {
      audioTintSatStrength = s.audioTintSatStrength;
      audioTintSatStrengthSlider.value = String(Math.round(audioTintSatStrength * 100));
      audioTintSatStrengthLabel.textContent = `${audioTintSatStrengthSlider.value}%`;
      saveAudioTintSatStrengthPref();
    }
    if (Number.isFinite(s.audioTintLightStrength)) {
      audioTintLightStrength = s.audioTintLightStrength;
      audioTintLightStrengthSlider.value = String(Math.round(audioTintLightStrength * 100));
      audioTintLightStrengthLabel.textContent = `${audioTintLightStrengthSlider.value}%`;
      saveAudioTintLightStrengthPref();
    }
    if (Number.isFinite(s.audioTintSmoothing)) {
      audioTintSmoothing = s.audioTintSmoothing;
      audioTintSmoothingSlider.value = String(Math.round(audioTintSmoothing * 100));
      audioTintSmoothingLabel.textContent = `${audioTintSmoothingSlider.value}%`;
      if (audioTintAnalyser) audioTintAnalyser.smoothingTimeConstant = audioTintSmoothing;
      saveAudioTintSmoothingPref();
    }
    if (AUDIO_TINT_FFT_SIZE_OPTIONS.includes(s.audioTintFftSize)) {
      audioTintFftSize = s.audioTintFftSize;
      audioTintFftSizeSlider.value = String(audioTintFftSizeIndex(audioTintFftSize));
      audioTintFftSizeLabel.textContent = String(audioTintFftSize);
      if (audioTintAnalyser) {
        audioTintAnalyser.fftSize = audioTintFftSize;
        audioTintFreqData = new Uint8Array(audioTintAnalyser.frequencyBinCount);
      }
      saveAudioTintFftSizePref();
    }
    if (Number.isFinite(s.audioTintUpdateMs)) {
      audioTintUpdateMs = s.audioTintUpdateMs;
      audioTintUpdateMsSlider.value = String(audioTintUpdateMs);
      audioTintUpdateMsLabel.textContent = `${audioTintUpdateMs}ms`;
      if (audioTintIntervalId) {
        clearInterval(audioTintIntervalId);
        audioTintIntervalId = setInterval(audioAnalysisTick, audioTintUpdateMs);
      }
      saveAudioTintUpdateMsPref();
    }
    if (typeof s.audioTintExtraBandsVisible === "boolean") {
      audioTintExtraBandsVisible = s.audioTintExtraBandsVisible;
      audioTintExtraBandsCheckbox.checked = audioTintExtraBandsVisible;
      saveAudioTintExtraBandsVisiblePref();
      updateAudioTintExtraBandsVisibility();
    }
    AUDIO_TINT_BAND_DEFS.forEach((def, i) => {
      const band = AUDIO_TINT_BANDS[i];
      const controls = audioTintBandControls[i];
      const enabledKey = audioTintBandSnapshotKey(def.key, "Enabled");
      if (typeof s[enabledKey] === "boolean") {
        band.enabled = s[enabledKey];
        controls.enabled.input.checked = band.enabled;
        saveAudioTintBandPref(def.key, "Enabled", band.enabled ? "1" : "0");
      }
      const hueKey = audioTintBandSnapshotKey(def.key, "Hue");
      if (Number.isFinite(s[hueKey])) {
        band.hue = s[hueKey];
        controls.hue.slider.value = String(Math.round(band.hue));
        controls.hue.label.textContent = `${controls.hue.slider.value}°`;
        saveAudioTintBandPref(def.key, "Hue", band.hue);
      }
      const gainKey = audioTintBandSnapshotKey(def.key, "Gain");
      if (Number.isFinite(s[gainKey])) {
        band.gain = s[gainKey];
        controls.gain.slider.value = String(Math.round(band.gain * 100));
        controls.gain.label.textContent = `${controls.gain.slider.value}%`;
        saveAudioTintBandPref(def.key, "Gain", band.gain);
      }
      const fromKey = audioTintBandSnapshotKey(def.key, "FromHz");
      if (Number.isFinite(s[fromKey])) {
        band.fromHz = s[fromKey];
        controls.fromHz.slider.value = String(Math.round(band.fromHz));
        controls.fromHz.label.textContent = `${controls.fromHz.slider.value} Hz`;
        saveAudioTintBandPref(def.key, "FromHz", band.fromHz);
      }
      const toKey = audioTintBandSnapshotKey(def.key, "ToHz");
      if (Number.isFinite(s[toKey])) {
        band.toHz = s[toKey];
        controls.toHz.slider.value = String(Math.round(band.toHz));
        controls.toHz.label.textContent = `${controls.toHz.slider.value} Hz`;
        saveAudioTintBandPref(def.key, "ToHz", band.toHz);
      }
    });
    if (Number.isFinite(s.beatSensitivity)) {
      beatSensitivitySlider.value = String(Math.round(s.beatSensitivity * 100));
      updateBeatSensitivity();
    }
    if (Number.isFinite(s.beatFlashSpeed)) {
      beatFlashSpeed = s.beatFlashSpeed;
      beatFlashSpeedSlider.value = String(Math.round(beatFlashSpeed * 100));
      updateBeatFlashSpeed();
    }
    if (typeof s.beatDimFlickerEnabled === "boolean") {
      beatDimFlickerEnabled = s.beatDimFlickerEnabled;
      beatDimFlickerCheckbox.checked = beatDimFlickerEnabled;
      saveBeatDimFlickerPref();
    }
    if (typeof s.beatTorchInverted === "boolean") {
      beatTorchInverted = s.beatTorchInverted;
      beatTorchInvertedCheckbox.checked = beatTorchInverted;
      saveBeatTorchInvertedPref();
    }
    if (typeof s.beatScreenFlashEnabled === "boolean") {
      beatScreenFlashEnabled = s.beatScreenFlashEnabled;
      beatScreenFlashCheckbox.checked = beatScreenFlashEnabled;
      saveBeatScreenFlashPref();
    }
    if (Number.isFinite(s.beatSyncDelayMs)) {
      beatSyncDelaySlider.value = String(s.beatSyncDelayMs);
      updateBeatSyncDelay();
    }
    // On/off state, restored last so the mic (re)connects using whichever
    // tuning was just restored above, not stale values from before the load.
    if (typeof s.audioTintEnabled === "boolean" && s.audioTintEnabled !== audioTintEnabled) {
      toggleAudioTint();
    }
    if (typeof s.beatFlashEnabled === "boolean" && s.beatFlashEnabled !== beatFlashEnabled) {
      toggleBeatFlash();
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
    saveProfiles();
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
    savePoints();
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
    saveProfiles();
    renderProfileSelect();
    profileStatus.textContent = `Deleted template "${prof.name}".`;
  }

  // ---- Choose-colour panel ----

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
        openTuneForNewPoint(hexToRgb01(preset.hex));
      });
      presetGrid.appendChild(card);
    });
  }

  function openChoosePanel(returnFocusEl = calibrateBtn) {
    hideOverlayPanels();
    renderPresetGrid();
    choosePanelReturnFocusEl = returnFocusEl;
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
  // file instead — a backup, and a way to carry corrections to another phone.

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
      importExportStatus.textContent = "No saved colours to export yet.";
      return;
    }
    const blob = new Blob([JSON.stringify(points, null, 2)], { type: "application/json" });
    downloadBlob(blob, `colour-vision-calibration-${new Date().toISOString().slice(0, 10)}.json`);
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
      savePoints();
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
    outlineColorRgb = hexToRgb01(outlineColor);
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

  freezeIsolateBtn.addEventListener("click", toggleFreezeIsolateMode);
  freezeBlendSlider.addEventListener("input", () => {
    freezeBlend = parseFloat(freezeBlendSlider.value) / 100;
    freezeBlendLabel.textContent = `${freezeBlendSlider.value}%`;
    saveFreezeBlendPref();
  });
  freezeSpreadSlider.addEventListener("input", () => {
    freezeSpread = parseFloat(freezeSpreadSlider.value);
    freezeSpreadLabel.textContent = String(freezeSpread);
    saveFreezeSpreadPref();
  });
  freezeBlendSlider.value = String(Math.round(freezeBlend * 100));
  freezeBlendLabel.textContent = `${freezeBlendSlider.value}%`;
  freezeSpreadSlider.value = String(freezeSpread);
  freezeSpreadLabel.textContent = String(freezeSpread);
  updateFreezeIsolateUi();

  audioTintBtn.addEventListener("click", toggleAudioTint);
  audioTintResetBtn.addEventListener("click", resetAudioTint);
  audioTintStrengthSlider.addEventListener("input", () => {
    audioTintStrength = parseFloat(audioTintStrengthSlider.value) / 100;
    audioTintStrengthLabel.textContent = `${audioTintStrengthSlider.value}%`;
    saveAudioTintStrengthPref();
  });
  audioTintStrengthSlider.value = String(Math.round(audioTintStrength * 100));
  audioTintStrengthLabel.textContent = `${audioTintStrengthSlider.value}%`;

  audioTintSatStrengthSlider.addEventListener("input", () => {
    audioTintSatStrength = parseFloat(audioTintSatStrengthSlider.value) / 100;
    audioTintSatStrengthLabel.textContent = `${audioTintSatStrengthSlider.value}%`;
    saveAudioTintSatStrengthPref();
  });
  audioTintSatStrengthSlider.value = String(Math.round(audioTintSatStrength * 100));
  audioTintSatStrengthLabel.textContent = `${audioTintSatStrengthSlider.value}%`;

  audioTintLightStrengthSlider.addEventListener("input", () => {
    audioTintLightStrength = parseFloat(audioTintLightStrengthSlider.value) / 100;
    audioTintLightStrengthLabel.textContent = `${audioTintLightStrengthSlider.value}%`;
    saveAudioTintLightStrengthPref();
  });
  audioTintLightStrengthSlider.value = String(Math.round(audioTintLightStrength * 100));
  audioTintLightStrengthLabel.textContent = `${audioTintLightStrengthSlider.value}%`;

  audioTintSmoothingSlider.addEventListener("input", () => {
    audioTintSmoothing = parseFloat(audioTintSmoothingSlider.value) / 100;
    audioTintSmoothingLabel.textContent = `${audioTintSmoothingSlider.value}%`;
    if (audioTintAnalyser) audioTintAnalyser.smoothingTimeConstant = audioTintSmoothing;
    saveAudioTintSmoothingPref();
  });
  audioTintSmoothingSlider.value = String(Math.round(audioTintSmoothing * 100));
  audioTintSmoothingLabel.textContent = `${audioTintSmoothingSlider.value}%`;

  audioTintFftSizeSlider.addEventListener("input", () => {
    audioTintFftSize = AUDIO_TINT_FFT_SIZE_OPTIONS[parseInt(audioTintFftSizeSlider.value, 10)];
    audioTintFftSizeLabel.textContent = String(audioTintFftSize);
    if (audioTintAnalyser) {
      audioTintAnalyser.fftSize = audioTintFftSize;
      audioTintFreqData = new Uint8Array(audioTintAnalyser.frequencyBinCount);
    }
    saveAudioTintFftSizePref();
  });
  audioTintFftSizeSlider.value = String(audioTintFftSizeIndex(audioTintFftSize));
  audioTintFftSizeLabel.textContent = String(audioTintFftSize);

  audioTintUpdateMsSlider.addEventListener("input", () => {
    audioTintUpdateMs = parseFloat(audioTintUpdateMsSlider.value);
    audioTintUpdateMsLabel.textContent = `${audioTintUpdateMs}ms`;
    if (audioTintIntervalId) {
      clearInterval(audioTintIntervalId);
      audioTintIntervalId = setInterval(audioAnalysisTick, audioTintUpdateMs);
    }
    saveAudioTintUpdateMsPref();
  });
  audioTintUpdateMsSlider.value = String(audioTintUpdateMs);
  audioTintUpdateMsLabel.textContent = `${audioTintUpdateMs}ms`;

  audioTintExtraBandsCheckbox.addEventListener("change", () => {
    audioTintExtraBandsVisible = audioTintExtraBandsCheckbox.checked;
    saveAudioTintExtraBandsVisiblePref();
    updateAudioTintExtraBandsVisibility();
  });
  audioTintExtraBandsCheckbox.checked = audioTintExtraBandsVisible;

  AUDIO_TINT_BAND_DEFS.forEach((def, i) => {
    const band = AUDIO_TINT_BANDS[i];
    const controls = audioTintBandControls[i];

    controls.enabled.input.checked = band.enabled;
    controls.enabled.input.addEventListener("change", () => {
      updateAudioTintBandsFromUi();
      saveAudioTintBandPref(def.key, "Enabled", controls.enabled.input.checked ? "1" : "0");
    });

    controls.hue.slider.value = String(Math.round(band.hue));
    controls.hue.label.textContent = `${controls.hue.slider.value}°`;
    controls.hue.slider.addEventListener("input", () => {
      updateAudioTintBandsFromUi();
      controls.hue.label.textContent = `${controls.hue.slider.value}°`;
      saveAudioTintBandPref(def.key, "Hue", controls.hue.slider.value);
    });

    controls.gain.slider.value = String(Math.round(band.gain * 100));
    controls.gain.label.textContent = `${controls.gain.slider.value}%`;
    controls.gain.slider.addEventListener("input", () => {
      updateAudioTintBandsFromUi();
      controls.gain.label.textContent = `${controls.gain.slider.value}%`;
      saveAudioTintBandPref(def.key, "Gain", parseFloat(controls.gain.slider.value) / 100);
    });

    controls.fromHz.slider.value = String(Math.round(band.fromHz));
    controls.fromHz.label.textContent = `${controls.fromHz.slider.value} Hz`;
    controls.fromHz.slider.addEventListener("input", () => {
      updateAudioTintBandsFromUi();
      controls.fromHz.label.textContent = `${controls.fromHz.slider.value} Hz`;
      saveAudioTintBandPref(def.key, "FromHz", controls.fromHz.slider.value);
    });

    controls.toHz.slider.value = String(Math.round(band.toHz));
    controls.toHz.label.textContent = `${controls.toHz.slider.value} Hz`;
    controls.toHz.slider.addEventListener("input", () => {
      updateAudioTintBandsFromUi();
      controls.toHz.label.textContent = `${controls.toHz.slider.value} Hz`;
      saveAudioTintBandPref(def.key, "ToHz", controls.toHz.slider.value);
    });
  });
  updateAudioTintUi();

  beatFlashBtn.addEventListener("click", toggleBeatFlash);
  beatSensitivitySlider.addEventListener("input", updateBeatSensitivity);
  beatSensitivitySlider.value = String(Math.round(beatSensitivity * 100));
  beatSensitivityLabel.textContent = `${beatSensitivitySlider.value}%`;
  beatFlashSpeedSlider.addEventListener("input", updateBeatFlashSpeed);
  beatFlashSpeedSlider.value = String(Math.round(beatFlashSpeed * 100));
  updateBeatFlashSpeed();
  beatDimFlickerCheckbox.addEventListener("change", () => {
    beatDimFlickerEnabled = beatDimFlickerCheckbox.checked;
    saveBeatDimFlickerPref();
  });
  beatDimFlickerCheckbox.checked = beatDimFlickerEnabled;
  beatTorchInvertedCheckbox.addEventListener("change", async () => {
    beatTorchInverted = beatTorchInvertedCheckbox.checked;
    saveBeatTorchInvertedPref();
    if (beatFlashEnabled && torchSupported && torchTrack) {
      beatTorchBusy = true;
      try { await setBeatTorchConstraint(beatTorchInverted); } catch (e) { /* ignore */ } finally { beatTorchBusy = false; }
    }
  });
  beatTorchInvertedCheckbox.checked = beatTorchInverted;
  beatScreenFlashCheckbox.addEventListener("change", () => {
    beatScreenFlashEnabled = beatScreenFlashCheckbox.checked;
    saveBeatScreenFlashPref();
  });
  beatScreenFlashCheckbox.checked = beatScreenFlashEnabled;
  beatTestFlashBtn.addEventListener("click", () => {
    fireBeatEffects(0.7);
  });
  beatSyncDelaySlider.addEventListener("input", updateBeatSyncDelay);
  beatSyncDelaySlider.value = String(beatSyncDelayMs);
  beatSyncDelayLabel.textContent = `${beatSyncDelayMs} ms`;
  updateBeatFlashUi();

  if (audioTintEnabled || beatFlashEnabled) {
    // Persisted as on from a previous session — try to silently resume
    // (works if microphone permission was already granted; if not, this
    // fails quietly via startAudioTint()'s own status message rather than
    // blocking start-up on a fresh permission prompt). Both features share
    // one mic connection, so this only ever calls startAudioTint() once.
    const wantAudioTint = audioTintEnabled;
    const wantBeatFlash = beatFlashEnabled;
    audioTintEnabled = false;
    beatFlashEnabled = false;
    startAudioTint().then((started) => {
      audioTintEnabled = started && wantAudioTint;
      beatFlashEnabled = started && wantBeatFlash;
      saveAudioTintEnabledPref();
      saveBeatFlashEnabledPref();
      updateAudioTintUi();
      updateBeatFlashUi();
    });
  }

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
  cartoonThemeSelect.addEventListener("change", () => {
    cartoonTheme = cartoonThemeSelect.value;
    saveCartoonThemePref();
    const preset = CARTOON_THEME_PRESETS[cartoonTheme];
    cartoonThemeEnabled = !!preset;
    if (preset) {
      cartoonThemeLo = preset.lo;
      cartoonThemeHi = preset.hi;
      cartoonThemeLoRgb = hexToRgb01(cartoonThemeLo);
      cartoonThemeHiRgb = hexToRgb01(cartoonThemeHi);
      cartoonThemeLoInput.value = cartoonThemeLo;
      cartoonThemeHiInput.value = cartoonThemeHi;
      saveCartoonThemeLoPref();
      saveCartoonThemeHiPref();
    }
    cartoonThemeEnabledCheckbox.checked = cartoonThemeEnabled;
    saveCartoonThemeEnabledPref();
  });
  cartoonThemeSelect.value = cartoonTheme;

  cartoonThemeEnabledCheckbox.addEventListener("change", () => {
    cartoonThemeEnabled = cartoonThemeEnabledCheckbox.checked;
    saveCartoonThemeEnabledPref();
  });
  cartoonThemeEnabledCheckbox.checked = cartoonThemeEnabled;

  cartoonThemeLoInput.addEventListener("input", () => {
    cartoonThemeLo = cartoonThemeLoInput.value;
    cartoonThemeLoRgb = hexToRgb01(cartoonThemeLo);
    saveCartoonThemeLoPref();
  });
  cartoonThemeLoInput.value = cartoonThemeLo;

  cartoonThemeHiInput.addEventListener("input", () => {
    cartoonThemeHi = cartoonThemeHiInput.value;
    cartoonThemeHiRgb = hexToRgb01(cartoonThemeHi);
    saveCartoonThemeHiPref();
  });
  cartoonThemeHiInput.value = cartoonThemeHi;

  updateCartoonUi();

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

  // ---- Glasses mode ----
  // Fullscreen + HUD hidden + landscape where the browser allows it —
  // meant for viewing this corrected feed on tethered AR/smart glasses (or
  // any other external display mirroring the screen), which are typically
  // landscape and have no room or need for the on-screen HUD. Whatever the
  // glasses actually show is whatever this page already renders — this
  // doesn't change the correction pipeline at all, only how the page
  // presents itself once it's on an external display.
  let glassesModeActive = false;

  // The HUD's own Glasses mode button is exactly what Glasses mode hides,
  // so its floating-bar twin needs to reflect the same on/off state — both
  // updated together here rather than duplicating this in both toggle
  // functions below.
  function setGlassesModeButtonsState(active) {
    [glassesModeBtn, floatingGlassesModeBtn].forEach((btn) => {
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  async function enterGlassesMode() {
    try {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) await req.call(document.documentElement);
    } catch (e) { /* fullscreen not available/permitted — still hide the HUD below */ }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch (e) { /* not supported on this device/browser — ignore */ }
    glassesModeActive = true;
    hud.classList.add("hide");
    updateFloatingCaptureBarVisibility();
    setGlassesModeButtonsState(true);
  }

  function exitGlassesMode() {
    glassesModeActive = false;
    setGlassesModeButtonsState(false);
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ignore */ }
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      exit.call(document).catch ? exit.call(document).catch(() => {}) : exit.call(document);
    }
  }

  function toggleGlassesMode() {
    if (glassesModeActive) exitGlassesMode(); else enterGlassesMode();
  }
  glassesModeBtn.addEventListener("click", toggleGlassesMode);
  floatingGlassesModeBtn.addEventListener("click", toggleGlassesMode);

  // The browser's own fullscreen-exit gesture (Esc key, swipe-down on
  // mobile, back gesture) doesn't go through exitGlassesMode() above, so
  // this catches that path too and keeps the button/HUD state in sync.
  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (glassesModeActive && !document.fullscreenElement && !document.webkitFullscreenElement) exitGlassesMode();
    });
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
    if (!currentStream) return;
    e.preventDefault();
    if (isUp) toggleShutterMode();
    else fireShutter();
  });

  calibrateBtn.addEventListener("click", () => openChoosePanel());
  chooseAimBtn.addEventListener("click", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    startAiming();
  });
  // Previously skipped straight to aiming, with no way to reach the preset
  // swatches or the plain colour picker — the only way to open Calibrate
  // at all once the HUD (and its own calibrateBtn) is hidden, so those
  // options were entirely unreachable while the HUD was hidden or in
  // Glasses mode. Now opens the same choose panel calibrateBtn does,
  // returning focus to this button instead of the HUD's hidden one.
  floatingCalibrateBtn.addEventListener("click", () => openChoosePanel(floatingCalibrateBtn));
  colourPickerInput.addEventListener("input", () => {
    choosePanel.classList.add("hide");
    choosePanelReturnFocusEl = null;
    openTuneForNewPoint(hexToRgb01(colourPickerInput.value));
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

  savePointBtn.addEventListener("click", savePoint);
  deletePointBtn.addEventListener("click", deleteCurrentPoint);
  closeTuneBtn.addEventListener("click", closeTunePanel);

  function closePointsPanel() {
    pointsPanel.classList.add("hide");
    importExportStatus.textContent = "";
    pointsBtn.focus();
  }

  function openPointsPanel() {
    hideOverlayPanels();
    setSelectMode(false);
    importExportStatus.textContent = "";
    pointsPanel.classList.remove("hide");
    closePointsBtn.focus();
  }
  pointsBtn.addEventListener("click", openPointsPanel);
  // The HUD's own Saved colours button is unreachable whenever the HUD is
  // hidden (plain tap-to-hide, or Glasses mode) — this is the floating
  // bar's twin of it, same as Photo/Record/Calibrate already have theirs.
  floatingPointsBtn.addEventListener("click", openPointsPanel);
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

  window.addEventListener("resize", resizeStage);

  // Tap the empty camera view to hide/show the HUD — same pattern as the
  // main Sound Nebula page: taps on any button, panel, or status readout
  // are excluded so those keep working normally; only taps on the clear
  // corrected feed itself toggle the HUD away.
  function isHudTapTarget(el) {
    return !!(el && el.closest && el.closest(
      "#hud, #overlay, #cameraStatus, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel, #viewerPanel, #cameraOnlyBadge, #receiverStatusBadge, #floatingCaptureBar"
    ));
  }

  document.body.addEventListener("click", (e) => {
    if (isHudTapTarget(e.target)) return;
    hud.classList.toggle("hide");
    updateFloatingCaptureBarVisibility();
  });

  updatePointsCount();
  seedBuiltinTemplatesIfNeeded();
  renderProfileSelect();
  blendLabel.textContent = `${blendSlider.value}%`;
  spreadSlider.value = String(spread);
  spreadLabel.textContent = spreadDescription(spread);
  rotateBtn.classList.toggle("active", rotate180);
  cvdTypeSelect.value = cvdType;
  cvdStrengthWrap.classList.toggle("hide", cvdType === "none");
  cvdStrengthSlider.value = String(Math.round(cvdStrength * 100));
  cvdStrengthLabel.textContent = `${cvdStrengthSlider.value}%`;
})();
