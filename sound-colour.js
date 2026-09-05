(() => {
  "use strict";

  const MAX_POINTS = 32;
  const STORAGE_KEY = "cvCalibrationPoints_v1";
  const PROFILES_KEY = "cvProfiles_colorVision_v1";
  const BUILTIN_TEMPLATES_SEEDED_KEY = "builtinTemplatesSeeded_colorVision_v1";
  const ROTATE_KEY = "cvRotate180_v1";
  const SPREAD_KEY = "cvSpread_v1";
  const DEFAULT_SPREAD = 4;
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
  const FREEZE_DEFAULT_BLEND = 1;
  const FREEZE_DEFAULT_SPREAD = 15;
  const FREEZE_DEFAULT_TONE = 0;
  const CARTOON_DEFAULT_LEVELS = 6;
  const CARTOON_DEFAULT_EDGE_THICKNESS = 2;
  const CARTOON_DEFAULT_EDGE_STRENGTH = 0.6;
  const CARTOON_DEFAULT_SATURATION = 1.35;
  const CARTOON_THEME_DEFAULT_LO = "#0d0d0d";
  const CARTOON_THEME_DEFAULT_HI = "#f2f2f2";
  const PARTICLES_ENABLED_KEY = "particlesEnabled_colorVision_v1";
  const PARTICLE_OPACITY_KEY = "particleOpacity_colorVision_v1";
  const PARTICLE_DEFAULT_OPACITY = 70;
  // Legacy single-choice key (kept only so an old save can be migrated
  // into the 4 independent toggles below, never written again).
  const PARTICLE_BEHAVIOR_KEY = "particleBehavior_colorVision_v1";
  const PARTICLE_ORBIT_PATH_KEY = "particleOrbitPath_colorVision_v1";
  const PARTICLE_SEEK_BRIGHTNESS_KEY = "particleSeekBrightness_colorVision_v1";
  const PARTICLE_COLOUR_ATTRACT_KEY = "particleColourAttract_colorVision_v1";
  const PARTICLE_MOVE_ATTRACT_KEY = "particleMoveAttract_colorVision_v1";
  const PARTICLE_TRAIL_KEY = "particleTrail_colorVision_v1";
  const PARTICLE_DEFAULT_TRAIL = 0;
  const PARTICLE_COUNT_KEY = "particleCount_colorVision_v1";
  const PARTICLE_DEFAULT_COUNT = 30;
  const PARTICLE_SIZE_KEY = "particleSize_colorVision_v1";
  const PARTICLE_DEFAULT_SIZE = 100;
  const SCENE_GRID_W = 24;
  const SCENE_GRID_H = 14;
  // Colour proximity chime -- first step of the "Sight <-> Sound" direction
  // (see index.html's "What's next" section): a soft tone that rises in
  // pitch as the live camera view nears a saved calibration colour, an
  // audible second channel alongside the visual correction.
  const CHIME_ENABLED_KEY = "chimeEnabled_colorVision_v1";
  const CHIME_VOLUME_KEY = "chimeVolume_colorVision_v1";
  const CHIME_DEFAULT_VOLUME = 50;
  // Sound output for the chime, dominant tone, and edge texture: Synth (the
  // original built-in oscillator/noise), MIDI (real notes to a connected
  // MIDI output), or Instrument (real GM instrument samples). See the
  // "Shared instrument output" section below for how each actually works.
  const CHIME_OUTPUT_KEY = "chimeOutput_colorVision_v1";
  const CHIME_INSTRUMENT_KEY = "chimeInstrument_colorVision_v1";
  const DOM_TONE_OUTPUT_KEY = "domToneOutput_colorVision_v1";
  const DOM_TONE_INSTRUMENT_KEY = "domToneInstrument_colorVision_v1";
  const EDGE_TONE_OUTPUT_KEY = "edgeToneOutput_colorVision_v1";
  const EDGE_TONE_INSTRUMENT_KEY = "edgeToneInstrument_colorVision_v1";
  // Range/Tempo controls -- what "range" and "tempo" actually mean is
  // different for each of the three, since each reacts to something
  // different (a distance, a hue, a density):
  //   Chime: Range is how far away (in Lab colour distance) it starts
  //   responding at all; Tempo is how often it re-chimes while held
  //   steady on an exact match (it would otherwise only ever play once).
  //   Dominant tone: Range is how many octaves the scale/pitch spans;
  //   Tempo is the arpeggio's own speed (Melodic only).
  //   Edge texture: Range is how sparse/dense the rhythm pattern can get
  //   (min/max hits per bar); Tempo is the step clock's own BPM.
  const CHIME_RANGE_KEY = "chimeRange_colorVision_v1";
  const CHIME_DEFAULT_RANGE = 32;
  const CHIME_TEMPO_KEY = "chimeTempo_colorVision_v1";
  const CHIME_DEFAULT_TEMPO_MS = 600;
  const DOM_TONE_RANGE_KEY = "domToneRange_colorVision_v1";
  const DOM_TONE_DEFAULT_RANGE_OCTAVES = 2;
  const DOM_TONE_TEMPO_KEY = "domToneTempo_colorVision_v1";
  const DOM_TONE_DEFAULT_TEMPO_MS = 450;
  const EDGE_TONE_MIN_HITS_KEY = "edgeToneMinHits_colorVision_v1";
  const EDGE_TONE_DEFAULT_MIN_HITS = 2;
  const EDGE_TONE_MAX_HITS_KEY = "edgeToneMaxHits_colorVision_v1";
  const EDGE_TONE_DEFAULT_MAX_HITS = 12;
  const EDGE_TONE_TEMPO_KEY = "edgeToneTempo_colorVision_v1";
  const EDGE_TONE_DEFAULT_TEMPO_BPM = 100;
  // Pitch range: edge texture used to have no pitch at all -- every
  // Melodic hit struck one fixed MIDI note, leaving its own timbre to
  // carry the percussive character (chime and dominant tone always had
  // real pitch; this made edge texture a pure drum machine rather than a
  // sonification with the same abilities as the other two). Now density
  // itself picks a pitch within a scale spanning this many octaves, the
  // same way closeness/hue already pick pitch for chime/dominant tone --
  // see EDGE_TONE_SCALE_HZ.
  const EDGE_TONE_PITCH_RANGE_KEY = "edgeTonePitchRange_colorVision_v1";
  const EDGE_TONE_DEFAULT_PITCH_RANGE_OCTAVES = 2;
  // Colour source for the chime: Saved (needs at least one calibrated
  // colour first, the original design) or Live (no setup needed at all --
  // reacts directly to how vivid the current on-screen colour already is).
  const CHIME_SOURCE_KEY = "chimeSource_colorVision_v1";
  // Detune (cents, +-100) and Randomness (0-100%) -- shared concepts across
  // all three, but what Randomness actually randomizes differs per feature
  // (see each feature's own play/update function): the chime and dominant
  // tone's arpeggio can have their note choice nudged to a neighbouring
  // scale step instead of the deterministic one; edge texture's rhythm can
  // have individual steps flip on/off around the Euclidean pattern. All
  // three also get a touch of random pitch "humanizing" jitter layered on
  // top of Detune. At 0 (the default), every feature's output is bit-for-bit
  // identical to before these controls existed.
  const CHIME_DETUNE_KEY = "chimeDetune_colorVision_v1";
  const CHIME_RANDOMNESS_KEY = "chimeRandomness_colorVision_v1";
  const CHIME_RANDOMNESS_MAX_CENTS = 20;
  const DOM_TONE_DETUNE_KEY = "domToneDetune_colorVision_v1";
  const DOM_TONE_RANDOMNESS_KEY = "domToneRandomness_colorVision_v1";
  const DOM_TONE_RANDOMNESS_MAX_CENTS = 20;
  const EDGE_TONE_DETUNE_KEY = "edgeToneDetune_colorVision_v1";
  const EDGE_TONE_RANDOMNESS_KEY = "edgeToneRandomness_colorVision_v1";
  const EDGE_TONE_RANDOMNESS_MAX_CENTS = 20;
  // Shared loudness ceilings for the synth branch, so no channel reads as
  // quieter than another purely from an old per-channel constant that was
  // never actually tuned against the other two -- chime's pluck used 0.5,
  // dominant tone's arpeggio note used a noticeably lower 0.2 (continuous
  // drone 0.12, deliberately meant to sit in the background, which is a
  // separate, still-intentional difference from its OWN melodic mode, not
  // from chime/edge texture). Same envelope shape per channel (pluck vs.
  // pad vs. noise burst) still differs -- only the ceiling is now shared.
  const SONIFICATION_ONESHOT_PEAK = 0.5; // chime pluck, dominant tone arpeggio note, edge texture rhythmic hit
  const SONIFICATION_CONTINUOUS_PEAK = 0.3; // dominant tone drone, edge texture continuous texture
  // Bars: how many 16-step bars edge texture's rhythm cycles through before
  // repeating -- each bar rotates the same Euclidean pattern by a fixed
  // offset (a real, standard rhythm technique: rotating a Euclidean rhythm
  // produces a genuinely different-sounding groove at the same density),
  // so a busy scene doesn't just loop one identical bar forever.
  const EDGE_TONE_BARS_KEY = "edgeToneBars_colorVision_v1";
  const EDGE_TONE_DEFAULT_BARS = 1;
  // Pattern: which actual note/rhythm-generation algorithm each feature
  // uses -- previously each one only ever had a single fixed generator, and
  // Detune/Randomness/Bars above only ever varied that one generator's
  // output. This is the genuinely different-behavior switch. Every
  // feature's original generator is kept as its default value, so nothing
  // already shipped changes unless this is touched.
  //   Chime: "proximity" (original: closeness maps straight to a scale
  //   step), "random_walk" (wanders the scale, biased back toward the
  //   closeness target -- Randomness loosens the bias), "chord_cluster"
  //   (plays the proximity note plus its third together).
  //   Dominant tone (Melodic only): "arpeggio" (original: cycles a fixed
  //   chord-offset sequence off the hue-picked root), "random_walk" (wanders
  //   the whole scale, biased toward the root), "drone_pulse" (repeats the
  //   root note rhythmically instead of cycling).
  //   Edge texture (Melodic only): "euclidean" (original: the bucket
  //   algorithm), "steady_pulse" (hits fall on an evenly-spaced subdivision
  //   instead of a syncopated spread -- density picks the subdivision, not
  //   the spacing), "swing" (euclidean hit placement, but alternating long/
  //   short 16th-note timing instead of a straight grid), "random_walk"
  //   (euclidean hit placement again, but pitch wanders the scale instead
  //   of density picking the note directly -- the other three are
  //   rhythm-only, this is the note-choice one, same idea as chime's/
  //   dominant tone's own random_walk above).
  const CHIME_PATTERN_KEY = "chimePattern_colorVision_v1";
  const DOM_TONE_PATTERN_KEY = "domTonePattern_colorVision_v1";
  const EDGE_TONE_PATTERN_KEY = "edgeTonePattern_colorVision_v1";
  // Dominant colour tone -- a second, more ambient sonification: rather
  // than reacting to a saved calibration colour specifically, a soft
  // continuous tone tracks the whole scene's average colour every ~150ms --
  // hue drives pitch, lightness drives volume. A different, more general
  // "hearing the colour" channel than the chime's proximity-to-a-point one.
  const DOM_TONE_ENABLED_KEY = "domToneEnabled_colorVision_v1";
  const DOM_TONE_VOLUME_KEY = "domToneVolume_colorVision_v1";
  const DOM_TONE_DEFAULT_VOLUME = 40;
  // Continuous (the original drone) or Melodic -- an ambient arpeggio pad
  // instead: hue picks a root note on a minor-pentatonic scale (a distinct
  // scale/root from the chime's major pentatonic, so the two never sound
  // like the same instrument), and a slow, overlapping arpeggio (root,
  // third, fifth, octave) rolls through it -- a groove of its own, not a
  // sustained tone bending pitch.
  const DOM_TONE_STYLE_KEY = "domToneStyle_colorVision_v1";
  // Scientific pitch (Continuous only): replaces the hand-picked "220 +
  // (hue/360)*220" frequency mapping with one derived from real physics --
  // see hueToScientificFreqHz. The inverse of Scientific colour above (real
  // frequency -> real hue); this is real hue -> real frequency.
  const DOM_TONE_SCIENTIFIC_PITCH_KEY = "domToneScientificPitch_colorVision_v1";
  // Edge texture tone -- a third sonification channel: rather than colour,
  // this one tracks structural complexity (how much the scene's low-res
  // luminance grid varies cell-to-cell) as a filtered-noise texture --
  // busier/edgier scenes sound rougher/brighter, flat colour fields stay
  // near-silent.
  const EDGE_TONE_ENABLED_KEY = "edgeToneEnabled_colorVision_v1";
  const EDGE_TONE_VOLUME_KEY = "edgeToneVolume_colorVision_v1";
  const EDGE_TONE_DEFAULT_VOLUME = 35;
  // Continuous (the original filtered drone) or Melodic -- here that means
  // rhythmic, not pitched: short percussive noise ticks whose tempo speeds
  // up with density (busier scene = faster ticking), each brightness-
  // filtered by that same density -- a groove distinct from both the
  // chime's pitched pluck and the dominant tone's pad arpeggio.
  const EDGE_TONE_STYLE_KEY = "edgeToneStyle_colorVision_v1";
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
  // Scientific colour: replaces each band's hand-picked hue (violet/cyan/
  // pink, chosen purely for looks) with a hue derived from the band's own
  // actual measured frequency content, via the one physically real bridge
  // between sound and light -- both are waves, and doubling frequency means
  // going up an octave in either domain. See frequencyToVisibleHue() below.
  const SCIENTIFIC_COLOUR_KEY = "scientificColour_colorVision_v1";
  // Audio -> Correction: the "Sight <-> Sound" direction reaching further
  // than Audio colour tint's hue-only wash -- bass/mid/treble instead boost
  // the correction blend / spread / outline strength themselves. Shares
  // Audio colour tint's microphone/analyser (see audioAnalysisNeeded).
  const AUDIO_REACT_ENABLED_KEY = "audioReactEnabled_colorVision_v1";
  const AUDIO_REACT_STRENGTH_KEY = "audioReactStrength_colorVision_v1";
  const AUDIO_REACT_DEFAULT_STRENGTH = 40;
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
    rawEnergy: 0,
    // The hue actually used for tint/particles each tick -- the plain
    // hand-picked hue above, or (with Scientific colour on) a hue computed
    // live from this band's real measured frequency content. Seeded to the
    // hand-picked hue so nothing reads undefined before the first tick.
    effectiveHue: def.hue
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
  const BEAT_VIBRATE_KEY = "beatVibrate_colorVision_v1";
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

  const stage = document.getElementById("stage");
  const video = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  const hud = document.getElementById("hud");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const spreadSlider = document.getElementById("spreadSlider");
  const spreadLabel = document.getElementById("spreadLabel");
  const audioTintBtn = document.getElementById("audioTintBtn");
  const audioTintResetBtn = document.getElementById("audioTintResetBtn");
  const audioReactBtn = document.getElementById("audioReactBtn");
  const audioReactStrengthWrap = document.getElementById("audioReactStrengthWrap");
  const audioReactStrengthSlider = document.getElementById("audioReactStrengthSlider");
  const audioReactStrengthLabel = document.getElementById("audioReactStrengthLabel");
  const particlesBtn = document.getElementById("particlesBtn");
  const particleOpacityWrap = document.getElementById("particleOpacityWrap");
  const particleOpacitySlider = document.getElementById("particleOpacitySlider");
  const particleOpacityLabel = document.getElementById("particleOpacityLabel");
  const particleBehaviorWrap = document.getElementById("particleBehaviorWrap");
  const particleOrbitPathCheckbox = document.getElementById("particleOrbitPathCheckbox");
  const particleSeekBrightnessCheckbox = document.getElementById("particleSeekBrightnessCheckbox");
  const particleColourAttractCheckbox = document.getElementById("particleColourAttractCheckbox");
  const particleMoveAttractCheckbox = document.getElementById("particleMoveAttractCheckbox");
  const particleTrailWrap = document.getElementById("particleTrailWrap");
  const particleTrailSlider = document.getElementById("particleTrailSlider");
  const particleTrailLabel = document.getElementById("particleTrailLabel");
  const particleCountWrap = document.getElementById("particleCountWrap");
  const particleCountSlider = document.getElementById("particleCountSlider");
  const particleCountLabel = document.getElementById("particleCountLabel");
  const particleSizeWrap = document.getElementById("particleSizeWrap");
  const particleSizeSlider = document.getElementById("particleSizeSlider");
  const particleSizeLabel = document.getElementById("particleSizeLabel");
  const particleCanvas = document.getElementById("particleCanvas");
  const particleCtx = particleCanvas.getContext("2d");
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
  const scientificColourWrap = document.getElementById("scientificColourWrap");
  const scientificColourCheckbox = document.getElementById("scientificColourCheckbox");
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
  const beatVibrateWrap = document.getElementById("beatVibrateWrap");
  const beatVibrateCheckbox = document.getElementById("beatVibrateCheckbox");
  const beatTestFlashBtn = document.getElementById("beatTestFlashBtn");
  const beatSyncDelayWrap = document.getElementById("beatSyncDelayWrap");
  const beatSyncDelaySlider = document.getElementById("beatSyncDelaySlider");
  const beatSyncDelayLabel = document.getElementById("beatSyncDelayLabel");
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
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const midiOutputWrap = document.getElementById("midiOutputWrap");
  const midiOutputSelect = document.getElementById("midiOutputSelect");
  const chimeBtn = document.getElementById("chimeBtn");
  const chimeVolumeWrap = document.getElementById("chimeVolumeWrap");
  const chimeVolumeSlider = document.getElementById("chimeVolumeSlider");
  const chimeVolumeLabel = document.getElementById("chimeVolumeLabel");
  const chimeOutputWrap = document.getElementById("chimeOutputWrap");
  const chimeOutputSelect = document.getElementById("chimeOutputSelect");
  const chimeInstrumentWrap = document.getElementById("chimeInstrumentWrap");
  const chimeInstrumentSelect = document.getElementById("chimeInstrumentSelect");
  const chimeSourceWrap = document.getElementById("chimeSourceWrap");
  const chimeSourceSelect = document.getElementById("chimeSourceSelect");
  const chimeRangeWrap = document.getElementById("chimeRangeWrap");
  const chimeRangeSlider = document.getElementById("chimeRangeSlider");
  const chimeRangeLabel = document.getElementById("chimeRangeLabel");
  const chimeTempoWrap = document.getElementById("chimeTempoWrap");
  const chimeTempoSlider = document.getElementById("chimeTempoSlider");
  const chimeTempoLabel = document.getElementById("chimeTempoLabel");
  const chimeDetuneWrap = document.getElementById("chimeDetuneWrap");
  const chimeDetuneSlider = document.getElementById("chimeDetuneSlider");
  const chimeDetuneLabel = document.getElementById("chimeDetuneLabel");
  const chimeRandomnessWrap = document.getElementById("chimeRandomnessWrap");
  const chimeRandomnessSlider = document.getElementById("chimeRandomnessSlider");
  const chimeRandomnessLabel = document.getElementById("chimeRandomnessLabel");
  const chimePatternWrap = document.getElementById("chimePatternWrap");
  const chimePatternSelect = document.getElementById("chimePatternSelect");
  const domToneBtn = document.getElementById("domToneBtn");
  const domToneVolumeWrap = document.getElementById("domToneVolumeWrap");
  const domToneVolumeSlider = document.getElementById("domToneVolumeSlider");
  const domToneVolumeLabel = document.getElementById("domToneVolumeLabel");
  const domToneStyleWrap = document.getElementById("domToneStyleWrap");
  const domToneStyleSelect = document.getElementById("domToneStyleSelect");
  const domToneScientificPitchWrap = document.getElementById("domToneScientificPitchWrap");
  const domToneScientificPitchCheckbox = document.getElementById("domToneScientificPitchCheckbox");
  const domToneOutputWrap = document.getElementById("domToneOutputWrap");
  const domToneOutputSelect = document.getElementById("domToneOutputSelect");
  const domToneInstrumentWrap = document.getElementById("domToneInstrumentWrap");
  const domToneInstrumentSelect = document.getElementById("domToneInstrumentSelect");
  const domToneRangeWrap = document.getElementById("domToneRangeWrap");
  const domToneRangeSlider = document.getElementById("domToneRangeSlider");
  const domToneRangeLabel = document.getElementById("domToneRangeLabel");
  const domToneTempoWrap = document.getElementById("domToneTempoWrap");
  const domToneTempoSlider = document.getElementById("domToneTempoSlider");
  const domToneTempoLabel = document.getElementById("domToneTempoLabel");
  const domToneDetuneWrap = document.getElementById("domToneDetuneWrap");
  const domToneDetuneSlider = document.getElementById("domToneDetuneSlider");
  const domToneDetuneLabel = document.getElementById("domToneDetuneLabel");
  const domToneRandomnessWrap = document.getElementById("domToneRandomnessWrap");
  const domToneRandomnessSlider = document.getElementById("domToneRandomnessSlider");
  const domToneRandomnessLabel = document.getElementById("domToneRandomnessLabel");
  const domTonePatternWrap = document.getElementById("domTonePatternWrap");
  const domTonePatternSelect = document.getElementById("domTonePatternSelect");
  const edgeToneBtn = document.getElementById("edgeToneBtn");
  const edgeToneVolumeWrap = document.getElementById("edgeToneVolumeWrap");
  const edgeToneVolumeSlider = document.getElementById("edgeToneVolumeSlider");
  const edgeToneVolumeLabel = document.getElementById("edgeToneVolumeLabel");
  const edgeToneStyleWrap = document.getElementById("edgeToneStyleWrap");
  const edgeToneStyleSelect = document.getElementById("edgeToneStyleSelect");
  const edgeToneOutputWrap = document.getElementById("edgeToneOutputWrap");
  const edgeToneOutputSelect = document.getElementById("edgeToneOutputSelect");
  const edgeToneInstrumentWrap = document.getElementById("edgeToneInstrumentWrap");
  const edgeToneInstrumentSelect = document.getElementById("edgeToneInstrumentSelect");
  const edgeTonePitchRangeWrap = document.getElementById("edgeTonePitchRangeWrap");
  const edgeTonePitchRangeSlider = document.getElementById("edgeTonePitchRangeSlider");
  const edgeTonePitchRangeLabel = document.getElementById("edgeTonePitchRangeLabel");
  const edgeToneMinHitsWrap = document.getElementById("edgeToneMinHitsWrap");
  const edgeToneMinHitsSlider = document.getElementById("edgeToneMinHitsSlider");
  const edgeToneMinHitsLabel = document.getElementById("edgeToneMinHitsLabel");
  const edgeToneMaxHitsWrap = document.getElementById("edgeToneMaxHitsWrap");
  const edgeToneMaxHitsSlider = document.getElementById("edgeToneMaxHitsSlider");
  const edgeToneMaxHitsLabel = document.getElementById("edgeToneMaxHitsLabel");
  const edgeToneTempoWrap = document.getElementById("edgeToneTempoWrap");
  const edgeToneTempoSlider = document.getElementById("edgeToneTempoSlider");
  const edgeToneTempoLabel = document.getElementById("edgeToneTempoLabel");
  const edgeToneDetuneWrap = document.getElementById("edgeToneDetuneWrap");
  const edgeToneDetuneSlider = document.getElementById("edgeToneDetuneSlider");
  const edgeToneDetuneLabel = document.getElementById("edgeToneDetuneLabel");
  const edgeToneRandomnessWrap = document.getElementById("edgeToneRandomnessWrap");
  const edgeToneRandomnessSlider = document.getElementById("edgeToneRandomnessSlider");
  const edgeToneRandomnessLabel = document.getElementById("edgeToneRandomnessLabel");
  const edgeToneBarsWrap = document.getElementById("edgeToneBarsWrap");
  const edgeToneBarsSlider = document.getElementById("edgeToneBarsSlider");
  const edgeToneBarsLabel = document.getElementById("edgeToneBarsLabel");
  const edgeTonePatternWrap = document.getElementById("edgeTonePatternWrap");
  const edgeTonePatternSelect = document.getElementById("edgeTonePatternSelect");
  const pointsCount = document.getElementById("pointsCount");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const torchBtn = document.getElementById("torchBtn");
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const cameraStatus = document.getElementById("cameraStatus");

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
  // CVD-type correction and Cartoon mode belong to Colour Vision Extreme's
  // own broader toolset, not this page's Sight <-> Sound focus -- their UI
  // is gone here, but these stay hardcoded at their neutral/off defaults so
  // the shared correction shader (which still expects these uniforms) keeps
  // compiling and rendering unchanged.
  const cvdType = "none";
  const cvdStrength = 1;
  let outlinesEnabled = (() => {
    try { return localStorage.getItem(OUTLINE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let outlineThickness = loadOutlineNumberPref(OUTLINE_THICKNESS_KEY, OUTLINE_DEFAULT_THICKNESS);
  let outlineBlend = loadOutlineNumberPref(OUTLINE_BLEND_KEY, OUTLINE_DEFAULT_BLEND);
  let outlineOpacity = loadOutlineNumberPref(OUTLINE_OPACITY_KEY, OUTLINE_DEFAULT_OPACITY);
  let outlineColor = loadOutlineColorPref();
  let outlineColorRgb = hexToRgb01(outlineColor);
  // Freeze isolate belongs to Colour Vision Extreme's own broader toolset,
  // not this page's Sight <-> Sound focus -- its UI is gone here, but these
  // stay hardcoded at their neutral/off defaults so the shared correction
  // shader (which still expects these uniforms) keeps compiling and
  // rendering unchanged.
  const freezeIsolateEnabled = false;
  const freezeBlend = FREEZE_DEFAULT_BLEND;
  const freezeSpread = FREEZE_DEFAULT_SPREAD;
  const freezeTone = FREEZE_DEFAULT_TONE;
  let particlesEnabled = (() => {
    try { return localStorage.getItem(PARTICLES_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let particleOpacity = loadOutlineNumberPref(PARTICLE_OPACITY_KEY, PARTICLE_DEFAULT_OPACITY);
  // Tone/Custom (no-mic alternatives) belong to Colour Vision Extreme's
  // broader particle toolset, not this page's Sight <-> Sound focus --
  // particles here are always driven by live audio bands.
  const particleSource = "audio";
  let particleTrail = loadOutlineNumberPref(PARTICLE_TRAIL_KEY, PARTICLE_DEFAULT_TRAIL);
  let particleCount = loadOutlineNumberPref(PARTICLE_COUNT_KEY, PARTICLE_DEFAULT_COUNT);
  let particleSizeScale = loadOutlineNumberPref(PARTICLE_SIZE_KEY, PARTICLE_DEFAULT_SIZE);
  // Migrates an old single-choice save ("orbit" / "intelligent") into the
  // 4 independent toggles below, only when none of the new keys have ever
  // been written yet -- once any of them exists, the old key is ignored
  // for good. "orbit" maps to today's defaults already (orbit on, the
  // other three off); "intelligent" was always seek+colour+move bundled
  // together with orbit off, so that's the one case worth mapping.
  const legacyParticleBehaviorMigration = (() => {
    try {
      if (localStorage.getItem(PARTICLE_ORBIT_PATH_KEY) !== null) return null;
      const raw = localStorage.getItem(PARTICLE_BEHAVIOR_KEY);
      return raw === "intelligent" ? "intelligent" : null;
    } catch (e) { return null; }
  })();
  function loadParticleToggle(key, legacyDefault) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return raw === "1";
    } catch (e) { /* fall through to default below */ }
    return legacyParticleBehaviorMigration === "intelligent" ? legacyDefault : (key === PARTICLE_ORBIT_PATH_KEY);
  }
  let particleOrbitPath = loadParticleToggle(PARTICLE_ORBIT_PATH_KEY, false);
  let particleSeekBrightness = loadParticleToggle(PARTICLE_SEEK_BRIGHTNESS_KEY, true);
  let particleColourAttract = loadParticleToggle(PARTICLE_COLOUR_ATTRACT_KEY, true);
  let particleMoveAttract = loadParticleToggle(PARTICLE_MOVE_ATTRACT_KEY, true);
  let particles = [];
  let sceneAttractors = [];
  let sceneSampleTimer = null;
  let audioTintEnabled = (() => {
    try { return localStorage.getItem(AUDIO_TINT_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let audioReactEnabled = (() => {
    try { return localStorage.getItem(AUDIO_REACT_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let audioReactStrength = loadOutlineNumberPref(AUDIO_REACT_STRENGTH_KEY, AUDIO_REACT_DEFAULT_STRENGTH);
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
  let scientificColourEnabled = (() => {
    try { return localStorage.getItem(SCIENTIFIC_COLOUR_KEY) === "1"; } catch (e) { return false; }
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
  // Separate from torch on purpose: a phone's vibration motor makes its own
  // mechanical buzz, loud enough for the mic to pick up — with both tied
  // to the one Flash button, that buzz could itself register as a beat and
  // re-trigger the torch, a feedback loop with no way out short of turning
  // everything off. Off by default, unlike the old always-on-if-supported
  // behaviour, since this is exactly the failure mode being avoided.
  let beatVibrateEnabled = (() => {
    try { return localStorage.getItem(BEAT_VIBRATE_KEY) === "1"; } catch (e) { return false; }
  })();
  let beatSyncDelayMs = loadOutlineNumberPref(BEAT_SYNC_DELAY_KEY, 0);
  let bassHistory = [];
  let lastBeatAt = 0;
  let beatTorchBusy = false;
  let beatTorchFailCount = 0;
  const vibrateSupported = typeof navigator.vibrate === "function";
  const cartoonEnabled = false;
  const cartoonLevels = CARTOON_DEFAULT_LEVELS;
  const cartoonEdgeThickness = CARTOON_DEFAULT_EDGE_THICKNESS;
  const cartoonEdgeStrength = CARTOON_DEFAULT_EDGE_STRENGTH;
  const cartoonSaturation = CARTOON_DEFAULT_SATURATION;
  const cartoonThemeEnabled = false;
  const cartoonThemeLoRgb = hexToRgb01(CARTOON_THEME_DEFAULT_LO);
  const cartoonThemeHiRgb = hexToRgb01(CARTOON_THEME_DEFAULT_HI);
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

  // ---- Scientific colour: real frequency -> visible wavelength ----
  // Sound and light are both waves, and the one genuinely physical bridge
  // between them is the octave: doubling a frequency is going up an octave
  // in either domain. Visible light spans roughly 400-789 THz -- almost
  // exactly one octave wide (789/400 ~= 1.97) -- so any audio frequency,
  // repeatedly doubled, lands uniquely inside that single visible octave
  // with no ambiguity about which doubling to pick. This is the same idea
  // physicists and chromesthesia tools use to give a sound a "real" colour,
  // as opposed to an artistically chosen one (like this page's own default
  // violet/cyan/pink band hues).
  const VISIBLE_MIN_HZ = 400e12; // ~750nm, red edge
  const SPEED_OF_LIGHT_M_S = 299792458;

  function foldFrequencyToVisibleHz(freqHz) {
    if (!(freqHz > 0)) return null;
    let f = freqHz;
    while (f < VISIBLE_MIN_HZ) f *= 2;
    return f;
  }

  // Dan Bruton's widely-used wavelength->RGB approximation (piecewise-linear
  // across the spectrum's empirical break points, with intensity falloff
  // toward the visible edges and a gamma correction). It's fast and requires
  // no lookup tables, but it's an approximation, not CIE-exact -- good
  // enough to give a frequency a genuine, physically-motivated colour,
  // not meant for precise colour science.
  function wavelengthToRgb01(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / (440 - 380); b = 1; }
    else if (nm < 490) { g = (nm - 440) / (490 - 440); b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / (510 - 490); }
    else if (nm < 580) { r = (nm - 510) / (580 - 510); g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / (645 - 580); }
    else if (nm <= 750) { r = 1; }
    let factor;
    if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
    else if (nm < 701) factor = 1;
    else if (nm <= 750) factor = 0.3 + 0.7 * (750 - nm) / (750 - 700);
    else factor = 0;
    const gamma = 0.8;
    const adjust = (c) => (c === 0 ? 0 : Math.pow(c * factor, gamma));
    return [adjust(r), adjust(g), adjust(b)];
  }

  // The actual conversion this page uses: a real measured frequency, folded
  // up into the visible octave, turned into a wavelength, turned into an
  // RGB colour, read back out as a hue -- a hue derived from physics, not
  // picked by ear/eye.
  function frequencyToVisibleHue(freqHz) {
    const visibleHz = foldFrequencyToVisibleHz(freqHz);
    if (visibleHz === null) return null;
    const wavelengthNm = Math.max(380, Math.min(750, (SPEED_OF_LIGHT_M_S / visibleHz) * 1e9));
    const [r, g, b] = wavelengthToRgb01(wavelengthNm);
    return rgb2hsl(r, g, b)[0];
  }

  // ---- Scientific pitch: the reverse trip -- a real hue back to a real
  // frequency (dominant tone's Continuous style; see
  // domToneContinuousTargetFreqHz). Every step above has a working inverse
  // except one: wavelengthToRgb01 is a piecewise approximation, not a closed
  // form, so there's no algebraic formula to invert. Instead this samples it
  // once across the whole visible range and picks whichever sampled
  // wavelength's hue lands closest to the one actually wanted -- same
  // physics, found by table lookup instead of solved for directly.
  //
  // That lookup has a genuine physical gap, not just an implementation one:
  // wavelengthToRgb01(380..750) only ever produces hues from red round
  // through violet -- it can't produce magenta/pink (roughly hue 300-345),
  // because those aren't real spectral colours at all. Human vision
  // perceives magenta as a mix of the spectrum's two ends (red + violet)
  // with nothing in the middle, not as light of one wavelength -- there is
  // no monochromatic source that looks magenta. A hue request that falls in
  // that gap clamps to whichever real spectral endpoint (near-380nm violet
  // or near-750nm red) is actually closest, rather than pretending a
  // wavelength exists where physically none does.
  //
  // One more real limitation, again from wavelengthToRgb01 itself rather
  // than this table: every wavelength past ~645nm comes out as flat, fully
  // saturated red (g and b both already at 0) -- deep reds differ in
  // intensity in reality, not in this model, and intensity isn't part of
  // hue at all. They're genuinely tied on hue, so the lookup below just
  // returns whichever of them it meets first; picking a different one among
  // the ties wouldn't be more correct, only different.
  const WAVELENGTH_HUE_TABLE = (() => {
    const table = [];
    for (let nm = 380; nm <= 750; nm++) {
      const [r, g, b] = wavelengthToRgb01(nm);
      table.push({ nm, hue: rgb2hsl(r, g, b)[0] });
    }
    return table;
  })();

  function hueToVisibleWavelengthNm(targetHue) {
    let bestNm = WAVELENGTH_HUE_TABLE[0].nm;
    let bestDist = Infinity;
    for (const { nm, hue } of WAVELENGTH_HUE_TABLE) {
      const dist = Math.abs(((hue - targetHue + 540) % 360) - 180); // circular hue distance
      if (dist < bestDist) { bestDist = dist; bestNm = nm; }
    }
    return bestNm;
  }

  // Symmetric to foldFrequencyToVisibleHz, just the other direction: a real
  // light frequency is always vastly higher than any audible one, so
  // repeatedly halving it lands uniquely inside one target audible octave
  // (loHz to 2*loHz) -- same "the octave is the one genuine bridge between
  // domains" idea, just folding down instead of up.
  function foldFrequencyDownToOctaveHz(freqHz, loHz) {
    let f = freqHz;
    while (f >= loHz * 2) f /= 2;
    return f;
  }

  // The actual conversion Scientific pitch uses: a real hue, turned back
  // into the real wavelength that (as closely as the table above allows)
  // actually produces it, turned into that wavelength's real light
  // frequency, folded down into one target audible octave -- physics, run
  // in reverse, not a hand-picked frequency range chosen for how it sounds.
  function hueToScientificFreqHz(targetHue, loHz) {
    const nm = hueToVisibleWavelengthNm(targetHue);
    const lightHz = SPEED_OF_LIGHT_M_S / (nm * 1e-9);
    return foldFrequencyDownToOctaveHz(lightHz, loHz);
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
      outlinesEnabled: false,
      outlineThickness: OUTLINE_DEFAULT_THICKNESS,
      outlineBlend: OUTLINE_DEFAULT_BLEND,
      outlineOpacity: OUTLINE_DEFAULT_OPACITY,
      outlineColor: OUTLINE_DEFAULT_COLOR,
      particlesEnabled: false,
      particleOpacity: PARTICLE_DEFAULT_OPACITY,
      particleOrbitPath: true,
      particleSeekBrightness: false,
      particleColourAttract: false,
      particleMoveAttract: false,
      particleTrail: PARTICLE_DEFAULT_TRAIL,
      particleCount: PARTICLE_DEFAULT_COUNT,
      particleSizeScale: PARTICLE_DEFAULT_SIZE,
      chimeEnabled: false,
      chimeVolume: CHIME_DEFAULT_VOLUME,
      chimeSource: "saved",
      chimeOutput: "synth",
      chimeInstrument: "music_box",
      chimeRange: CHIME_DEFAULT_RANGE,
      chimeTempo: CHIME_DEFAULT_TEMPO_MS,
      chimeDetune: 0,
      chimeRandomness: 0,
      chimePattern: "proximity",
      domToneEnabled: false,
      domToneVolume: DOM_TONE_DEFAULT_VOLUME,
      domToneStyle: "continuous",
      domToneScientificPitchEnabled: false,
      domToneOutput: "synth",
      domToneInstrument: "marimba",
      domToneRange: DOM_TONE_DEFAULT_RANGE_OCTAVES,
      domToneTempo: DOM_TONE_DEFAULT_TEMPO_MS,
      domToneDetune: 0,
      domToneRandomness: 0,
      domTonePattern: "arpeggio",
      edgeToneEnabled: false,
      edgeToneVolume: EDGE_TONE_DEFAULT_VOLUME,
      edgeToneStyle: "continuous",
      edgeToneOutput: "synth",
      edgeToneInstrument: "woodblock",
      edgeTonePitchRange: EDGE_TONE_DEFAULT_PITCH_RANGE_OCTAVES,
      edgeToneMinHits: EDGE_TONE_DEFAULT_MIN_HITS,
      edgeToneMaxHits: EDGE_TONE_DEFAULT_MAX_HITS,
      edgeToneTempo: EDGE_TONE_DEFAULT_TEMPO_BPM,
      edgeToneDetune: 0,
      edgeToneRandomness: 0,
      edgeToneBars: EDGE_TONE_DEFAULT_BARS,
      edgeTonePattern: "euclidean",
      audioReactEnabled: false,
      audioReactStrength: AUDIO_REACT_DEFAULT_STRENGTH,
      audioTintEnabled: false,
      ...audioTintDefaultsSnapshot(),
      beatFlashEnabled: false,
      beatSensitivity: 0.5,
      beatFlashSpeed: 0.5,
      beatDimFlickerEnabled: false,
      beatTorchInverted: false,
      beatScreenFlashEnabled: false,
      beatVibrateEnabled: false,
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
      preset("builtin-chill-glow", "Chill audio glow", {
        audioTintEnabled: true,
        audioTintStrength: 0.25,
        audioTintSatStrength: 0.1,
        audioTintLightStrength: 0.05,
        audioTintSmoothing: 0.85,
        audioTintUpdateMs: 150
      }),
      preset("builtin-rave", "Rave mode", {
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
      preset("builtin-outlined", "Outlined", {
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
  function saveAudioReactEnabledPref() {
    try { localStorage.setItem(AUDIO_REACT_ENABLED_KEY, audioReactEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveAudioReactStrengthPref() {
    try { localStorage.setItem(AUDIO_REACT_STRENGTH_KEY, String(audioReactStrength)); } catch (e) {}
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
  function saveScientificColourPref() {
    try { localStorage.setItem(SCIENTIFIC_COLOUR_KEY, scientificColourEnabled ? "1" : "0"); } catch (e) {}
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
      audioTintSmoothingWrap, audioTintFftSizeWrap, audioTintUpdateMsWrap, scientificColourWrap, audioTintExtraBandsWrap
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
      let freqWeightedSum = 0;
      for (let i = start; i < end; i++) {
        const amp = audioTintFreqData[i];
        sum += amp;
        // Scientific colour reads this: the band's real, live spectral
        // centroid (its energy-weighted average frequency), not just the
        // band's own fixed edges -- so the hue reflects what's actually
        // sounding within the band right now, not a static range.
        freqWeightedSum += amp * (i / n) * nyquist;
      }
      // Computed for every band regardless of its own enabled toggle — beat
      // detection reads AUDIO_TINT_BANDS[0] (Bass)'s rawEnergy directly, so
      // it keeps working even if Bass is muted out of the hue tint itself.
      band.rawEnergy = sum / (end - start) / 255;
      const centroidFreq = sum > 0 ? freqWeightedSum / sum : (band.fromHz + band.toHz) / 2;
      band.effectiveHue = scientificColourEnabled
        ? (frequencyToVisibleHue(centroidFreq) ?? band.hue)
        : band.hue;
      if (!band.enabled) continue;
      activeBands++;
      const energy = band.rawEnergy * band.gain;
      weightedHue += band.effectiveHue * energy;
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
    return (audioTintEnabled || beatFlashEnabled || audioReactEnabled || (particlesEnabled && particleSource === "audio"));
  }

  function updateAudioReactUi() {
    audioReactBtn.textContent = `Audio → Correction: ${audioReactEnabled ? "On" : "Off"}`;
    audioReactBtn.classList.toggle("active", audioReactEnabled);
    audioReactBtn.setAttribute("aria-pressed", String(audioReactEnabled));
    audioReactStrengthWrap.classList.toggle("hide", !audioReactEnabled);
  }

  // Bass boosts the correction blend, mid boosts spread, treble boosts
  // outline blend -- each on top of (never replacing) that control's own
  // slider value, easing back down as the energy that drove it fades
  // (rawEnergy itself already comes back from computeAudioTintHue() smoothed
  // by the analyser's own smoothingTimeConstant, so no separate decay is
  // needed here). Silently no-ops back to the plain slider values whenever
  // the toggle is off or no analyser is running yet (rawEnergy stays 0).
  function computeReactiveUniforms() {
    const baseBlend = parseFloat(blendSlider.value) / 100;
    if (!audioReactEnabled) return { blend: baseBlend, spread, outlineBlend };
    const bass = AUDIO_TINT_BANDS[0].rawEnergy;
    const mid = AUDIO_TINT_BANDS[1].rawEnergy;
    const treble = AUDIO_TINT_BANDS[2].rawEnergy;
    const k = audioReactStrength / 100;
    return {
      blend: Math.min(1, baseBlend + bass * k * 0.6),
      spread: spread * (1 + mid * k * 4),
      outlineBlend: Math.min(1, outlineBlend + treble * k * 0.7)
    };
  }

  // ---- Particle effects (ported from Sound Nebula's particle swarm) ----
  // A glowing particle swarm layered over the corrected view, on its own 2D
  // canvas rather than drawn into the WebGL shader (see renderLoop). Always
  // driven by live audio (one swarm per AUDIO_TINT_BAND, Bass/Mid/Treble) --
  // the no-mic Tone/Custom sources belong to Colour Vision Extreme's own
  // broader particle toolset, not this page's Sight <-> Sound focus.

  // Behavior is orthogonal to source above -- source decides colour/energy,
  // behavior decides where a particle wants to be and how it gets there.
  // Four independently toggleable pieces, any combination at once (not a
  // single either/or choice) -- each one is a real, separate force/rule,
  // not a bundled preset you're stuck picking as a whole:
  //   particleOrbitPath -- the classic full circular sweep + jitter wobble
  //     around whatever the current base point is (screen-center, or the
  //     nearest bright region if Seek brightness is also on). Off means a
  //     much smaller personal offset only (still enough that particles
  //     sharing a base point don't collapse onto one exact pixel).
  //   particleSeekBrightness -- each particle independently steers toward
  //     whichever distinct bright region of the live camera view is
  //     nearest to IT (see sampleSceneAttractors/stepParticle), not one
  //     shared destination every particle is instructed toward -- a scene
  //     with two separate bright spots gets two separate groups of
  //     particles pursuing them independently, not a single hive-mind
  //     consensus target. Off means the base point is just screen-center,
  //     same as the old fixed "Orbit" behavior. This is scene-brightness-
  //     driven movement, a genuine reaction to the actual frame -- not
  //     object recognition or true image understanding.
  //   particleColourAttract -- similarly-hued particles pull toward each
  //     other (colour clustering). No effect in Tone mode (no hue to
  //     compare).
  //   particleMoveAttract -- faster-moving particles pull nearby slower
  //     ones along with them.
  // Separation (particles never fully overlapping) always applies
  // regardless of which of the four are on.

  // Coarse spatial brightness sample of the live video, independent of the
  // (much smaller, single-average) ambient-brightness sampling elsewhere in
  // this suite -- this one keeps per-cell values so "intelligent" particles
  // have somewhere spatial to steer toward. Sampled on its own low-rate
  // timer (see updateSceneSamplingTimer), not every render frame -- a
  // steering target doesn't need to update at 60fps to look responsive.
  const sceneSampleCanvas = document.createElement("canvas");
  sceneSampleCanvas.width = SCENE_GRID_W;
  sceneSampleCanvas.height = SCENE_GRID_H;
  const sceneSampleCtx = sceneSampleCanvas.getContext("2d", { willReadFrequently: true });

  function sampleSceneAttractors() {
    // Samples from `stage` -- the actual final corrected/masked output --
    // not the raw `video` feed. Freeze isolate can mask most of the screen
    // to black; particles should never be pulled toward a spot that was
    // bright in the unmasked camera feed but isn't actually visible
    // anymore. This also means attractor UV lands directly in
    // particleCanvas's own coordinate space (see
    // sceneAttractorScreenPositions) -- stage and particleCanvas are
    // already sized identically, so there's no separate video-aspect
    // cover-crop to account for here at all.
    if (!gl || !stage.width || !stage.height) return;
    sceneSampleCtx.drawImage(stage, 0, 0, SCENE_GRID_W, SCENE_GRID_H);
    const data = sceneSampleCtx.getImageData(0, 0, SCENE_GRID_W, SCENE_GRID_H).data;
    const cellCount = SCENE_GRID_W * SCENE_GRID_H;
    const lums = new Float32Array(cellCount);
    let maxLum = 0, minLum = 255;
    for (let idx = 0; idx < cellCount; idx++) {
      const i = idx * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      lums[idx] = lum;
      if (lum > maxLum) maxLum = lum;
      if (lum < minLum) minLum = lum;
    }
    // Not enough contrast in the frame to have any meaningful bright
    // region(s) -- leave the previous attractors in place rather than
    // chase noise around a nearly-flat scene.
    if (maxLum - minLum < 20) return;
    // Find every DISTINCT bright region in the frame (4-connected flood
    // fill over cells above threshold), not one single global average --
    // a single shared centroid means every particle is chasing the exact
    // same point regardless of where it actually is (a hive mind, not
    // intelligence). Each connected region gets its own weighted centroid
    // (immune to internal ties, same reasoning as before -- a large
    // uniformly bright area has many cells tied at the max value, and a
    // weighted centroid lands on its true geometric center regardless).
    // Different particles then independently pick whichever region is
    // nearest to THEM (see stepParticle), so particles on
    // opposite sides of the frame can end up pursuing entirely different
    // targets -- decentralized, not a single instructed destination.
    const threshold = minLum + (maxLum - minLum) * 0.6;
    const visited = new Uint8Array(cellCount);
    const clusters = [];
    for (let startIdx = 0; startIdx < cellCount; startIdx++) {
      if (visited[startIdx] || lums[startIdx] < threshold) continue;
      const stack = [startIdx];
      visited[startIdx] = 1;
      let sumU = 0, sumV = 0, sumW = 0;
      while (stack.length) {
        const idx = stack.pop();
        const cx = idx % SCENE_GRID_W, cy = (idx / SCENE_GRID_W) | 0;
        const weight = lums[idx] - threshold;
        sumU += ((cx + 0.5) / SCENE_GRID_W) * weight;
        sumV += ((cy + 0.5) / SCENE_GRID_H) * weight;
        sumW += weight;
        if (cx > 0 && !visited[idx - 1] && lums[idx - 1] >= threshold) { visited[idx - 1] = 1; stack.push(idx - 1); }
        if (cx < SCENE_GRID_W - 1 && !visited[idx + 1] && lums[idx + 1] >= threshold) { visited[idx + 1] = 1; stack.push(idx + 1); }
        if (cy > 0 && !visited[idx - SCENE_GRID_W] && lums[idx - SCENE_GRID_W] >= threshold) { visited[idx - SCENE_GRID_W] = 1; stack.push(idx - SCENE_GRID_W); }
        if (cy < SCENE_GRID_H - 1 && !visited[idx + SCENE_GRID_W] && lums[idx + SCENE_GRID_W] >= threshold) { visited[idx + SCENE_GRID_W] = 1; stack.push(idx + SCENE_GRID_W); }
      }
      if (sumW > 0) clusters.push({ u: sumU / sumW, v: sumV / sumW, weight: sumW });
    }
    if (!clusters.length) return;
    // Cap how many distinct regions get tracked -- plenty for genuinely
    // decentralized behaviour without unbounded cost on a very noisy or
    // high-contrast frame with many small bright specks.
    clusters.sort((a, b) => b.weight - a.weight);
    sceneAttractors = clusters.slice(0, 8);
  }

  // Only samples while something actually needs it (particles on AND
  // Seek brightness checked) -- same on-demand-timer pattern as the
  // mic-driven audio analysis elsewhere in this file.
  function updateSceneSamplingTimer() {
    const needed = particlesEnabled && particleSeekBrightness;
    if (needed && !sceneSampleTimer) {
      sceneSampleTimer = setInterval(sampleSceneAttractors, 100);
    } else if (!needed && sceneSampleTimer) {
      clearInterval(sceneSampleTimer);
      sceneSampleTimer = null;
    }
  }

  function makeParticle(bandIndex) {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    return {
      bandIndex,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.02,
      baseRadius: minDim * (0.16 + Math.random() * 0.22),
      radiusJitter: Math.random() * 40 + 10,
      jitterPhase: Math.random() * Math.PI * 2,
      jitterSpeed: 0.5 + Math.random() * 1.2,
      size: 1.2 + Math.random() * 2.4,
      // "intelligent" behavior state -- unused in "orbit" mode, but seeded
      // here regardless so switching behavior mid-session (which re-seeds
      // via seedParticles()) never needs a separate code path just to
      // backfill these fields.
      x: Math.random() * (particleCanvas.width || window.innerWidth),
      y: Math.random() * (particleCanvas.height || window.innerHeight),
      vx: 0,
      vy: 0
    };
  }

  function seedParticles() {
    particles = [];
    for (let bandIndex = 0; bandIndex < 3; bandIndex++) {
      for (let i = 0; i < particleCount; i++) particles.push(makeParticle(bandIndex));
    }
  }

  function resizeParticleCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    particleCanvas.width = Math.round(window.innerWidth * dpr);
    particleCanvas.height = Math.round(window.innerHeight * dpr);
  }

  // Particles are a sound -> sight mechanism, same as Audio colour tint or
  // Beat flash, just via a swarm instead of a hue wash or a torch pulse --
  // so this page only ever drives them from live audio (bass/mid/treble),
  // never from a no-mic Tone/Custom alternative.
  function getParticleEnergyAndHue(p) {
    const band = AUDIO_TINT_BANDS[p.bandIndex];
    return { energy: band.rawEnergy, hue: band.effectiveHue };
  }

  // Screen-space positions of the current scene attractors (see
  // sampleSceneAttractors), recomputed once per draw rather than per
  // particle -- cheap, and every particle steers against the same set.
  function sceneAttractorScreenPositions(w, h) {
    // sceneAttractors' u/v are already sampled directly from `stage`
    // (see sampleSceneAttractors), which shares particleCanvas's exact
    // pixel dimensions -- no video-aspect cover-crop to reconcile here.
    if (!sceneAttractors.length) return [];
    return sceneAttractors.map((a) => ({ x: a.u * w, y: a.v * h }));
  }

  // Unified stepping for every particle, regardless of which of the 4
  // behavior toggles are on -- there's no separate "classic orbit" code
  // path anymore, since the whole point is that these combine freely
  // rather than being an either/or choice. Mutates p.x/p.y/p.vx/p.vy/
  // p.angle in place; returns nothing, caller reads the updated p.x/p.y
  // after. Roughly the scale of a lively particle's own speed -- used to
  // normalize how much a neighbour's motion pulls on others (see the
  // movement-attraction term below), not a hard cap.
  const PARTICLE_REFERENCE_SPEED = 3;

  function stepParticle(p, energy, hue, attractors, w, h, dpr, timeMs) {
    // Base point: screen-center, or the nearest distinct scene attractor
    // if Seek brightness is on (see sampleSceneAttractors -- particles
    // pick independently, not one shared destination).
    let baseX = w / 2, baseY = h / 2;
    if (particleSeekBrightness && attractors.length) {
      let nearest = attractors[0], nearestD = Infinity;
      for (const a of attractors) {
        const d = (a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y);
        if (d < nearestD) { nearestD = d; nearest = a; }
      }
      baseX = nearest.x; baseY = nearest.y;
    }
    p.angle += p.angularSpeed * (0.4 + energy * 1.5);
    // Orbit path on: the full classic sweep radius + jitter wobble around
    // the base point. Off: a much smaller personal offset only -- still
    // enough that particles sharing a base point don't collapse onto one
    // exact pixel under additive ("lighter") blending, without the wide
    // circular sweep.
    let offsetRadius;
    if (particleOrbitPath) {
      const jitter = Math.sin(timeMs * 0.001 * p.jitterSpeed + p.jitterPhase) * p.radiusJitter * (0.5 + energy);
      offsetRadius = (p.baseRadius + jitter) * dpr;
    } else {
      offsetRadius = p.radiusJitter * dpr;
    }
    const personalX = baseX + Math.cos(p.angle) * offsetRadius;
    const personalY = baseY + Math.sin(p.angle) * offsetRadius;
    let ax = (personalX - p.x) * 0.0025;
    let ay = (personalY - p.y) * 0.0025;
    const minSeparation = 14 * dpr;
    // Wider than the separation radius -- close enough to still read as
    // "part of the same swarm," not the whole screen -- within which
    // colour/movement can pull particles toward each other, on top of
    // (not instead of) each one's own pull toward its personal point
    // above. Separation always applies; the colour/movement term inside
    // only contributes anything when its own toggle is on.
    const socialRadius = 130 * dpr;
    let socAx = 0, socAy = 0, socWeight = 0;
    let alignVx = 0, alignVy = 0, alignWeight = 0;
    for (const other of particles) {
      if (other === p) continue;
      const dx = other.x - p.x, dy = other.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0.01) continue;
      const d = Math.sqrt(d2);
      if (d < minSeparation) {
        ax -= (dx / d) * 0.05;
        ay -= (dy / d) * 0.05;
      } else if (d < socialRadius) {
        // Colour attraction: a similarly-hued neighbour (within ~45deg,
        // wrapping around the colour wheel) pulls toward it -- like
        // colours drift together into their own clusters. Skipped
        // entirely when either particle has no hue (Tone mode) -- there's
        // nothing to match on.
        if (particleColourAttract && hue != null && other._hue != null) {
          const rawDiff = Math.abs(hue - other._hue) % 360;
          const hueDiff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
          if (hueDiff < 45) {
            const weight = (1 - hueDiff / 45) * 0.7;
            socAx += (dx / d) * weight;
            socAy += (dy / d) * weight;
            socWeight += weight;
          }
        }
        // Movement attraction: velocity ALIGNMENT, not a pull toward the
        // neighbour's position -- every particle's speed is clamped to the
        // same shared per-band/tone maxSpeed (see getParticleEnergyAndHue),
        // so "who is moving faster" rarely differs enough for a positional
        // pull to mean anything; nearly everyone is always near the same
        // top speed. What genuinely varies between particles is HEADING
        // (each has its own orbit phase/target). Blending a particle's own
        // velocity toward its nearby movers' weighted-average heading is
        // what actually drags stragglers along -- they visibly start
        // moving the same direction as the swarm around them, a real,
        // continuously-applied effect rather than one capped to a fixed
        // small magnitude regardless of how much motion is actually near.
        if (particleMoveAttract) {
          const otherSpeed = Math.hypot(other.vx, other.vy);
          if (otherSpeed > 0.001) {
            const w = Math.min(1, otherSpeed / (PARTICLE_REFERENCE_SPEED * dpr));
            alignVx += other.vx * w;
            alignVy += other.vy * w;
            alignWeight += w;
          }
        }
      }
    }
    p.vx = (p.vx + ax) * 0.94;
    p.vy = (p.vy + ay) * 0.94;
    const maxSpeed = (0.6 + energy * 2.5) * dpr;
    let speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
      speed = maxSpeed;
    }
    // Colour/movement attraction are applied AFTER the primary steering
    // velocity is computed and clamped, not folded into it beforehand --
    // the target-seeking acceleration above is frequently much larger than
    // the speed cap itself (a particle's personal orbit point can demand
    // far more tangential speed than maxSpeed allows), so anything blended
    // in earlier gets renormalized away to nothing once that clamp runs.
    // Nudging the already-clamped velocity directly, then re-clamping,
    // means both social forces reliably bend the final heading instead of
    // being swamped by whatever the primary force happened to need.
    if (socWeight > 0) {
      p.vx += (socAx / socWeight) * maxSpeed * 0.5;
      p.vy += (socAy / socWeight) * maxSpeed * 0.5;
    }
    if (alignWeight > 0) {
      const avgVx = alignVx / alignWeight, avgVy = alignVy / alignWeight;
      p.vx += (avgVx - p.vx) * 0.25;
      p.vy += (avgVy - p.vy) * 0.25;
    }
    if (socWeight > 0 || alignWeight > 0) {
      speed = Math.hypot(p.vx, p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }
    }
    p.x += p.vx;
    p.y += p.vy;
    // Soft-wrap rather than clamp/bounce -- a particle that steers off one
    // edge chasing a point near the frame boundary reappears on the
    // opposite side instead of piling up against the wall.
    if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
    if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
  }

  function updateAndDrawParticles(timeMs) {
    const w = particleCanvas.width, h = particleCanvas.height;
    const dpr = w / window.innerWidth || 1;
    const opacity = particleOpacity / 100;
    if (particleTrail > 0) {
      // Fades the previous frame's glow toward transparent instead of
      // wiping it -- "destination-out" only consumes the fill's alpha
      // channel, not its colour, so this thins out existing alpha evenly
      // without painting a black wash over the video underneath (a plain
      // black fillRect would darken the corrected view as trails built up).
      particleCtx.globalCompositeOperation = "destination-out";
      particleCtx.fillStyle = `rgba(0, 0, 0, ${1 - (particleTrail / 100) * 0.97})`;
      particleCtx.fillRect(0, 0, w, h);
    } else {
      particleCtx.clearRect(0, 0, w, h);
    }
    particleCtx.globalCompositeOperation = "lighter";
    const attractors = particleSeekBrightness ? sceneAttractorScreenPositions(w, h) : [];
    // Colour/movement attraction need every OTHER particle's hue/energy
    // already known during each particle's own neighbour loop -- compute
    // and cache them all first, as scratch fields, before stepping any.
    for (const p of particles) {
      const eh = getParticleEnergyAndHue(p);
      p._energy = eh.energy;
      p._hue = eh.hue;
    }
    for (const p of particles) {
      const energy = p._energy, hue = p._hue;
      stepParticle(p, energy, hue, attractors, w, h, dpr, timeMs);
      const x = p.x, y = p.y;
      const size = (p.size * (particleSizeScale / 100) + energy * 4) * dpr;
      const alpha = Math.min(1, 0.15 + energy * 0.85) * opacity;
      if (alpha <= 0.01 || size <= 0) continue;
      const colorStop = hue == null ? (a) => `hsla(0, 0%, 95%, ${a})` : (a) => `hsla(${hue}, 90%, 65%, ${a})`;
      const grad = particleCtx.createRadialGradient(x, y, 0, x, y, size * 3);
      grad.addColorStop(0, colorStop(alpha));
      grad.addColorStop(1, colorStop(0));
      particleCtx.fillStyle = grad;
      particleCtx.beginPath();
      particleCtx.arc(x, y, size * 3, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleCtx.globalCompositeOperation = "source-over";
  }

  function saveParticlesEnabledPref() {
    try { localStorage.setItem(PARTICLES_ENABLED_KEY, particlesEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveParticleOpacityPref() {
    try { localStorage.setItem(PARTICLE_OPACITY_KEY, String(particleOpacity)); } catch (e) {}
  }
  function saveParticleOrbitPathPref() {
    try { localStorage.setItem(PARTICLE_ORBIT_PATH_KEY, particleOrbitPath ? "1" : "0"); } catch (e) {}
  }
  function saveParticleSeekBrightnessPref() {
    try { localStorage.setItem(PARTICLE_SEEK_BRIGHTNESS_KEY, particleSeekBrightness ? "1" : "0"); } catch (e) {}
  }
  function saveParticleColourAttractPref() {
    try { localStorage.setItem(PARTICLE_COLOUR_ATTRACT_KEY, particleColourAttract ? "1" : "0"); } catch (e) {}
  }
  function saveParticleMoveAttractPref() {
    try { localStorage.setItem(PARTICLE_MOVE_ATTRACT_KEY, particleMoveAttract ? "1" : "0"); } catch (e) {}
  }
  function saveParticleTrailPref() {
    try { localStorage.setItem(PARTICLE_TRAIL_KEY, String(particleTrail)); } catch (e) {}
  }
  function saveParticleCountPref() {
    try { localStorage.setItem(PARTICLE_COUNT_KEY, String(particleCount)); } catch (e) {}
  }
  function saveParticleSizePref() {
    try { localStorage.setItem(PARTICLE_SIZE_KEY, String(particleSizeScale)); } catch (e) {}
  }

  function setParticleCount(next) {
    particleCount = Math.max(5, Math.min(100, Math.round(next)));
    saveParticleCountPref();
    if (particlesEnabled) seedParticles();
  }

  function setParticleSizeScale(next) {
    particleSizeScale = Math.max(20, Math.min(300, next));
    saveParticleSizePref();
  }

  function updateParticlesUi() {
    particlesBtn.textContent = particlesEnabled ? "Particle effects: On" : "Particle effects: Off";
    particlesBtn.classList.toggle("active", particlesEnabled);
    particlesBtn.setAttribute("aria-pressed", String(particlesEnabled));
    particleOpacityWrap.classList.toggle("hide", !particlesEnabled);
    particleBehaviorWrap.classList.toggle("hide", !particlesEnabled);
    particleTrailWrap.classList.toggle("hide", !particlesEnabled);
    particleCountWrap.classList.toggle("hide", !particlesEnabled);
    particleSizeWrap.classList.toggle("hide", !particlesEnabled);
  }

  async function toggleParticles() {
    if (particlesEnabled) {
      particlesEnabled = false;
      saveParticlesEnabledPref();
      updateParticlesUi();
      maybeStopAudioAnalysis();
      updateSceneSamplingTimer();
      return;
    }
    const started = audioTintCtx ? true : await startAudioTint();
    if (!started) return;
    seedParticles();
    particlesEnabled = true;
    saveParticlesEnabledPref();
    updateParticlesUi();
    updateSceneSamplingTimer();
  }

  function setParticleTrail(next) {
    particleTrail = Math.max(0, Math.min(100, next));
    saveParticleTrailPref();
  }

  // Each toggle is fully independent -- any combination at once, not a
  // mutually-exclusive choice. Re-seeding on every change (rather than
  // just letting the next frame pick up the new flag) keeps each switch
  // feeling deliberate: e.g. turning Orbit path on/off should visibly
  // reset the swarm's spread, not just bend the existing paths.
  function setParticleOrbitPath(next) {
    if (next === particleOrbitPath) return;
    particleOrbitPath = next;
    saveParticleOrbitPathPref();
    if (particlesEnabled) seedParticles();
  }
  function setParticleSeekBrightness(next) {
    if (next === particleSeekBrightness) return;
    particleSeekBrightness = next;
    saveParticleSeekBrightnessPref();
    updateSceneSamplingTimer();
    if (particlesEnabled) seedParticles();
  }
  function setParticleColourAttract(next) {
    if (next === particleColourAttract) return;
    particleColourAttract = next;
    saveParticleColourAttractPref();
  }
  function setParticleMoveAttract(next) {
    if (next === particleMoveAttract) return;
    particleMoveAttract = next;
    saveParticleMoveAttractPref();
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

  async function toggleAudioReact() {
    if (audioReactEnabled) {
      audioReactEnabled = false;
      saveAudioReactEnabledPref();
      updateAudioReactUi();
      maybeStopAudioAnalysis();
      return;
    }
    const started = audioTintCtx ? true : await startAudioTint();
    if (!started) return;
    audioReactEnabled = true;
    saveAudioReactEnabledPref();
    updateAudioReactUi();
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
    if (beatVibrateEnabled && vibrateSupported) {
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
  function saveBeatVibratePref() {
    try { localStorage.setItem(BEAT_VIBRATE_KEY, beatVibrateEnabled ? "1" : "0"); } catch (e) {}
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
    beatFlashBtn.textContent = beatFlashEnabled ? "Flash on beat: On" : "Flash on beat: Off";
    beatFlashBtn.classList.toggle("active", beatFlashEnabled);
    beatFlashBtn.setAttribute("aria-pressed", String(beatFlashEnabled));
    [
      beatSensitivityWrap, beatFlashSpeedWrap, beatDimFlickerWrap, beatTorchInvertedWrap,
      beatScreenFlashWrap, beatVibrateWrap, beatTestFlashBtn, beatSyncDelayWrap
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
    uniform float uFreezeTone;

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
          vec3 diff = labSmoothed - uSourceLab[i];
          // A plain Lab distance treats a lightness difference and a hue
          // difference as interchangeable, which is wrong in both
          // directions: two genuinely different hues that happen to share
          // a similar brightness end up "close enough" (a saturated colour
          // needs hue/chroma to matter far more than incidental lighting),
          // while a pure grey has no hue at all, so it *should* match
          // anything at that brightness regardless of colour. Each saved
          // point's own chroma sets its baseline weighting — near-zero
          // chroma leans on lightness only, real chroma leans on hue/chroma
          // and barely cares about lightness. uFreezeTone (the live Tone
          // slider) then scales hue/chroma weight down further for EVERY
          // point at once, live, the same way Freeze blend/match distance
          // already work — no separate calibration step, no saved "tone"
          // point of its own: drag it to 100% and every match, whatever
          // colour it was calibrated from, goes purely by brightness.
          float chroma = length(uSourceLab[i].yz);
          float hueWeight = clamp(chroma / 20.0, 0.0, 1.0) * (1.0 - uFreezeTone);
          float lWeight = mix(1.0, 0.35, hueWeight);
          float abWeight = mix(0.0, 2.0, hueWeight);
          float d = sqrt(diff.x * diff.x * lWeight + (diff.y * diff.y + diff.z * diff.z) * abWeight);
          minDist = min(minDist, d);
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
      uFreezeSpread: glCtx.getUniformLocation(prog, "uFreezeSpread"),
      uFreezeTone: glCtx.getUniformLocation(prog, "uFreezeTone")
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
    resizeParticleCanvas();
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
      const reactive = computeReactiveUniforms();

      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, reactive.blend);
      gl.uniform1f(uniforms.uOutlineEnabled, outlinesEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uOutlineThickness, outlineThickness);
      gl.uniform1f(uniforms.uOutlineBlend, reactive.outlineBlend);
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
      gl.uniform1f(uniforms.uSpread, reactive.spread);
      gl.uniform1f(uniforms.uRotate180, rotate180 ? 1 : 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.uniform1i(uniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
      gl.uniform1f(uniforms.uCvdStrength, cvdStrength);
      gl.uniform1f(uniforms.uFreezeEnabled, freezeIsolateEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uFreezeBlend, freezeBlend);
      gl.uniform1f(uniforms.uFreezeSpread, freezeSpread);
      gl.uniform1f(uniforms.uFreezeTone, freezeTone / 100);
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
        fixedGl.uniform1f(fixedUniforms.uOutlineBlend, reactive.outlineBlend);
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
        fixedGl.uniform1f(fixedUniforms.uSpread, reactive.spread);
        fixedGl.uniform1f(fixedUniforms.uRotate180, rotate180 ? 1 : 0);
        fixedGl.uniform2f(fixedUniforms.uUvScale, cover.sx, cover.sy);
        fixedGl.uniform2f(fixedUniforms.uUvOffset, cover.ox, cover.oy);
        fixedGl.uniform1i(fixedUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
        fixedGl.uniform1f(fixedUniforms.uCvdStrength, cvdStrength);
        fixedGl.uniform1f(fixedUniforms.uFreezeEnabled, freezeIsolateEnabled ? 1 : 0);
        fixedGl.uniform1f(fixedUniforms.uFreezeBlend, freezeBlend);
        fixedGl.uniform1f(fixedUniforms.uFreezeSpread, freezeSpread);
        fixedGl.uniform1f(fixedUniforms.uFreezeTone, freezeTone / 100);
        fixedGl.drawArrays(fixedGl.TRIANGLE_STRIP, 0, 4);
      }

      if (particlesEnabled) updateAndDrawParticles(performance.now());
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  // ---- Camera ----

  async function startCamera() {
    setStatus("Requesting camera…");
    // A chime enabled from a previous session has its AudioContext created
    // suspended (no user gesture at page-load time to resume it against) --
    // this click is a real gesture, so resume it here rather than leaving
    // the chime silently non-functional for the rest of the session.
    if (chimeAudioCtx && chimeAudioCtx.state === "suspended") chimeAudioCtx.resume().catch(() => {});
    if (domToneAudioCtx && domToneAudioCtx.state === "suspended") domToneAudioCtx.resume().catch(() => {});
    if (edgeToneAudioCtx && edgeToneAudioCtx.state === "suspended") edgeToneAudioCtx.resume().catch(() => {});
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
      overlay.classList.add("hide");
      hud.classList.remove("hide");
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  async function attachStream(stream) {
    currentStream = stream;
    video.srcObject = stream;
    await video.play();
    const track = stream.getVideoTracks()[0];
    setupTorch(track);
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

  // ---- Camera selection ----
  // Was: cycle-by-index through an unlabeled "next camera" button, built
  // for phones with a small front/back/telephoto lens set where cycling
  // is fine because there's only ever a couple of options. That stops
  // being usable the moment real camera hardware is involved — a USB
  // webcam or an HDMI/SDI-to-USB capture card feeding this device shows
  // up as just one more entry in the same list, and with several such
  // devices attached, blind cycling means guessing which click lands on
  // which capture card. Discovery from the Blue Light Filter page (which
  // has the identical problem — getUserMedia doesn't distinguish "phone
  // lens" from "camera hardware", so both need the same fix): enumerate
  // and expose devices by their actual OS/driver-reported label in a
  // select, so a capture card shows its own product name and can be
  // picked directly instead of cycled to.
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
      currentDeviceIndex = activeId ? videoDevices.findIndex((d) => d.deviceId === activeId) : -1;
      if (currentDeviceIndex === -1) currentDeviceIndex = 0;
    } catch (err) {
      cameraSelectWrap.classList.add("hide");
    }
  }

  async function switchToDevice(deviceId) {
    if (switchingCamera) return;
    switchingCamera = true;
    // Release the current camera before requesting the next one. Many
    // phones — especially Android — refuse or silently fail a second
    // concurrent camera open, and the same holds for capture card
    // drivers, so grabbing the new stream while the old one is still
    // held could fail on real hardware even though it works fine
    // against a single mocked device.
    stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      await attachStream(stream);
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

  cameraSelect.addEventListener("change", () => {
    switchToDevice(cameraSelect.value);
  });

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

  // ---- Shared instrument output (MIDI out + real sampled instruments) ----
  // Every note-based sonification below (the chime, the dominant colour
  // tone's melodic mode, the edge texture's melodic mode) can play through
  // its own built-in oscillator/noise (Synth, the original/default), or
  // through one of two genuinely real alternatives instead:
  //
  //   MIDI out -- sends actual MIDI messages (Web MIDI API) to a real
  //   connected instrument: hardware synth, or a virtual MIDI port feeding
  //   a software synth/DAW. The sound itself comes entirely from whatever's
  //   on the receiving end -- this page only ever sends note data, the same
  //   way any MIDI controller does. Only available in Chromium-based
  //   browsers with a MIDI output already present; feature-detected via
  //   navigator.requestMIDIAccess, hidden with no fake fallback elsewhere.
  //
  //   Instrument -- real recorded General MIDI instrument samples (the
  //   FluidR3 GM soundfont, exported as individual per-note MP3s by the
  //   widely-used, MIT-licensed midi-js-soundfonts project), fetched on
  //   demand and decoded via the browser's own Web Audio decodeAudioData --
  //   no bundled audio in this repo, no third-party JS library, just real
  //   sample files fetched at runtime like any other asset. That sample set
  //   only has natural notes (no sharps/flats) per octave; the nearest one
  //   is picked and pitch-shifted via playbackRate for the remaining
  //   semitones -- exactly how a real hardware sampler/rompler works, not
  //   an approximation unique to this page.
  const SOUNDFONT_BASE_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/";
  // Pitched instruments (chime, dominant colour tone).
  const GM_INSTRUMENTS = [
    { name: "Acoustic Grand Piano", program: 0, folder: "acoustic_grand_piano" },
    { name: "Bright Acoustic Piano", program: 1, folder: "bright_acoustic_piano" },
    { name: "Electric Grand Piano", program: 2, folder: "electric_grand_piano" },
    { name: "Honky-tonk Piano", program: 3, folder: "honkytonk_piano" },
    { name: "Electric Piano 1", program: 4, folder: "electric_piano_1" },
    { name: "Electric Piano 2", program: 5, folder: "electric_piano_2" },
    { name: "Harpsichord", program: 6, folder: "harpsichord" },
    { name: "Clavinet", program: 7, folder: "clavinet" },
    { name: "Celesta", program: 8, folder: "celesta" },
    { name: "Glockenspiel", program: 9, folder: "glockenspiel" },
    { name: "Music Box", program: 10, folder: "music_box" },
    { name: "Vibraphone", program: 11, folder: "vibraphone" },
    { name: "Marimba", program: 12, folder: "marimba" },
    { name: "Xylophone", program: 13, folder: "xylophone" },
    { name: "Tubular Bells", program: 14, folder: "tubular_bells" },
    { name: "Dulcimer", program: 15, folder: "dulcimer" },
    { name: "Drawbar Organ", program: 16, folder: "drawbar_organ" },
    { name: "Percussive Organ", program: 17, folder: "percussive_organ" },
    { name: "Rock Organ", program: 18, folder: "rock_organ" },
    { name: "Church Organ", program: 19, folder: "church_organ" },
    { name: "Reed Organ", program: 20, folder: "reed_organ" },
    { name: "Accordion", program: 21, folder: "accordion" },
    { name: "Harmonica", program: 22, folder: "harmonica" },
    { name: "Tango Accordion", program: 23, folder: "tango_accordion" },
    { name: "Acoustic Guitar (nylon)", program: 24, folder: "acoustic_guitar_nylon" },
    { name: "Acoustic Guitar (steel)", program: 25, folder: "acoustic_guitar_steel" },
    { name: "Electric Guitar (jazz)", program: 26, folder: "electric_guitar_jazz" },
    { name: "Electric Guitar (clean)", program: 27, folder: "electric_guitar_clean" },
    { name: "Electric Guitar (muted)", program: 28, folder: "electric_guitar_muted" },
    { name: "Overdriven Guitar", program: 29, folder: "overdriven_guitar" },
    { name: "Distortion Guitar", program: 30, folder: "distortion_guitar" },
    { name: "Guitar Harmonics", program: 31, folder: "guitar_harmonics" },
    { name: "Acoustic Bass", program: 32, folder: "acoustic_bass" },
    { name: "Electric Bass (finger)", program: 33, folder: "electric_bass_finger" },
    { name: "Electric Bass (pick)", program: 34, folder: "electric_bass_pick" },
    { name: "Fretless Bass", program: 35, folder: "fretless_bass" },
    { name: "Slap Bass 1", program: 36, folder: "slap_bass_1" },
    { name: "Slap Bass 2", program: 37, folder: "slap_bass_2" },
    { name: "Synth Bass 1", program: 38, folder: "synth_bass_1" },
    { name: "Synth Bass 2", program: 39, folder: "synth_bass_2" },
    { name: "Violin", program: 40, folder: "violin" },
    { name: "Viola", program: 41, folder: "viola" },
    { name: "Cello", program: 42, folder: "cello" },
    { name: "Contrabass", program: 43, folder: "contrabass" },
    { name: "Tremolo Strings", program: 44, folder: "tremolo_strings" },
    { name: "Pizzicato Strings", program: 45, folder: "pizzicato_strings" },
    { name: "Orchestral Harp", program: 46, folder: "orchestral_harp" },
    { name: "Timpani", program: 47, folder: "timpani" },
    { name: "String Ensemble 1", program: 48, folder: "string_ensemble_1" },
    { name: "String Ensemble 2", program: 49, folder: "string_ensemble_2" },
    { name: "Synth Strings 1", program: 50, folder: "synth_strings_1" },
    { name: "Synth Strings 2", program: 51, folder: "synth_strings_2" },
    { name: "Choir Aahs", program: 52, folder: "choir_aahs" },
    { name: "Voice Oohs", program: 53, folder: "voice_oohs" },
    { name: "Synth Choir", program: 54, folder: "synth_choir" },
    { name: "Orchestra Hit", program: 55, folder: "orchestra_hit" },
    { name: "Trumpet", program: 56, folder: "trumpet" },
    { name: "Trombone", program: 57, folder: "trombone" },
    { name: "Tuba", program: 58, folder: "tuba" },
    { name: "Muted Trumpet", program: 59, folder: "muted_trumpet" },
    { name: "French Horn", program: 60, folder: "french_horn" },
    { name: "Brass Section", program: 61, folder: "brass_section" },
    { name: "Synth Brass 1", program: 62, folder: "synth_brass_1" },
    { name: "Synth Brass 2", program: 63, folder: "synth_brass_2" },
    { name: "Soprano Sax", program: 64, folder: "soprano_sax" },
    { name: "Alto Sax", program: 65, folder: "alto_sax" },
    { name: "Tenor Sax", program: 66, folder: "tenor_sax" },
    { name: "Baritone Sax", program: 67, folder: "baritone_sax" },
    { name: "Oboe", program: 68, folder: "oboe" },
    { name: "English Horn", program: 69, folder: "english_horn" },
    { name: "Bassoon", program: 70, folder: "bassoon" },
    { name: "Clarinet", program: 71, folder: "clarinet" },
    { name: "Piccolo", program: 72, folder: "piccolo" },
    { name: "Flute", program: 73, folder: "flute" },
    { name: "Recorder", program: 74, folder: "recorder" },
    { name: "Pan Flute", program: 75, folder: "pan_flute" },
    { name: "Blown Bottle", program: 76, folder: "blown_bottle" },
    { name: "Shakuhachi", program: 77, folder: "shakuhachi" },
    { name: "Whistle", program: 78, folder: "whistle" },
    { name: "Ocarina", program: 79, folder: "ocarina" },
    { name: "Lead 1 (square)", program: 80, folder: "lead_1_square" },
    { name: "Lead 2 (sawtooth)", program: 81, folder: "lead_2_sawtooth" },
    { name: "Lead 3 (calliope)", program: 82, folder: "lead_3_calliope" },
    { name: "Lead 4 (chiff)", program: 83, folder: "lead_4_chiff" },
    { name: "Lead 5 (charang)", program: 84, folder: "lead_5_charang" },
    { name: "Lead 6 (voice)", program: 85, folder: "lead_6_voice" },
    { name: "Lead 7 (fifths)", program: 86, folder: "lead_7_fifths" },
    { name: "Lead 8 (bass + lead)", program: 87, folder: "lead_8_bass__lead" },
    { name: "Pad 1 (new age)", program: 88, folder: "pad_1_new_age" },
    { name: "Pad 2 (warm)", program: 89, folder: "pad_2_warm" },
    { name: "Pad 3 (polysynth)", program: 90, folder: "pad_3_polysynth" },
    { name: "Pad 4 (choir)", program: 91, folder: "pad_4_choir" },
    { name: "Pad 5 (bowed)", program: 92, folder: "pad_5_bowed" },
    { name: "Pad 6 (metallic)", program: 93, folder: "pad_6_metallic" },
    { name: "Pad 7 (halo)", program: 94, folder: "pad_7_halo" },
    { name: "Pad 8 (sweep)", program: 95, folder: "pad_8_sweep" },
    { name: "FX 1 (rain)", program: 96, folder: "fx_1_rain" },
    { name: "FX 2 (soundtrack)", program: 97, folder: "fx_2_soundtrack" },
    { name: "FX 3 (crystal)", program: 98, folder: "fx_3_crystal" },
    { name: "FX 4 (atmosphere)", program: 99, folder: "fx_4_atmosphere" },
    { name: "FX 5 (brightness)", program: 100, folder: "fx_5_brightness" },
    { name: "FX 6 (goblins)", program: 101, folder: "fx_6_goblins" },
    { name: "FX 7 (echoes)", program: 102, folder: "fx_7_echoes" },
    { name: "FX 8 (sci-fi)", program: 103, folder: "fx_8_scifi" },
    { name: "Sitar", program: 104, folder: "sitar" },
    { name: "Banjo", program: 105, folder: "banjo" },
    { name: "Shamisen", program: 106, folder: "shamisen" },
    { name: "Koto", program: 107, folder: "koto" },
    { name: "Kalimba", program: 108, folder: "kalimba" },
    { name: "Bagpipe", program: 109, folder: "bagpipe" },
    { name: "Fiddle", program: 110, folder: "fiddle" },
    { name: "Shanai", program: 111, folder: "shanai" }
  ];
  // Percussive-flavoured GM instruments (edge texture) -- real GM program
  // numbers played on a normal channel with a fixed note, NOT the reserved
  // channel-10 drum kit (a program change on channel 10 is ignored by every
  // GM synth; these are ordinary pitched-channel instruments that just
  // happen to sound percussive).
  const GM_PERCUSSIVE_INSTRUMENTS = [
    { name: "Tinkle Bell", program: 112, folder: "tinkle_bell" },
    { name: "Agogo", program: 113, folder: "agogo" },
    { name: "Woodblock", program: 115, folder: "woodblock" },
    { name: "Taiko Drum", program: 116, folder: "taiko_drum" },
    { name: "Melodic Tom", program: 117, folder: "melodic_tom" },
    { name: "Synth Drum", program: 118, folder: "synth_drum" },
    { name: "Reverse Cymbal", program: 119, folder: "reverse_cymbal" },
    { name: "Guitar Fret Noise", program: 120, folder: "guitar_fret_noise" },
    { name: "Breath Noise", program: 121, folder: "breath_noise" },
    { name: "Seashore", program: 122, folder: "seashore" },
    { name: "Bird Tweet", program: 123, folder: "bird_tweet" },
    { name: "Telephone Ring", program: 124, folder: "telephone_ring" },
    { name: "Helicopter", program: 125, folder: "helicopter" },
    { name: "Applause", program: 126, folder: "applause" },
    { name: "Gunshot", program: 127, folder: "gunshot" }
  ];
  // Every channel (chime, dominant tone, edge texture) can now pick from
  // either instrument list -- edge texture used to be limited to the
  // percussive one only (a pure drum machine, before it had real pitch of
  // its own), and chime/dominant tone to the pitched one only, which made
  // percussive/FX colours unreachable from either of the two channels that
  // actually have room to use them melodically. One combined lookup table
  // means whichever list a saved instrument came from still resolves
  // correctly everywhere, regardless of which channel picked it.
  const GM_ALL_INSTRUMENTS = GM_INSTRUMENTS.concat(GM_PERCUSSIVE_INSTRUMENTS);
const NATURAL_NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function hzToMidiNote(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  }

  // Finds the nearest available natural-note sample to a MIDI note number,
  // and how many semitones away it is (for pitch-shifting via playbackRate).
  function midiNoteToNearestSample(midiNote) {
    const target = Math.round(midiNote);
    let best = null;
    for (let candidate = target - 6; candidate <= target + 6; candidate++) {
      const octave = Math.floor(candidate / 12) - 1; // MIDI 60 = C4
      const semitoneInOctave = ((candidate % 12) + 12) % 12;
      const noteName = Object.keys(NATURAL_NOTE_SEMITONES).find((n) => NATURAL_NOTE_SEMITONES[n] === semitoneInOctave);
      if (!noteName) continue; // this candidate itself is a sharp/flat -- no sample file for it
      const diff = Math.abs(candidate - target);
      if (!best || diff < best.diff) best = { sampleName: `${noteName}${octave}`, diff, semitoneOffset: midiNote - candidate };
    }
    return best;
  }

  let instrumentAudioCtx = null;
  const instrumentSampleCache = new Map(); // "folder/NoteOctave" -> Promise<AudioBuffer>

  function ensureInstrumentAudio() {
    if (instrumentAudioCtx) return instrumentAudioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    instrumentAudioCtx = new Ctx();
    return instrumentAudioCtx;
  }

  function loadInstrumentSample(ctx, folder, sampleName) {
    const key = `${folder}/${sampleName}`;
    if (instrumentSampleCache.has(key)) return instrumentSampleCache.get(key);
    const promise = fetch(`${SOUNDFONT_BASE_URL}${folder}-mp3/${sampleName}.mp3`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`sample fetch failed: ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((arrayBuf) => ctx.decodeAudioData(arrayBuf));
    instrumentSampleCache.set(key, promise);
    return promise;
  }

  // Plays one real instrument sample at the given MIDI note -- fire-and-
  // forget (never blocks the caller on the network/decode round-trip);
  // a fetch/decode failure (offline, sample genuinely missing) is silently
  // dropped rather than surfaced, same "never let sonification errors break
  // the page" spirit as everything else in this section.
  async function playInstrumentNote(folder, midiNote, velocity, durationS, detuneCents = 0) {
    const ctx = ensureInstrumentAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const nearest = midiNoteToNearestSample(midiNote);
    if (!nearest) return;
    try {
      const buffer = await loadInstrumentSample(ctx, folder, nearest.sampleName);
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      // The base semitone shift to reach the nearest available sample, times
      // Detune/Randomness's own cents offset -- both are just playbackRate
      // multipliers, so they combine into one real-sampler-style pitch shift.
      src.playbackRate.value = Math.pow(2, nearest.semitoneOffset / 12) * centsToRateFactor(detuneCents);
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0.0001, Math.min(1, velocity));
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      if (durationS) src.stop(now + durationS);
    } catch (e) {
      // Network/decoding failure -- stays silent this note, same as above.
    }
  }

  // ---- MIDI out (Web MIDI API) ----
  let midiAccess = null;
  let midiOutput = null;

  async function ensureMidiAccess() {
    if (midiAccess || !navigator.requestMIDIAccess) return midiAccess;
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      midiAccess.onstatechange = refreshMidiOutputs;
      refreshMidiOutputs();
    } catch (e) {
      midiAccess = null;
    }
    return midiAccess;
  }

  function refreshMidiOutputs() {
    if (!midiAccess) return;
    const outputs = [...midiAccess.outputs.values()];
    const previouslySelectedId = midiOutput && midiOutput.id;
    midiOutputSelect.innerHTML = "";
    if (!outputs.length) {
      midiOutput = null;
      midiOutputWrap.classList.add("hide");
      return;
    }
    outputs.forEach((out) => {
      const option = document.createElement("option");
      option.value = out.id;
      option.textContent = out.name || "MIDI output";
      midiOutputSelect.appendChild(option);
    });
    midiOutput = outputs.find((o) => o.id === previouslySelectedId) || outputs[0];
    midiOutputSelect.value = midiOutput.id;
    midiOutputWrap.classList.remove("hide");
  }

  const midiProgramSentPerChannel = {};

  function sendMidiProgramChange(channel, program) {
    if (!midiOutput) return;
    if (midiProgramSentPerChannel[channel] === program) return;
    midiProgramSentPerChannel[channel] = program;
    midiOutput.send([0xc0 | channel, program]);
  }

  function sendMidiNoteOn(channel, midiNote, velocity) {
    if (!midiOutput) return;
    const note = Math.max(0, Math.min(127, Math.round(midiNote)));
    const vel = Math.max(1, Math.min(127, Math.round(velocity * 127)));
    midiOutput.send([0x90 | channel, note, vel]);
  }

  function sendMidiNoteOff(channel, midiNote) {
    if (!midiOutput) return;
    const note = Math.max(0, Math.min(127, Math.round(midiNote)));
    midiOutput.send([0x80 | channel, note, 0]);
  }

  // A frequency/playback-rate multiplier for a pitch shift given in cents
  // (1/100th of a semitone) -- shared by Detune and Randomness's pitch
  // jitter across all three synth outputs (oscillator frequency directly,
  // sample playbackRate, and MIDI pitch bend below).
  function centsToRateFactor(cents) {
    return Math.pow(2, cents / 1200);
  }

  // A small random pitch offset (in cents) scaled by a 0-100 Randomness
  // percentage -- 0 randomness always returns exactly 0 (no behavior change
  // from the deterministic default), 100 returns up to +-maxCents.
  function randomCentsJitter(randomnessPercent, maxCents) {
    if (!randomnessPercent) return 0;
    return (Math.random() * 2 - 1) * maxCents * (randomnessPercent / 100);
  }

  const midiPitchBendSentPerChannel = {};

  // Standard MIDI pitch bend (0xE0), 14-bit value centred at 8192 -- default
  // GM pitch bend range on virtually every synth is +-2 semitones (200
  // cents) with no RPN setup required, so Detune/Randomness's cents values
  // are clamped to that range to guarantee this works on any connected
  // instrument out of the box.
  function sendMidiPitchBend(channel, cents) {
    if (!midiOutput) return;
    const clamped = Math.max(-200, Math.min(200, cents));
    const value = Math.max(0, Math.min(16383, Math.round(8192 + (clamped / 200) * 8191)));
    if (midiPitchBendSentPerChannel[channel] === value) return;
    midiPitchBendSentPerChannel[channel] = value;
    midiOutput.send([0xe0 | channel, value & 0x7f, (value >> 7) & 0x7f]);
  }

  const midiExpressionSentPerChannel = {};

  // Standard MIDI CC 11 (Expression) -- the real, standard way to continuously
  // vary a HELD note's loudness over time, used by dominant tone's Continuous
  // style over MIDI (a single sustained note whose pitch/volume both keep
  // changing, rather than a one-shot Note On/Off per pluck).
  function sendMidiExpression(channel, value0to1) {
    if (!midiOutput) return;
    const value = Math.max(0, Math.min(127, Math.round(value0to1 * 127)));
    if (midiExpressionSentPerChannel[channel] === value) return;
    midiExpressionSentPerChannel[channel] = value;
    midiOutput.send([0xb0 | channel, 11, value]);
  }

  // Plays one note out to the currently selected MIDI output: a program
  // change (only sent when it actually changes, so repeated notes on the
  // same instrument don't re-select it every time), a pitch bend representing
  // Detune/Randomness's combined cents offset (also deduped against the last
  // value sent), then note on, then note off after durationMs.
  function playMidiNote(channel, program, midiNote, velocity, durationMs, detuneCents = 0) {
    if (!midiOutput) return;
    sendMidiProgramChange(channel, program);
    sendMidiPitchBend(channel, detuneCents);
    sendMidiNoteOn(channel, midiNote, velocity);
    setTimeout(() => sendMidiNoteOff(channel, midiNote), durationMs);
  }

  const CHIME_MIDI_CHANNEL = 0;
  const DOM_TONE_MIDI_CHANNEL = 1;
  const EDGE_TONE_MIDI_CHANNEL = 2;

  // ---- Colour proximity chime ----
  // First step of the "Sight <-> Sound" direction (index.html's "What's
  // next" section): a soft tone that rises in pitch and volume as the live
  // camera view (sampled the same way calibration aiming already does, via
  // sampleCenterColor -- the crosshair position when not actively aiming)
  // nears whichever saved calibration colour it's closest to in Lab space
  // -- the same colour-distance space this file's correction spread
  // already reasons in, not a naive RGB difference. Silent whenever
  // nothing is close or NO COLOURS ARE SAVED YET -- there's nothing to
  // chime near until at least one is calibrated (see Calibrate a colour),
  // by design, so it never drones -- but that also means it can look like
  // it "does nothing" if you turn it on before saving a colour.
  //
  // Actually melodic, not a single tone sliding in pitch: proximity steps
  // through a pentatonic scale (the same "no wrong notes" scale real wind
  // chimes use) and plucks a short, separate bell-like note each time it
  // crosses into a new step -- closer plays a higher note in the scale --
  // rather than one continuous drone bending frequency.
  //
  // Runs on its own AudioContext with nothing feeding INTO it -- it only
  // ever plays oscillator notes out, never reads from the microphone --
  // so there's no risk of it looping back into Audio colour tint's or
  // Sound Nebula's analyser input.
  // A pentatonic major scale (root + whole/whole/minor-third/whole steps),
  // spanning two octaves so proximity has real melodic room to climb
  // through rather than a narrow handful of notes.
  const CHIME_SCALE_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const CHIME_ROOT_HZ = 261.63; // C4
  const CHIME_SCALE_HZ = CHIME_SCALE_SEMITONES.map((st) => CHIME_ROOT_HZ * Math.pow(2, st / 12));
  let chimeEnabled = (() => {
    try { return localStorage.getItem(CHIME_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let chimeVolume = loadOutlineNumberPref(CHIME_VOLUME_KEY, CHIME_DEFAULT_VOLUME);
  let chimeOutput = (() => {
    try {
      const raw = localStorage.getItem(CHIME_OUTPUT_KEY);
      return raw === "midi" || raw === "instrument" ? raw : "synth";
    } catch (e) { return "synth"; }
  })();
  let chimeInstrument = (() => {
    try {
      const raw = localStorage.getItem(CHIME_INSTRUMENT_KEY);
      return GM_ALL_INSTRUMENTS.some((i) => i.folder === raw) ? raw : "music_box";
    } catch (e) { return "music_box"; }
  })();
  // Colour source: Saved (needs a calibrated colour, the original design)
  // or Live (no setup -- reacts to how vivid the current on-screen colour
  // already is, see updateProximityChime).
  let chimeSource = (() => {
    try { return localStorage.getItem(CHIME_SOURCE_KEY) === "live" ? "live" : "saved"; } catch (e) { return "saved"; }
  })();
  // Range: how far away (in Lab colour distance) the chime starts
  // responding at all -- wider reaches from farther off, narrower means
  // only a near-exact match triggers it. Only meaningful for Saved (Live
  // has no saved-point distance to reach from).
  let chimeRange = loadOutlineNumberPref(CHIME_RANGE_KEY, CHIME_DEFAULT_RANGE);
  // Tempo: how often it re-chimes (ms) while held steady on an exact
  // match -- otherwise it would only ever play once and go quiet.
  let chimeTempoMs = loadOutlineNumberPref(CHIME_TEMPO_KEY, CHIME_DEFAULT_TEMPO_MS);
  // Detune (cents, +-100) and Randomness (0-100%, see randomCentsJitter and
  // updateProximityChime's neighbouring-scale-step nudge) -- both default to
  // 0, matching the original deterministic behaviour exactly.
  let chimeDetuneCents = loadOutlineNumberPref(CHIME_DETUNE_KEY, 0);
  let chimeRandomness = loadOutlineNumberPref(CHIME_RANDOMNESS_KEY, 0);
  // Pattern: which note-choice generator actually plays -- see the big
  // comment above CHIME_PATTERN_KEY. chimeWalkIndex is Random walk's own
  // runtime-only position (not persisted -- it's a live wander, not a
  // setting), reset whenever the pattern changes or chime turns off.
  let chimePattern = (() => {
    try {
      const raw = localStorage.getItem(CHIME_PATTERN_KEY);
      return raw === "random_walk" || raw === "chord_cluster" ? raw : "proximity";
    } catch (e) { return "proximity"; }
  })();
  let chimeWalkIndex = null;
  let chimeAudioCtx = null;
  let chimeTimerId = null;
  // Which scale step last actually played a note, and how many sampling
  // ticks since -- lets a held-steady "right on the colour" position keep
  // gently re-chiming (see updateProximityChime) instead of playing one
  // note and then going quiet while you're still matched.
  let chimeLastNoteIndex = -1;
  let chimeTicksSinceLastNote = 0;

  // Lab-space distance at which the chime is essentially "on the exact
  // colour" (full volume/pitch) -- the far end (fully faded to silence)
  // is chimeRange above, now user-adjustable.
  const CHIME_CLOSE_LAB_DISTANCE = 6;

  function nearestSavedPointLabDistance(rgb) {
    if (!points.length) return null;
    const [L, A, B] = rgb2lab(rgb[0], rgb[1], rgb[2]);
    let best = Infinity;
    for (const p of points) {
      const [pL, pA, pB] = rgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      const d = Math.hypot(L - pL, A - pA, B - pB);
      if (d < best) best = d;
    }
    return best;
  }

  function ensureChimeAudio() {
    if (chimeAudioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    chimeAudioCtx = new Ctx();
  }

  // Plucks one short bell-like note -- its own oscillator + gain envelope,
  // created and discarded per note (the standard Web Audio way to play a
  // percussive/melodic hit), instead of one continuous tone bending pitch.
  // A quick attack (it's a pluck, not a fade-in) into a slow exponential
  // decay is what makes it read as a struck note rather than a beep.
  function playChimeNote(freq, velocity) {
    const totalCents = chimeDetuneCents + randomCentsJitter(chimeRandomness, CHIME_RANDOMNESS_MAX_CENTS);
    if (chimeOutput === "midi") {
      const inst = GM_ALL_INSTRUMENTS.find((i) => i.folder === chimeInstrument) || GM_ALL_INSTRUMENTS.find((i) => i.folder === "music_box");
      playMidiNote(CHIME_MIDI_CHANNEL, inst.program, hzToMidiNote(freq), velocity, 1100, totalCents);
      return;
    }
    if (chimeOutput === "instrument") {
      playInstrumentNote(chimeInstrument, hzToMidiNote(freq), velocity * (chimeVolume / 100), 1.3, totalCents);
      return;
    }
    const now = chimeAudioCtx.currentTime;
    const osc = chimeAudioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq * centsToRateFactor(totalCents);
    const gain = chimeAudioCtx.createGain();
    const peak = Math.max(0.001, velocity * (chimeVolume / 100) * SONIFICATION_ONESHOT_PEAK);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(gain);
    gain.connect(chimeAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  function updateProximityChime() {
    if (!chimeAudioCtx) return;
    chimeTicksSinceLastNote++;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    let closeness;
    if (chimeSource === "live") {
      // No saved colours needed: treat how vivid (saturated and lit) the
      // scene's own current dominant colour already is as the "closeness"
      // signal, reusing the same sampling this file already does for the
      // dominant colour tone -- a dull/grey scene stays quiet, a vivid one
      // chimes, with no calibration step required first.
      const rgb = sampleDominantColor();
      if (!rgb) {
        chimeLastNoteIndex = -1;
        return;
      }
      const [, s, l] = rgb2hsl(rgb[0], rgb[1], rgb[2]);
      closeness = Math.max(0, Math.min(1, s * Math.min(1, l * 1.5)));
    } else {
      const dist = nearestSavedPointLabDistance(sampleCenterColor());
      if (dist == null) {
        chimeLastNoteIndex = -1;
        return;
      }
      closeness = Math.max(0, Math.min(1, 1 - (dist - CHIME_CLOSE_LAB_DISTANCE) / (chimeRange - CHIME_CLOSE_LAB_DISTANCE)));
    }
    if (closeness <= 0.02) {
      chimeLastNoteIndex = -1;
      return;
    }
    const noteIndex = Math.min(CHIME_SCALE_HZ.length - 1, Math.floor(closeness * CHIME_SCALE_HZ.length));
    const steppedToNewNote = noteIndex !== chimeLastNoteIndex;
    // Right at the top of the scale (as close as the mapping distinguishes)
    // is the one place a held-steady match would otherwise go silent after
    // its first note -- keep it gently re-chiming instead.
    const repeatTicks = Math.max(1, Math.round(chimeTempoMs / 150));
    const heldAtTopNote = noteIndex === CHIME_SCALE_HZ.length - 1 && chimeTicksSinceLastNote >= repeatTicks;
    if (!steppedToNewNote && !heldAtTopNote) return;
    // Tracking (steppedToNewNote/repeat timing) always uses the true,
    // deterministic noteIndex -- Randomness only ever nudges which note
    // actually SOUNDS by one scale step, at up to a 60% chance scaled by
    // the Randomness percentage, so at 0 (the default) this is always
    // exactly the deterministic note, unchanged from before this control
    // existed.
    chimeLastNoteIndex = noteIndex;
    chimeTicksSinceLastNote = 0;
    let playedIndex = noteIndex;
    if (chimePattern === "random_walk") {
      // Wanders the scale one step at a time instead of jumping straight to
      // the closeness-driven note -- biased back toward that note (so it
      // still tracks proximity over time), with Randomness loosening the
      // bias: 0% stays a fairly direct, mostly-toward-target walk; 100%
      // wanders much more freely.
      if (chimeWalkIndex == null) chimeWalkIndex = noteIndex;
      const towardBias = 0.9 - (chimeRandomness / 100) * 0.6;
      let step;
      if (Math.random() < towardBias) {
        step = chimeWalkIndex < noteIndex ? 1 : chimeWalkIndex > noteIndex ? -1 : (Math.random() < 0.5 ? -1 : 1);
      } else {
        step = Math.random() < 0.5 ? -1 : 1;
      }
      chimeWalkIndex = Math.max(0, Math.min(CHIME_SCALE_HZ.length - 1, chimeWalkIndex + step));
      playedIndex = chimeWalkIndex;
    } else if (chimeRandomness > 0 && Math.random() * 100 < chimeRandomness * 0.6) {
      playedIndex = Math.max(0, Math.min(CHIME_SCALE_HZ.length - 1, noteIndex + (Math.random() < 0.5 ? -1 : 1)));
    }
    playChimeNote(CHIME_SCALE_HZ[playedIndex], closeness);
    if (chimePattern === "chord_cluster") {
      // Plays the proximity note's third alongside it -- a real second
      // simultaneous note (not a substitute), so this pattern is genuinely
      // fuller/chordal rather than single-note, at every output (synth
      // layers a second oscillator, MIDI sends a second Note On on the same
      // channel, Instrument plays a second overlapping sample).
      const clusterIndex = Math.min(CHIME_SCALE_HZ.length - 1, playedIndex + 2);
      if (clusterIndex !== playedIndex) playChimeNote(CHIME_SCALE_HZ[clusterIndex], closeness * 0.8);
    }
  }

  function updateChimeSamplingTimer() {
    if (chimeEnabled && !chimeTimerId) {
      ensureChimeAudio();
      if (chimeAudioCtx && chimeAudioCtx.state === "suspended") chimeAudioCtx.resume().catch(() => {});
      chimeTimerId = setInterval(updateProximityChime, 150);
    } else if (!chimeEnabled && chimeTimerId) {
      clearInterval(chimeTimerId);
      chimeTimerId = null;
      chimeLastNoteIndex = -1;
      chimeWalkIndex = null;
    }
  }

  function saveChimeEnabledPref() {
    try { localStorage.setItem(CHIME_ENABLED_KEY, chimeEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveChimeVolumePref() {
    try { localStorage.setItem(CHIME_VOLUME_KEY, String(chimeVolume)); } catch (e) {}
  }
  function saveChimeOutputPref() {
    try { localStorage.setItem(CHIME_OUTPUT_KEY, chimeOutput); } catch (e) {}
  }
  function saveChimeInstrumentPref() {
    try { localStorage.setItem(CHIME_INSTRUMENT_KEY, chimeInstrument); } catch (e) {}
  }
  function saveChimeRangePref() {
    try { localStorage.setItem(CHIME_RANGE_KEY, String(chimeRange)); } catch (e) {}
  }
  function saveChimeTempoPref() {
    try { localStorage.setItem(CHIME_TEMPO_KEY, String(chimeTempoMs)); } catch (e) {}
  }
  function saveChimeSourcePref() {
    try { localStorage.setItem(CHIME_SOURCE_KEY, chimeSource); } catch (e) {}
  }
  function saveChimeDetunePref() {
    try { localStorage.setItem(CHIME_DETUNE_KEY, String(chimeDetuneCents)); } catch (e) {}
  }
  function saveChimeRandomnessPref() {
    try { localStorage.setItem(CHIME_RANDOMNESS_KEY, String(chimeRandomness)); } catch (e) {}
  }
  function saveChimePatternPref() {
    try { localStorage.setItem(CHIME_PATTERN_KEY, chimePattern); } catch (e) {}
  }

  // Range only applies to Saved (a Lab-distance threshold) -- Live has
  // nothing to measure distance from, so it's hidden in that mode.
  function updateChimeSourceControlsVisibility() {
    chimeRangeWrap.classList.toggle("hide", !chimeEnabled || chimeSource !== "saved");
  }

  function setChimeEnabled(next) {
    if (next === chimeEnabled) return;
    chimeEnabled = next;
    chimeBtn.textContent = `Colour proximity chime: ${chimeEnabled ? "On" : "Off"}`;
    chimeBtn.setAttribute("aria-pressed", String(chimeEnabled));
    chimeVolumeWrap.classList.toggle("hide", !chimeEnabled);
    chimeSourceWrap.classList.toggle("hide", !chimeEnabled);
    chimeOutputWrap.classList.toggle("hide", !chimeEnabled);
    chimeInstrumentWrap.classList.toggle("hide", !chimeEnabled || chimeOutput === "synth");
    updateChimeSourceControlsVisibility();
    chimeTempoWrap.classList.toggle("hide", !chimeEnabled);
    chimeDetuneWrap.classList.toggle("hide", !chimeEnabled);
    chimeRandomnessWrap.classList.toggle("hide", !chimeEnabled);
    chimePatternWrap.classList.toggle("hide", !chimeEnabled);
    saveChimeEnabledPref();
    updateChimeSamplingTimer();
  }

  function setChimeOutput(next) {
    if (next !== "synth" && next !== "midi" && next !== "instrument") return;
    chimeOutput = next;
    chimeInstrumentWrap.classList.toggle("hide", !chimeEnabled || chimeOutput === "synth");
    if (chimeOutput === "midi") ensureMidiAccess();
    saveChimeOutputPref();
  }

  function setChimeInstrument(next) {
    if (!GM_ALL_INSTRUMENTS.some((i) => i.folder === next)) return;
    chimeInstrument = next;
    saveChimeInstrumentPref();
  }

  function setChimeSource(next) {
    if (next !== "saved" && next !== "live") return;
    chimeSource = next;
    chimeLastNoteIndex = -1;
    updateChimeSourceControlsVisibility();
    saveChimeSourcePref();
  }

  function setChimeRange(next) {
    chimeRange = Math.max(CHIME_CLOSE_LAB_DISTANCE + 4, Math.min(80, next));
    saveChimeRangePref();
  }

  function setChimeTempo(next) {
    chimeTempoMs = Math.max(150, Math.min(2000, next));
    saveChimeTempoPref();
  }

  function setChimeDetune(next) {
    chimeDetuneCents = Math.max(-100, Math.min(100, next));
    saveChimeDetunePref();
  }

  function setChimeRandomness(next) {
    chimeRandomness = Math.max(0, Math.min(100, next));
    saveChimeRandomnessPref();
  }

  function setChimePattern(next) {
    if (next !== "proximity" && next !== "random_walk" && next !== "chord_cluster") return;
    chimePattern = next;
    chimeWalkIndex = null;
    saveChimePatternPref();
  }

  // ---- Dominant colour tone ----
  // A second, more ambient sonification, alongside the proximity chime
  // above: a soft continuous tone tracking the whole corrected scene's
  // average colour, not any one saved point specifically -- hue drives
  // pitch, lightness drives volume. "Very cheap" per this feature's own
  // design goal (see index.html's "What's next" section) -- reuses the
  // existing low-res scene-sampling canvas (already drawn from `stage`,
  // the corrected output, for particle scene-attraction) and just averages
  // every cell's colour directly, rather than a real k-means clustering
  // pass. Own AudioContext, same "only ever plays out, never reads in"
  // shape as the chime.
  let domToneEnabled = (() => {
    try { return localStorage.getItem(DOM_TONE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let domToneVolume = loadOutlineNumberPref(DOM_TONE_VOLUME_KEY, DOM_TONE_DEFAULT_VOLUME);
  let domToneStyle = (() => {
    try { return localStorage.getItem(DOM_TONE_STYLE_KEY) === "melodic" ? "melodic" : "continuous"; } catch (e) { return "continuous"; }
  })();
  let domToneScientificPitchEnabled = (() => {
    try { return localStorage.getItem(DOM_TONE_SCIENTIFIC_PITCH_KEY) === "1"; } catch (e) { return false; }
  })();
  // Continuous style's target frequency -- the arbitrary "220 +
  // (hue/360)*220" range chosen purely because it's a comfortable, audible
  // octave, or (with Scientific pitch on) one derived from the hue's real
  // spectral wavelength instead (see hueToScientificFreqHz). Shared by all
  // three outputs (synth, MIDI, Instrument) so Scientific pitch affects all
  // of them identically instead of just one.
  function domToneContinuousTargetFreqHz(hue) {
    return domToneScientificPitchEnabled ? hueToScientificFreqHz(hue, 220) : 220 + (hue / 360) * 220;
  }
  let domToneOutput = (() => {
    try {
      const raw = localStorage.getItem(DOM_TONE_OUTPUT_KEY);
      return raw === "midi" || raw === "instrument" ? raw : "synth";
    } catch (e) { return "synth"; }
  })();
  let domToneInstrument = (() => {
    try {
      const raw = localStorage.getItem(DOM_TONE_INSTRUMENT_KEY);
      return GM_ALL_INSTRUMENTS.some((i) => i.folder === raw) ? raw : "marimba";
    } catch (e) { return "marimba"; }
  })();
  let domToneAudioCtx = null;
  let domToneOsc = null;
  let domToneGainNode = null;
  let domToneTimerId = null;
  // Melodic mode's groove: the same major-pentatonic shape as the chime's
  // scale, but rooted a tritone away (F#3 instead of C4) -- a tritone
  // transposition of a pentatonic scale is the one shift guaranteed to land
  // on a completely disjoint set of pitch classes (an earlier attempt at
  // rooting this on A3 as a "minor pentatonic" turned out to share every
  // note with the chime's scale -- A minor pentatonic IS C major
  // pentatonic's relative minor, same five notes -- so this really is a
  // different scale, not just a different mode of the same one). Chord
  // degrees (root/third/fifth/octave-ish) roll in a slow arpeggio rather
  // than firing all at once.
  const DOM_TONE_PENTATONIC_DEGREES = [0, 2, 4, 7, 9];
  const DOM_TONE_ROOT_HZ = 185.00; // F#3
  const DOM_TONE_CHORD_OFFSETS = [0, 2, 4, 7];
  // Range: how many octaves of the pentatonic scale the arpeggio (and the
  // chord-root spread) can reach across -- rebuilt whenever the Range
  // control changes (see setDomToneRange), not a fixed one-time table.
  let domToneRangeOctaves = loadOutlineNumberPref(DOM_TONE_RANGE_KEY, DOM_TONE_DEFAULT_RANGE_OCTAVES);
  function buildPentatonicScaleHz(rootHz, rangeOctaves) {
    const semis = [];
    for (let oct = 0; oct < rangeOctaves; oct++) {
      for (const d of DOM_TONE_PENTATONIC_DEGREES) semis.push(d + oct * 12);
    }
    semis.push(rangeOctaves * 12); // top root, completing the span
    return semis.map((st) => rootHz * Math.pow(2, st / 12));
  }
  let DOM_TONE_SCALE_HZ = buildPentatonicScaleHz(DOM_TONE_ROOT_HZ, domToneRangeOctaves);
  // Tempo: ms per arpeggio step, converted to a whole number of the shared
  // 150ms sampling ticks (so it stays aligned with when density is
  // actually resampled) -- defaults to every 3rd tick (~450ms), slow
  // enough to read as an ambient pad, not a fast melodic run.
  let domToneTempoMs = loadOutlineNumberPref(DOM_TONE_TEMPO_KEY, DOM_TONE_DEFAULT_TEMPO_MS);
  // Detune applies to both Continuous (shifts the drone's pitch centre) and
  // Melodic (shifts every arpeggio note); Randomness only meaningfully
  // applies to Melodic's discrete note choice (see updateDominantColorTone).
  let domToneDetuneCents = loadOutlineNumberPref(DOM_TONE_DETUNE_KEY, 0);
  let domToneRandomness = loadOutlineNumberPref(DOM_TONE_RANDOMNESS_KEY, 0);
  // Pattern (Melodic only): which note-choice generator actually plays --
  // see the big comment above CHIME_PATTERN_KEY. domToneWalkIndex is Random
  // walk's own runtime-only position, reset whenever the pattern changes or
  // dominant tone turns off.
  let domTonePattern = (() => {
    try {
      const raw = localStorage.getItem(DOM_TONE_PATTERN_KEY);
      return raw === "random_walk" || raw === "drone_pulse" ? raw : "arpeggio";
    } catch (e) { return "arpeggio"; }
  })();
  let domToneWalkIndex = null;
  let domToneArpTickCount = 0;
  let domToneArpStep = 0;
  // Continuous style over MIDI: a single held note whose pitch keeps moving,
  // not a one-shot pluck -- default MIDI pitch bend can only cover +-2
  // semitones without extra RPN setup, but the mapped hue range spans a
  // full octave, so this re-triggers a new Note On only when the target
  // pitch crosses into a new semitone, and pitch-bends smoothly within it
  // otherwise (the same technique a monophonic-legato MIDI patch uses).
  let domToneContinuousMidiBaseNote = null;
  // Continuous style over Instrument: a single looped real sample whose
  // playbackRate keeps moving -- genuinely continuous, no semitone
  // quantization needed at all (unlike MIDI above), since playbackRate has
  // no +-2-semitone ceiling.
  let domToneContinuousInstrumentSrc = null;
  let domToneContinuousInstrumentGain = null;
  let domToneContinuousInstrumentBaseMidiNote = null;
  let domToneContinuousInstrumentFolder = null;

  function sampleDominantColor() {
    if (!gl || !stage.width || !stage.height) return null;
    sceneSampleCtx.drawImage(stage, 0, 0, SCENE_GRID_W, SCENE_GRID_H);
    const data = sceneSampleCtx.getImageData(0, 0, SCENE_GRID_W, SCENE_GRID_H).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  function ensureDomToneAudio() {
    if (domToneAudioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    domToneAudioCtx = new Ctx();
    domToneOsc = domToneAudioCtx.createOscillator();
    domToneOsc.type = "sine";
    domToneOsc.frequency.value = 220;
    domToneGainNode = domToneAudioCtx.createGain();
    domToneGainNode.gain.value = 0;
    domToneOsc.connect(domToneGainNode);
    domToneGainNode.connect(domToneAudioCtx.destination);
    domToneOsc.start();
  }

  // Melodic mode's single arpeggio note -- its own oscillator + gain
  // envelope, same one-shot pattern as the chime's pluck but with a slower
  // attack and a longer decay, so overlapping notes blend into a pad
  // instead of standing apart as separate hits.
  function playDomTonePadNote(freq, velocity) {
    const totalCents = domToneDetuneCents + randomCentsJitter(domToneRandomness, DOM_TONE_RANDOMNESS_MAX_CENTS);
    if (domToneOutput === "midi") {
      const inst = GM_ALL_INSTRUMENTS.find((i) => i.folder === domToneInstrument) || GM_ALL_INSTRUMENTS.find((i) => i.folder === "marimba");
      playMidiNote(DOM_TONE_MIDI_CHANNEL, inst.program, hzToMidiNote(freq), velocity, 1600, totalCents);
      return;
    }
    if (domToneOutput === "instrument") {
      playInstrumentNote(domToneInstrument, hzToMidiNote(freq), velocity * (domToneVolume / 100), 1.8, totalCents);
      return;
    }
    const now = domToneAudioCtx.currentTime;
    const osc = domToneAudioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * centsToRateFactor(totalCents);
    const gain = domToneAudioCtx.createGain();
    const peak = Math.max(0.001, velocity * (domToneVolume / 100) * SONIFICATION_ONESHOT_PEAK);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(gain);
    gain.connect(domToneAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.7);
  }

  function stopDomToneContinuousMidi() {
    if (domToneContinuousMidiBaseNote != null) {
      sendMidiNoteOff(DOM_TONE_MIDI_CHANNEL, domToneContinuousMidiBaseNote);
      domToneContinuousMidiBaseNote = null;
    }
  }

  function updateDomToneContinuousMidi(rgb, l) {
    if (!rgb || l < 0.03) {
      stopDomToneContinuousMidi();
      return;
    }
    const [h] = rgb2hsl(rgb[0], rgb[1], rgb[2]);
    const targetFreq = domToneContinuousTargetFreqHz(h);
    // Detune folds into the note position itself (not just a bend offset),
    // so it's still represented even across a base-note change.
    const exactMidiNote = hzToMidiNote(targetFreq) + domToneDetuneCents / 100;
    const nearestBase = Math.round(exactMidiNote);
    const bendCents = (exactMidiNote - nearestBase) * 100;
    const inst = GM_ALL_INSTRUMENTS.find((i) => i.folder === domToneInstrument) || GM_ALL_INSTRUMENTS.find((i) => i.folder === "marimba");
    sendMidiProgramChange(DOM_TONE_MIDI_CHANNEL, inst.program);
    if (domToneContinuousMidiBaseNote !== nearestBase) {
      if (domToneContinuousMidiBaseNote != null) sendMidiNoteOff(DOM_TONE_MIDI_CHANNEL, domToneContinuousMidiBaseNote);
      sendMidiPitchBend(DOM_TONE_MIDI_CHANNEL, bendCents);
      sendMidiNoteOn(DOM_TONE_MIDI_CHANNEL, nearestBase, Math.min(1, l * 1.3));
      domToneContinuousMidiBaseNote = nearestBase;
    } else {
      sendMidiPitchBend(DOM_TONE_MIDI_CHANNEL, bendCents);
    }
    sendMidiExpression(DOM_TONE_MIDI_CHANNEL, (domToneVolume / 100) * Math.min(1, l * 1.3));
  }

  function stopDomToneContinuousInstrument() {
    if (domToneContinuousInstrumentSrc) {
      try { domToneContinuousInstrumentSrc.stop(); } catch (e) {}
      domToneContinuousInstrumentSrc.disconnect();
    }
    if (domToneContinuousInstrumentGain) domToneContinuousInstrumentGain.disconnect();
    domToneContinuousInstrumentSrc = null;
    domToneContinuousInstrumentGain = null;
    domToneContinuousInstrumentBaseMidiNote = null;
    domToneContinuousInstrumentFolder = null;
  }

  // Loads one real sample near the middle of the mapped 220-440Hz range and
  // loops it -- the actual continuous pitch tracking happens every tick via
  // playbackRate in updateDomToneContinuousInstrument, not by re-fetching.
  async function ensureDomToneContinuousInstrument() {
    if (domToneOutput !== "instrument" || domToneStyle !== "continuous" || !domToneEnabled) return;
    if (domToneContinuousInstrumentSrc && domToneContinuousInstrumentFolder === domToneInstrument) return;
    stopDomToneContinuousInstrument();
    const ctx = ensureInstrumentAudio();
    if (!ctx) return;
    const centerMidiNote = hzToMidiNote(300);
    const nearest = midiNoteToNearestSample(centerMidiNote);
    if (!nearest) return;
    const folderRequested = domToneInstrument;
    try {
      const buffer = await loadInstrumentSample(ctx, folderRequested, nearest.sampleName);
      // Something changed while this fetch was in flight (turned off,
      // switched away from Continuous/Instrument, or picked a different
      // instrument) -- the settings this load was FOR no longer apply.
      if (domToneOutput !== "instrument" || domToneStyle !== "continuous" || !domToneEnabled || domToneInstrument !== folderRequested) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      domToneContinuousInstrumentSrc = src;
      domToneContinuousInstrumentGain = gain;
      domToneContinuousInstrumentBaseMidiNote = Math.round(centerMidiNote - nearest.semitoneOffset);
      domToneContinuousInstrumentFolder = folderRequested;
    } catch (e) {
      // Network/decode failure -- stays silent, same spirit as playInstrumentNote.
    }
  }

  function updateDomToneContinuousInstrument(rgb, l) {
    if (!rgb || l < 0.03) {
      if (domToneContinuousInstrumentGain) domToneContinuousInstrumentGain.gain.setTargetAtTime(0, instrumentAudioCtx.currentTime, 0.15);
      return;
    }
    if (!domToneContinuousInstrumentSrc || domToneContinuousInstrumentFolder !== domToneInstrument) {
      ensureDomToneContinuousInstrument(); // async, fire-and-forget -- nothing plays until it resolves
      return;
    }
    const [h] = rgb2hsl(rgb[0], rgb[1], rgb[2]);
    const targetFreq = domToneContinuousTargetFreqHz(h);
    const targetMidiNote = hzToMidiNote(targetFreq);
    const rate = Math.pow(2, (targetMidiNote - domToneContinuousInstrumentBaseMidiNote) / 12) * centsToRateFactor(domToneDetuneCents);
    const now = instrumentAudioCtx.currentTime;
    domToneContinuousInstrumentSrc.playbackRate.setTargetAtTime(rate, now, 0.2);
    const targetGain = (domToneVolume / 100) * Math.min(1, l * 1.3) * 0.5;
    domToneContinuousInstrumentGain.gain.setTargetAtTime(targetGain, now, 0.2);
  }

  function updateDominantColorTone() {
    if (!domToneAudioCtx) return;
    const rgb = sampleDominantColor();
    if (domToneStyle === "continuous") {
      const [, , continuousL] = rgb ? rgb2hsl(rgb[0], rgb[1], rgb[2]) : [0, 0, 0];
      if (domToneOutput === "midi") {
        updateDomToneContinuousMidi(rgb, continuousL);
        return;
      }
      if (domToneOutput === "instrument") {
        updateDomToneContinuousInstrument(rgb, continuousL);
        return;
      }
      const now = domToneAudioCtx.currentTime;
      if (!rgb) {
        domToneGainNode.gain.setTargetAtTime(0, now, 0.15);
        return;
      }
      const [h, , l] = rgb2hsl(rgb[0], rgb[1], rgb[2]);
      // Hue mapped across one octave (220-440Hz) rather than the chime's
      // wider proximity range -- narrower pitch range is what keeps this
      // read as an ambient drone, not a lower gain ceiling (that used to
      // sit well below chime/edge texture's own; now shares
      // SONIFICATION_CONTINUOUS_PEAK with edge texture's continuous style
      // instead of being quieter by default just because of a stale
      // per-channel constant).
      const targetFreq = domToneContinuousTargetFreqHz(h) * centsToRateFactor(domToneDetuneCents);
      const targetGain = (domToneVolume / 100) * Math.min(1, l * 1.3) * SONIFICATION_CONTINUOUS_PEAK;
      domToneGainNode.gain.setTargetAtTime(targetGain, now, 0.2);
      domToneOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);
      return;
    }
    // Melodic: hue picks the chord root, an arpeggio step plays every few
    // ticks -- a rolling ambient pad instead of one bent tone.
    domToneArpTickCount++;
    if (!rgb) return;
    const [h, , l] = rgb2hsl(rgb[0], rgb[1], rgb[2]);
    if (l < 0.03) return; // near-black scene -- stays silent, same as continuous mode fading to 0
    const arpTicks = Math.max(1, Math.round(domToneTempoMs / 150));
    if (domToneArpTickCount < arpTicks) return;
    domToneArpTickCount = 0;
    // At Range=1 octave, the scale is short enough that the chord's own
    // span (offsets up to +7) can't fit above every root position -- clamp
    // rootIndex so rootIndex+offset always lands inside the scale, instead
    // of the naive division going negative and producing a NaN frequency.
    const maxRootIndex = Math.max(0, DOM_TONE_SCALE_HZ.length - 1 - DOM_TONE_CHORD_OFFSETS[DOM_TONE_CHORD_OFFSETS.length - 1]);
    const rootIndex = Math.min(maxRootIndex, Math.floor((h / 360) * (maxRootIndex + 1)));
    let playedIndex;
    if (domTonePattern === "drone_pulse") {
      // Repeats the hue-picked root note rhythmically instead of cycling
      // through the chord -- a pulse on one pitch rather than a moving line.
      playedIndex = rootIndex;
      domToneArpStep++;
    } else if (domTonePattern === "random_walk") {
      // Wanders the FULL scale (not just the fixed chord shape) one step at
      // a time, biased back toward the hue-picked root -- Randomness
      // loosens the bias, same shape as the chime's Random walk.
      if (domToneWalkIndex == null) domToneWalkIndex = rootIndex;
      const towardBias = 0.9 - (domToneRandomness / 100) * 0.6;
      let step;
      if (Math.random() < towardBias) {
        step = domToneWalkIndex < rootIndex ? 1 : domToneWalkIndex > rootIndex ? -1 : (Math.random() < 0.5 ? -1 : 1);
      } else {
        step = Math.random() < 0.5 ? -1 : 1;
      }
      domToneWalkIndex = Math.max(0, Math.min(DOM_TONE_SCALE_HZ.length - 1, domToneWalkIndex + step));
      playedIndex = domToneWalkIndex;
      domToneArpStep++;
    } else {
      // Arpeggio (default): cycles a fixed chord-offset sequence off the
      // hue-picked root -- the original behaviour, bit-for-bit unchanged.
      const offset = DOM_TONE_CHORD_OFFSETS[domToneArpStep % DOM_TONE_CHORD_OFFSETS.length];
      domToneArpStep++;
      const noteIndex = Math.min(DOM_TONE_SCALE_HZ.length - 1, rootIndex + offset);
      // Randomness (0 by default -- deterministic, unchanged) can substitute
      // the arpeggio's fixed chord-offset sequence with any other tone from
      // the same chord shape, at up to a 60% chance scaled by the Randomness
      // percentage -- domToneArpStep itself still always advances on its own
      // regular schedule, so the tempo/step logic is unaffected.
      playedIndex = noteIndex;
      if (domToneRandomness > 0 && Math.random() * 100 < domToneRandomness * 0.6) {
        const randOffset = DOM_TONE_CHORD_OFFSETS[Math.floor(Math.random() * DOM_TONE_CHORD_OFFSETS.length)];
        playedIndex = Math.min(DOM_TONE_SCALE_HZ.length - 1, rootIndex + randOffset);
      }
    }
    playDomTonePadNote(DOM_TONE_SCALE_HZ[playedIndex], Math.min(1, l * 1.3));
  }

  function updateDomToneSamplingTimer() {
    if (domToneEnabled && !domToneTimerId) {
      ensureDomToneAudio();
      if (domToneAudioCtx && domToneAudioCtx.state === "suspended") domToneAudioCtx.resume().catch(() => {});
      domToneTimerId = setInterval(updateDominantColorTone, 150);
    } else if (!domToneEnabled && domToneTimerId) {
      clearInterval(domToneTimerId);
      domToneTimerId = null;
      domToneArpTickCount = 0;
      if (domToneGainNode) domToneGainNode.gain.setTargetAtTime(0, domToneAudioCtx.currentTime, 0.1);
    }
  }

  function saveDomToneEnabledPref() {
    try { localStorage.setItem(DOM_TONE_ENABLED_KEY, domToneEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveDomToneVolumePref() {
    try { localStorage.setItem(DOM_TONE_VOLUME_KEY, String(domToneVolume)); } catch (e) {}
  }
  function saveDomToneStylePref() {
    try { localStorage.setItem(DOM_TONE_STYLE_KEY, domToneStyle); } catch (e) {}
  }
  function saveDomToneScientificPitchPref() {
    try { localStorage.setItem(DOM_TONE_SCIENTIFIC_PITCH_KEY, domToneScientificPitchEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveDomToneOutputPref() {
    try { localStorage.setItem(DOM_TONE_OUTPUT_KEY, domToneOutput); } catch (e) {}
  }
  function saveDomToneInstrumentPref() {
    try { localStorage.setItem(DOM_TONE_INSTRUMENT_KEY, domToneInstrument); } catch (e) {}
  }
  function saveDomToneRangePref() {
    try { localStorage.setItem(DOM_TONE_RANGE_KEY, String(domToneRangeOctaves)); } catch (e) {}
  }
  function saveDomToneTempoPref() {
    try { localStorage.setItem(DOM_TONE_TEMPO_KEY, String(domToneTempoMs)); } catch (e) {}
  }
  function saveDomToneDetunePref() {
    try { localStorage.setItem(DOM_TONE_DETUNE_KEY, String(domToneDetuneCents)); } catch (e) {}
  }
  function saveDomToneRandomnessPref() {
    try { localStorage.setItem(DOM_TONE_RANDOMNESS_KEY, String(domToneRandomness)); } catch (e) {}
  }
  function saveDomTonePatternPref() {
    try { localStorage.setItem(DOM_TONE_PATTERN_KEY, domTonePattern); } catch (e) {}
  }

  // Output/Instrument now apply to BOTH styles: Continuous over MIDI holds
  // one note and pitch-bends/re-triggers only on a semitone crossing (see
  // updateDomToneContinuousMidi), and Continuous over Instrument loops one
  // real sample and continuously re-tunes its playbackRate (see
  // updateDomToneContinuousInstrument) -- both real, working equivalents of
  // the synth oscillator's continuous pitch bend, not one-shot notes.
  // Range/Tempo/Randomness/Pattern only make sense for Melodic's discrete
  // arpeggio notes, so those stay Melodic-only; Detune applies to both.
  function updateDomToneOutputControlsVisibility() {
    const outputShow = domToneEnabled;
    const melodicShow = domToneEnabled && domToneStyle === "melodic";
    const continuousShow = domToneEnabled && domToneStyle === "continuous";
    domToneOutputWrap.classList.toggle("hide", !outputShow);
    domToneInstrumentWrap.classList.toggle("hide", !outputShow || domToneOutput === "synth");
    domToneRangeWrap.classList.toggle("hide", !melodicShow);
    domToneTempoWrap.classList.toggle("hide", !melodicShow);
    domToneRandomnessWrap.classList.toggle("hide", !melodicShow);
    domTonePatternWrap.classList.toggle("hide", !melodicShow);
    domToneScientificPitchWrap.classList.toggle("hide", !continuousShow);
    domToneDetuneWrap.classList.toggle("hide", !domToneEnabled);
  }

  function setDomToneEnabled(next) {
    if (next === domToneEnabled) return;
    domToneEnabled = next;
    domToneBtn.textContent = `Dominant colour tone: ${domToneEnabled ? "On" : "Off"}`;
    domToneBtn.setAttribute("aria-pressed", String(domToneEnabled));
    domToneVolumeWrap.classList.toggle("hide", !domToneEnabled);
    domToneStyleWrap.classList.toggle("hide", !domToneEnabled);
    updateDomToneOutputControlsVisibility();
    if (!domToneEnabled) {
      stopDomToneContinuousMidi();
      stopDomToneContinuousInstrument();
    }
    saveDomToneEnabledPref();
    updateDomToneSamplingTimer();
  }

  function setDomToneStyle(next) {
    if (next !== "continuous" && next !== "melodic") return;
    domToneStyle = next;
    if (domToneStyle === "continuous" && domToneGainNode && domToneAudioCtx) {
      domToneGainNode.gain.setTargetAtTime(0, domToneAudioCtx.currentTime, 0.1);
    }
    if (domToneStyle === "melodic") {
      stopDomToneContinuousMidi();
      stopDomToneContinuousInstrument();
    }
    domToneArpTickCount = 0;
    domToneWalkIndex = null;
    updateDomToneOutputControlsVisibility();
    saveDomToneStylePref();
  }

  function setDomToneOutput(next) {
    if (next !== "synth" && next !== "midi" && next !== "instrument") return;
    if (domToneStyle === "continuous") {
      if (domToneOutput === "midi" && next !== "midi") stopDomToneContinuousMidi();
      if (domToneOutput === "instrument" && next !== "instrument") stopDomToneContinuousInstrument();
    }
    domToneOutput = next;
    updateDomToneOutputControlsVisibility();
    if (domToneOutput === "midi") ensureMidiAccess();
    saveDomToneOutputPref();
  }

  function setDomToneInstrument(next) {
    if (!GM_ALL_INSTRUMENTS.some((i) => i.folder === next)) return;
    domToneInstrument = next;
    saveDomToneInstrumentPref();
  }

  function setDomToneRange(next) {
    domToneRangeOctaves = Math.max(1, Math.min(3, Math.round(next)));
    DOM_TONE_SCALE_HZ = buildPentatonicScaleHz(DOM_TONE_ROOT_HZ, domToneRangeOctaves);
    domToneArpStep = 0;
    saveDomToneRangePref();
  }

  function setDomToneTempo(next) {
    domToneTempoMs = Math.max(150, Math.min(1500, next));
    domToneArpTickCount = 0;
    saveDomToneTempoPref();
  }

  function setDomToneDetune(next) {
    domToneDetuneCents = Math.max(-100, Math.min(100, next));
    saveDomToneDetunePref();
  }

  function setDomToneRandomness(next) {
    domToneRandomness = Math.max(0, Math.min(100, next));
    saveDomToneRandomnessPref();
  }

  function setDomTonePattern(next) {
    if (next !== "arpeggio" && next !== "random_walk" && next !== "drone_pulse") return;
    domTonePattern = next;
    domToneWalkIndex = null;
    saveDomTonePatternPref();
  }

  // ---- Edge texture tone ----
  // A third sonification channel: rather than colour, tracks structural
  // complexity -- how much the scene's low-res luminance grid (the same
  // one used above for the dominant colour tone and, gated separately, for
  // particle scene-attraction) varies from cell to cell. A flat wall reads
  // near-silent; a busy, edge-rich scene reads as a rougher, brighter
  // filtered-noise texture. Own AudioContext, same output-only shape as
  // the other two.
  let edgeToneEnabled = (() => {
    try { return localStorage.getItem(EDGE_TONE_ENABLED_KEY) === "1"; } catch (e) { return false; }
  })();
  let edgeToneVolume = loadOutlineNumberPref(EDGE_TONE_VOLUME_KEY, EDGE_TONE_DEFAULT_VOLUME);
  let edgeToneStyle = (() => {
    try { return localStorage.getItem(EDGE_TONE_STYLE_KEY) === "melodic" ? "melodic" : "continuous"; } catch (e) { return "continuous"; }
  })();
  let edgeToneOutput = (() => {
    try {
      const raw = localStorage.getItem(EDGE_TONE_OUTPUT_KEY);
      return raw === "midi" || raw === "instrument" ? raw : "synth";
    } catch (e) { return "synth"; }
  })();
  let edgeToneInstrument = (() => {
    try {
      const raw = localStorage.getItem(EDGE_TONE_INSTRUMENT_KEY);
      return GM_ALL_INSTRUMENTS.some((i) => i.folder === raw) ? raw : "woodblock";
    } catch (e) { return "woodblock"; }
  })();
  // Edge texture's scale: chime uses a major-pentatonic scale rooted at
  // C4, dominant tone the same shape rooted a tritone away at F#3
  // (guaranteed zero pitch-class overlap with chime -- two 5-note scales
  // fit that trick exactly). A THIRD 5-note scale can't also avoid both --
  // 3x5=15 note-slots don't fit into 12 pitch classes, so a third
  // pentatonic scale is mathematically guaranteed to reuse at least 3 of
  // the 10 classes chime+dominant tone already claim. Rather than force a
  // weak, barely-distinct pentatonic in the 2 leftover classes, edge
  // texture uses a different scale SHAPE entirely -- a whole-tone scale
  // (six equal whole-step degrees), which has a genuinely different,
  // ambiguous/floaty character next to the other two's "happy" pentatonic
  // sound -- and a different, lower register (D3), so it reads as its own
  // distinct voice even where a pitch class does coincide.
  const EDGE_TONE_WHOLE_TONE_DEGREES = [0, 2, 4, 6, 8, 10];
  const EDGE_TONE_ROOT_HZ = 146.83; // D3
  function buildWholeToneScaleHz(rootHz, rangeOctaves) {
    const semis = [];
    for (let oct = 0; oct < rangeOctaves; oct++) {
      for (const d of EDGE_TONE_WHOLE_TONE_DEGREES) semis.push(d + oct * 12);
    }
    semis.push(rangeOctaves * 12); // top root, completing the span
    return semis.map((st) => rootHz * Math.pow(2, st / 12));
  }
  let edgeTonePitchRangeOctaves = loadOutlineNumberPref(EDGE_TONE_PITCH_RANGE_KEY, EDGE_TONE_DEFAULT_PITCH_RANGE_OCTAVES);
  let EDGE_TONE_SCALE_HZ = buildWholeToneScaleHz(EDGE_TONE_ROOT_HZ, edgeTonePitchRangeOctaves);
  let edgeToneAudioCtx = null;
  let edgeToneNoiseSrc = null;
  let edgeToneFilter = null;
  let edgeToneGainNode = null;
  let edgeToneTimerId = null;
  // Rhythmic mode's groove: a steady 16th-note step clock -- a fixed
  // tempo is what makes this read as an actual pulse to lock onto, rather
  // than a click that just speeds up and slows down with density. What
  // density actually changes is the PATTERN: how many of those 16 steps
  // get struck (between Range's min/max), spread out via a Euclidean
  // rhythm (see euclideanHitPattern below) -- a busier/edgier scene
  // produces a busier, more syncopated pattern, not the same single beat
  // sped up. Tempo (BPM) is independent of the shared 150ms density-
  // sampling tick -- edgeToneStepElapsedMs accumulates real elapsed time
  // and the step only actually advances once a full 16th-note's worth
  // has passed, so changing tempo doesn't change how often density itself
  // gets resampled.
  const EDGE_TONE_STEPS = 16;
  let edgeToneStepIndex = 0;
  let edgeToneStepElapsedMs = 0;
  let edgeToneMinHits = loadOutlineNumberPref(EDGE_TONE_MIN_HITS_KEY, EDGE_TONE_DEFAULT_MIN_HITS);
  let edgeToneMaxHits = loadOutlineNumberPref(EDGE_TONE_MAX_HITS_KEY, EDGE_TONE_DEFAULT_MAX_HITS);
  let edgeToneTempoBpm = loadOutlineNumberPref(EDGE_TONE_TEMPO_KEY, EDGE_TONE_DEFAULT_TEMPO_BPM);
  // Detune/Randomness for the fixed MIDI/Instrument note (the synth branch's
  // noise burst has no real "pitch" of its own, but its bandpass centre
  // frequency stands in for one -- see playEdgeTexTick). Bars: how many
  // 16-step bars the rhythm cycles through before repeating exactly --
  // edgeToneBarIndex tracks which bar of that cycle is currently playing,
  // incrementing every time the step index wraps back to 0 (see
  // updateEdgeTexture's rotation).
  let edgeToneDetuneCents = loadOutlineNumberPref(EDGE_TONE_DETUNE_KEY, 0);
  let edgeToneRandomness = loadOutlineNumberPref(EDGE_TONE_RANDOMNESS_KEY, 0);
  let edgeToneBars = loadOutlineNumberPref(EDGE_TONE_BARS_KEY, EDGE_TONE_DEFAULT_BARS);
  let edgeToneBarIndex = 0;
  // Pattern (Melodic only): which generator actually decides hit placement/
  // timing (Steady pulse, Swing) -- see the big comment above
  // CHIME_PATTERN_KEY. Euclidean/Steady pulse/Swing are all rhythm-only:
  // every one of them still picks pitch the same fixed way (density maps
  // straight onto a scale position, see updateEdgeTexture). Random walk is
  // the odd one out -- a genuine note-choice pattern like chime's/dominant
  // tone's own Random walk, wandering EDGE_TONE_SCALE_HZ instead of jumping
  // straight to the density-picked note, reusing Euclidean's hit placement
  // (like Swing already does) since it only changes pitch, not rhythm.
  let edgeToneWalkIndex = null;
  let edgeTonePattern = (() => {
    try {
      const raw = localStorage.getItem(EDGE_TONE_PATTERN_KEY);
      return raw === "steady_pulse" || raw === "swing" || raw === "random_walk" ? raw : "euclidean";
    } catch (e) { return "euclidean"; }
  })();

  // The standard "bucket"/error-diffusion method for spreading N hits as
  // evenly as possible across `steps` slots -- musically equivalent to a
  // true Euclidean rhythm (Bjorklund's algorithm) for this purpose, and
  // the same technique real step-sequencer hardware and software use to
  // turn a plain hit-count into an actual rhythmic pattern rather than a
  // run of consecutive hits.
  function euclideanHitPattern(hits, steps) {
    const pattern = new Array(steps).fill(false);
    if (hits <= 0) return pattern;
    if (hits >= steps) return pattern.fill(true);
    let bucket = 0;
    for (let i = 0; i < steps; i++) {
      bucket += hits;
      if (bucket >= steps) {
        bucket -= steps;
        pattern[i] = true;
      }
    }
    return pattern;
  }

  // Steady pulse: rather than a syncopated Euclidean spread, hits fall on a
  // perfectly even subdivision of the bar (the classic "four on the floor"
  // feel at subdivision=4) -- `hits` still picks how busy it is, just
  // rounded to the nearest power-of-two subdivision that actually divides
  // the bar evenly, instead of picking WHERE among 16 steps those hits go.
  function steadyPulsePattern(hits, steps) {
    const divisors = [1, 2, 4, 8, 16].filter((d) => d <= steps);
    let subdivision = divisors[0];
    for (const d of divisors) {
      if (Math.abs(d - hits) < Math.abs(subdivision - hits)) subdivision = d;
    }
    const pattern = new Array(steps).fill(false);
    const stepSize = steps / subdivision;
    for (let i = 0; i < steps; i += stepSize) pattern[Math.round(i)] = true;
    return pattern;
  }

  function sampleEdgeDensity() {
    if (!gl || !stage.width || !stage.height) return null;
    sceneSampleCtx.drawImage(stage, 0, 0, SCENE_GRID_W, SCENE_GRID_H);
    const data = sceneSampleCtx.getImageData(0, 0, SCENE_GRID_W, SCENE_GRID_H).data;
    const cellCount = SCENE_GRID_W * SCENE_GRID_H;
    const lums = new Float32Array(cellCount);
    for (let idx = 0; idx < cellCount; idx++) {
      const i = idx * 4;
      lums[idx] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    let gradSum = 0, gradCount = 0;
    for (let y = 0; y < SCENE_GRID_H; y++) {
      for (let x = 0; x < SCENE_GRID_W; x++) {
        const idx = y * SCENE_GRID_W + x;
        if (x < SCENE_GRID_W - 1) { gradSum += Math.abs(lums[idx + 1] - lums[idx]); gradCount++; }
        if (y < SCENE_GRID_H - 1) { gradSum += Math.abs(lums[idx + SCENE_GRID_W] - lums[idx]); gradCount++; }
      }
    }
    // Normalized so a checkerboard-strength grid (adjacent cells alternating
    // black/white) reads as ~1 -- a coarse but cheap edge-density estimate,
    // not a real Sobel pass (that runs per-pixel in the outline shader,
    // GPU-side, not readable back here without an extra readback pass).
    return Math.min(1, gradSum / gradCount / 180);
  }

  function ensureEdgeToneAudio() {
    if (edgeToneAudioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    edgeToneAudioCtx = new Ctx();
    const noiseDurationS = 2;
    const buffer = edgeToneAudioCtx.createBuffer(1, edgeToneAudioCtx.sampleRate * noiseDurationS, edgeToneAudioCtx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    edgeToneNoiseSrc = edgeToneAudioCtx.createBufferSource();
    edgeToneNoiseSrc.buffer = buffer;
    edgeToneNoiseSrc.loop = true;
    edgeToneFilter = edgeToneAudioCtx.createBiquadFilter();
    edgeToneFilter.type = "lowpass";
    edgeToneFilter.frequency.value = 200;
    edgeToneGainNode = edgeToneAudioCtx.createGain();
    edgeToneGainNode.gain.value = 0;
    edgeToneNoiseSrc.connect(edgeToneFilter);
    edgeToneFilter.connect(edgeToneGainNode);
    edgeToneGainNode.connect(edgeToneAudioCtx.destination);
    edgeToneNoiseSrc.start();
  }

  // Rhythmic mode's single percussive hit -- a short one-shot filtered noise
  // burst (its own buffer source + bandpass filter + gain, discarded after).
  // freq is the real pitch picked from EDGE_TONE_SCALE_HZ by density (see
  // updateEdgeTexture) -- MIDI/Instrument now strike an actual note instead
  // of a single fixed one, and the synth branch's bandpass centre frequency
  // is built from that same pitch (scaled by density for brightness) so
  // Pitch range audibly widens/narrows the synth's own texture too, not
  // just the MIDI/Instrument outputs.
  function playEdgeTexTick(density, freq) {
    const totalCents = edgeToneDetuneCents + randomCentsJitter(edgeToneRandomness, EDGE_TONE_RANDOMNESS_MAX_CENTS);
    // Loudness curve: sampleEdgeDensity is calibrated so a checkerboard-
    // strength grid reads as ~1, which real footage rarely approaches --
    // a plain linear multiply by density caps this channel's practical
    // loudness far below chime's (whose driving "closeness" signal reaches
    // 1.0 in ordinary use) even at Volume 100%. A sqrt curve keeps 0 silent
    // and 1 at the same peak as a linear mapping would, but lifts the
    // realistic middle of density's actual range so Volume has real room
    // to be heard -- used for loudness only; the brightness scaling below
    // still uses the raw, uncurved density.
    const loudness = Math.sqrt(Math.max(0, Math.min(1, density)));
    if (edgeToneOutput === "midi") {
      const inst = GM_ALL_INSTRUMENTS.find((i) => i.folder === edgeToneInstrument) || GM_ALL_INSTRUMENTS.find((i) => i.folder === "woodblock");
      playMidiNote(EDGE_TONE_MIDI_CHANNEL, inst.program, hzToMidiNote(freq), loudness, 150, totalCents);
      return;
    }
    if (edgeToneOutput === "instrument") {
      playInstrumentNote(edgeToneInstrument, hzToMidiNote(freq), loudness * (edgeToneVolume / 100), 0.3, totalCents);
      return;
    }
    const now = edgeToneAudioCtx.currentTime;
    const dur = 0.12;
    const buffer = edgeToneAudioCtx.createBuffer(1, Math.max(1, Math.round(edgeToneAudioCtx.sampleRate * dur)), edgeToneAudioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = edgeToneAudioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = edgeToneAudioCtx.createBiquadFilter();
    filter.type = "bandpass";
    // The synth branch's noise burst has no fixed pitch of its own, so its
    // bandpass centre frequency stands in for "pitch" here -- built from the
    // same picked note (freq) that MIDI/Instrument would actually play,
    // scaled up by density for extra brightness on busier hits, then the
    // same Detune/Randomness cents shift that would otherwise bend a note.
    filter.frequency.value = (freq * (1 + density * 3)) * centsToRateFactor(totalCents);
    filter.Q.value = 0.7;
    const gain = edgeToneAudioCtx.createGain();
    const peak = Math.max(0.001, (edgeToneVolume / 100) * loudness * SONIFICATION_ONESHOT_PEAK);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(edgeToneAudioCtx.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  function updateEdgeTexture() {
    if (!edgeToneAudioCtx) return;
    const density = sampleEdgeDensity();
    if (edgeToneStyle === "continuous") {
      const now = edgeToneAudioCtx.currentTime;
      if (density == null) {
        edgeToneGainNode.gain.setTargetAtTime(0, now, 0.15);
        return;
      }
      // Same loudness curve as the rhythmic hit above (see playEdgeTexTick)
      // -- density's realistic range rarely nears 1, so a plain linear
      // multiply would cap this well below what Volume 100% implies.
      // targetFreq (brightness) keeps using raw, uncurved density.
      const targetGain = (edgeToneVolume / 100) * Math.sqrt(Math.max(0, Math.min(1, density))) * SONIFICATION_CONTINUOUS_PEAK;
      const targetFreq = 200 + density * 3000;
      edgeToneGainNode.gain.setTargetAtTime(targetGain, now, 0.25);
      edgeToneFilter.frequency.setTargetAtTime(targetFreq, now, 0.25);
      return;
    }
    // Rhythmic: density is resampled every call regardless (its own thing,
    // unrelated to tempo), but the step clock only actually advances once
    // enough real time has passed for one 16th note at the current Tempo
    // -- so Tempo changes playback speed without changing how often
    // density itself gets resampled. A real drum machine's clock keeps
    // running through quiet passages too.
    edgeToneStepElapsedMs += 150;
    const baseMsPerStep = 60000 / edgeToneTempoBpm / 4;
    // Swing: alternates long/short hold times for even/odd steps (a classic
    // ~2:1 ratio) instead of a straight grid -- the two durations average
    // back to the same overall tempo across each pair of steps, so Swing
    // changes the FEEL, not the speed. Any other Pattern uses a plain, even
    // step duration -- exactly the original formula, unchanged.
    const msPerStep = edgeTonePattern === "swing"
      ? baseMsPerStep * (edgeToneStepIndex % 2 === 0 ? 1.33 : 0.67)
      : baseMsPerStep;
    if (edgeToneStepElapsedMs < msPerStep) return;
    edgeToneStepElapsedMs -= msPerStep;
    edgeToneStepIndex = (edgeToneStepIndex + 1) % EDGE_TONE_STEPS;
    // Bars: every time the step index wraps back to a new bar, advance
    // which bar of the loop is currently playing (see the rotation below).
    if (edgeToneStepIndex === 0) edgeToneBarIndex = (edgeToneBarIndex + 1) % edgeToneBars;
    // Gated at a low floor, not the continuous mode's own perceptual scale
    // -- a genuinely flat wall reads as ~0 density and stays silent, but
    // this shouldn't cut off well before that the way a higher floor would.
    if (density == null || density < 0.008) return;
    // Range (min/max hits per bar) decides whether density can ever make
    // the pattern this sparse or this busy -- density itself decides where
    // in between that range the current bar's pattern actually sits.
    const hits = Math.max(edgeToneMinHits, Math.min(edgeToneMaxHits, Math.round(edgeToneMinHits + density * (edgeToneMaxHits - edgeToneMinHits))));
    // Pattern picks which generator decides hit placement -- Steady pulse's
    // even subdivision instead of Euclidean's syncopated spread. Swing
    // reuses Euclidean placement (it only changes the timing above).
    const pattern = edgeTonePattern === "steady_pulse"
      ? steadyPulsePattern(hits, EDGE_TONE_STEPS)
      : euclideanHitPattern(hits, EDGE_TONE_STEPS);
    // Bars: each bar of the loop reads the same Euclidean pattern rotated
    // by a fixed offset -- rotating a Euclidean rhythm is a real, standard
    // technique that gives a genuinely different-sounding groove at the
    // same density, so a multi-bar loop actually progresses instead of
    // repeating one identical bar, cycling back to the original (offset 0)
    // after edgeToneBars bars. At the default of 1 bar, edgeToneBarIndex is
    // always 0, so patternIndex === edgeToneStepIndex -- unchanged from
    // before this control existed.
    const rotationStep = Math.round(EDGE_TONE_STEPS / edgeToneBars);
    const patternIndex = (edgeToneStepIndex + edgeToneBarIndex * rotationStep) % EDGE_TONE_STEPS;
    let hitHere = pattern[patternIndex];
    // Randomness (0 by default -- deterministic, unchanged) can flip a step
    // either way: an occasional predicted hit gets dropped, or a rest
    // becomes a quiet extra hit -- capped well under 100% so the
    // underlying Euclidean shape still comes through even at max
    // Randomness, rather than randomizing the pattern beyond recognition.
    if (edgeToneRandomness > 0 && Math.random() * 100 < edgeToneRandomness * 0.3) hitHere = !hitHere;
    if (!hitHere) return;
    const accent = edgeToneStepIndex % 4 === 0 ? 1 : 0.7;
    // Pitch: the same density driving how busy the pattern is also picks
    // where in the scale this hit lands -- denser/edgier moments read as
    // higher-pitched hits, calmer ones lower, the same "one real signal
    // drives both rhythm and pitch" idea chime/dominant tone already use
    // (closeness and hue), just fed by edge texture's own natural signal.
    const pitchIndex = Math.min(EDGE_TONE_SCALE_HZ.length - 1, Math.floor(density * EDGE_TONE_SCALE_HZ.length));
    let playedPitchIndex = pitchIndex;
    if (edgeTonePattern === "random_walk") {
      // Wanders the scale one step at a time instead of jumping straight to
      // the density-picked note -- biased back toward that note (so it
      // still tracks density over time), with Randomness loosening the
      // bias -- identical shape to chime's/dominant tone's own Random walk.
      if (edgeToneWalkIndex == null) edgeToneWalkIndex = pitchIndex;
      const towardBias = 0.9 - (edgeToneRandomness / 100) * 0.6;
      let step;
      if (Math.random() < towardBias) {
        step = edgeToneWalkIndex < pitchIndex ? 1 : edgeToneWalkIndex > pitchIndex ? -1 : (Math.random() < 0.5 ? -1 : 1);
      } else {
        step = Math.random() < 0.5 ? -1 : 1;
      }
      edgeToneWalkIndex = Math.max(0, Math.min(EDGE_TONE_SCALE_HZ.length - 1, edgeToneWalkIndex + step));
      playedPitchIndex = edgeToneWalkIndex;
    }
    playEdgeTexTick(density * accent, EDGE_TONE_SCALE_HZ[playedPitchIndex]);
  }

  function updateEdgeToneSamplingTimer() {
    if (edgeToneEnabled && !edgeToneTimerId) {
      ensureEdgeToneAudio();
      if (edgeToneAudioCtx && edgeToneAudioCtx.state === "suspended") edgeToneAudioCtx.resume().catch(() => {});
      edgeToneTimerId = setInterval(updateEdgeTexture, 150);
    } else if (!edgeToneEnabled && edgeToneTimerId) {
      clearInterval(edgeToneTimerId);
      edgeToneTimerId = null;
      edgeToneStepIndex = 0;
      edgeToneStepElapsedMs = 0;
      edgeToneBarIndex = 0;
      edgeToneWalkIndex = null;
      if (edgeToneGainNode) edgeToneGainNode.gain.setTargetAtTime(0, edgeToneAudioCtx.currentTime, 0.1);
    }
  }

  function saveEdgeToneEnabledPref() {
    try { localStorage.setItem(EDGE_TONE_ENABLED_KEY, edgeToneEnabled ? "1" : "0"); } catch (e) {}
  }
  function saveEdgeToneVolumePref() {
    try { localStorage.setItem(EDGE_TONE_VOLUME_KEY, String(edgeToneVolume)); } catch (e) {}
  }
  function saveEdgeToneStylePref() {
    try { localStorage.setItem(EDGE_TONE_STYLE_KEY, edgeToneStyle); } catch (e) {}
  }
  function saveEdgeToneOutputPref() {
    try { localStorage.setItem(EDGE_TONE_OUTPUT_KEY, edgeToneOutput); } catch (e) {}
  }
  function saveEdgeToneInstrumentPref() {
    try { localStorage.setItem(EDGE_TONE_INSTRUMENT_KEY, edgeToneInstrument); } catch (e) {}
  }
  function saveEdgeToneMinHitsPref() {
    try { localStorage.setItem(EDGE_TONE_MIN_HITS_KEY, String(edgeToneMinHits)); } catch (e) {}
  }
  function saveEdgeToneMaxHitsPref() {
    try { localStorage.setItem(EDGE_TONE_MAX_HITS_KEY, String(edgeToneMaxHits)); } catch (e) {}
  }
  function saveEdgeToneTempoPref() {
    try { localStorage.setItem(EDGE_TONE_TEMPO_KEY, String(edgeToneTempoBpm)); } catch (e) {}
  }
  function saveEdgeToneDetunePref() {
    try { localStorage.setItem(EDGE_TONE_DETUNE_KEY, String(edgeToneDetuneCents)); } catch (e) {}
  }
  function saveEdgeToneRandomnessPref() {
    try { localStorage.setItem(EDGE_TONE_RANDOMNESS_KEY, String(edgeToneRandomness)); } catch (e) {}
  }
  function saveEdgeToneBarsPref() {
    try { localStorage.setItem(EDGE_TONE_BARS_KEY, String(edgeToneBars)); } catch (e) {}
  }
  function saveEdgeTonePatternPref() {
    try { localStorage.setItem(EDGE_TONE_PATTERN_KEY, edgeTonePattern); } catch (e) {}
  }
  function saveEdgeTonePitchRangePref() {
    try { localStorage.setItem(EDGE_TONE_PITCH_RANGE_KEY, String(edgeTonePitchRangeOctaves)); } catch (e) {}
  }

  function updateEdgeToneOutputControlsVisibility() {
    const show = edgeToneEnabled && edgeToneStyle === "melodic";
    edgeToneOutputWrap.classList.toggle("hide", !show);
    edgeToneInstrumentWrap.classList.toggle("hide", !show || edgeToneOutput === "synth");
    edgeTonePitchRangeWrap.classList.toggle("hide", !show);
    edgeToneMinHitsWrap.classList.toggle("hide", !show);
    edgeToneMaxHitsWrap.classList.toggle("hide", !show);
    edgeToneTempoWrap.classList.toggle("hide", !show);
    edgeToneDetuneWrap.classList.toggle("hide", !show);
    edgeToneRandomnessWrap.classList.toggle("hide", !show);
    edgeToneBarsWrap.classList.toggle("hide", !show);
    edgeTonePatternWrap.classList.toggle("hide", !show);
  }

  function setEdgeToneEnabled(next) {
    if (next === edgeToneEnabled) return;
    edgeToneEnabled = next;
    edgeToneBtn.textContent = `Edge texture tone: ${edgeToneEnabled ? "On" : "Off"}`;
    edgeToneBtn.setAttribute("aria-pressed", String(edgeToneEnabled));
    edgeToneVolumeWrap.classList.toggle("hide", !edgeToneEnabled);
    edgeToneStyleWrap.classList.toggle("hide", !edgeToneEnabled);
    updateEdgeToneOutputControlsVisibility();
    saveEdgeToneEnabledPref();
    updateEdgeToneSamplingTimer();
  }

  function setEdgeToneStyle(next) {
    if (next !== "continuous" && next !== "melodic") return;
    edgeToneStyle = next;
    if (edgeToneStyle === "melodic" && edgeToneGainNode && edgeToneAudioCtx) {
      edgeToneGainNode.gain.setTargetAtTime(0, edgeToneAudioCtx.currentTime, 0.1);
    }
    edgeToneStepIndex = 0;
    edgeToneStepElapsedMs = 0;
    edgeToneBarIndex = 0;
    updateEdgeToneOutputControlsVisibility();
    saveEdgeToneStylePref();
  }

  function setEdgeToneOutput(next) {
    if (next !== "synth" && next !== "midi" && next !== "instrument") return;
    edgeToneOutput = next;
    updateEdgeToneOutputControlsVisibility();
    if (edgeToneOutput === "midi") ensureMidiAccess();
    saveEdgeToneOutputPref();
  }

  function setEdgeToneInstrument(next) {
    if (!GM_ALL_INSTRUMENTS.some((i) => i.folder === next)) return;
    edgeToneInstrument = next;
    saveEdgeToneInstrumentPref();
  }

  function setEdgeToneMinHits(next) {
    edgeToneMinHits = Math.max(1, Math.min(edgeToneMaxHits, Math.round(next)));
    saveEdgeToneMinHitsPref();
  }

  function setEdgeToneMaxHits(next) {
    edgeToneMaxHits = Math.max(edgeToneMinHits, Math.min(EDGE_TONE_STEPS, Math.round(next)));
    saveEdgeToneMaxHitsPref();
  }

  function setEdgeToneTempo(next) {
    edgeToneTempoBpm = Math.max(60, Math.min(200, Math.round(next)));
    saveEdgeToneTempoPref();
  }

  function setEdgeToneDetune(next) {
    edgeToneDetuneCents = Math.max(-100, Math.min(100, next));
    saveEdgeToneDetunePref();
  }

  function setEdgeToneRandomness(next) {
    edgeToneRandomness = Math.max(0, Math.min(100, next));
    saveEdgeToneRandomnessPref();
  }

  function setEdgeToneBars(next) {
    edgeToneBars = Math.max(1, Math.min(4, Math.round(next)));
    edgeToneBarIndex = 0;
    saveEdgeToneBarsPref();
  }

  function setEdgeTonePitchRange(next) {
    edgeTonePitchRangeOctaves = Math.max(1, Math.min(3, Math.round(next)));
    EDGE_TONE_SCALE_HZ = buildWholeToneScaleHz(EDGE_TONE_ROOT_HZ, edgeTonePitchRangeOctaves);
    saveEdgeTonePitchRangePref();
  }

  function setEdgeTonePattern(next) {
    if (next !== "euclidean" && next !== "steady_pulse" && next !== "swing" && next !== "random_walk") return;
    edgeTonePattern = next;
    edgeToneStepIndex = 0;
    edgeToneStepElapsedMs = 0;
    edgeToneBarIndex = 0;
    edgeToneWalkIndex = null;
    saveEdgeTonePatternPref();
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
  }

  function openTuneForNewPoint(sourceColor, returnFocusEl = calibrateBtn) {
    hideOverlayPanels();
    editingPointId = null;
    frozenColor = sourceColor;
    hueSlider.value = 0; satSlider.value = 0; lightSlider.value = 0;
    contrastSlider.value = 0; exposureSlider.value = 0;
    labelInput.value = "";
    deletePointBtn.classList.add("hide");
    refreshTunePreview();
    tuneReturnFocusEl = returnFocusEl;
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
      outlinesEnabled,
      outlineThickness,
      outlineBlend,
      outlineOpacity,
      outlineColor,
      // audioTintEnabled/beatFlashEnabled ARE captured — loading a template
      // is an explicit user action (clicking Load), so restoring them tries
      // the same silent-resume path already used for a page reload (works
      // if mic/camera permission is already granted; otherwise it prompts,
      // same as clicking the button by hand would).
      particlesEnabled,
      particleOpacity,
      particleOrbitPath,
      particleSeekBrightness,
      particleColourAttract,
      particleMoveAttract,
      particleTrail,
      particleCount,
      particleSizeScale,
      chimeEnabled,
      chimeVolume,
      chimeSource,
      chimeOutput,
      chimeInstrument,
      chimeRange,
      chimeTempo: chimeTempoMs,
      chimeDetune: chimeDetuneCents,
      chimeRandomness,
      chimePattern,
      domToneEnabled,
      domToneVolume,
      domToneStyle,
      domToneScientificPitchEnabled,
      domToneOutput,
      domToneInstrument,
      domToneRange: domToneRangeOctaves,
      domToneTempo: domToneTempoMs,
      domToneDetune: domToneDetuneCents,
      domToneRandomness,
      domTonePattern,
      edgeToneEnabled,
      edgeToneVolume,
      edgeToneStyle,
      edgeToneOutput,
      edgeToneInstrument,
      edgeTonePitchRange: edgeTonePitchRangeOctaves,
      edgeToneMinHits,
      edgeToneMaxHits,
      edgeToneTempo: edgeToneTempoBpm,
      edgeToneDetune: edgeToneDetuneCents,
      edgeToneRandomness,
      edgeToneBars,
      edgeTonePattern,
      audioReactEnabled,
      audioReactStrength,
      audioTintEnabled,
      audioTintStrength,
      audioTintSatStrength,
      audioTintLightStrength,
      audioTintSmoothing,
      audioTintFftSize,
      audioTintUpdateMs,
      scientificColourEnabled,
      audioTintExtraBandsVisible,
      ...audioTintBandsSnapshot(),
      beatFlashEnabled,
      beatSensitivity,
      beatFlashSpeed,
      beatDimFlickerEnabled,
      beatTorchInverted,
      beatScreenFlashEnabled,
      beatVibrateEnabled,
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
      scientificColourEnabled: false,
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
    if (Number.isFinite(s.particleOpacity)) {
      particleOpacity = s.particleOpacity;
      particleOpacitySlider.value = String(particleOpacity);
      particleOpacityLabel.textContent = `${particleOpacitySlider.value}%`;
      saveParticleOpacityPref();
    }
    // New-format templates carry the 4 independent toggles directly;
    // older templates (saved before this became checkboxes) carry the
    // single legacy particleBehavior string instead -- map that the same
    // way the one-time localStorage migration does, so an old template
    // still loads with the same effective behavior it had when saved.
    if (typeof s.particleOrbitPath === "boolean" || typeof s.particleSeekBrightness === "boolean" ||
      typeof s.particleColourAttract === "boolean" || typeof s.particleMoveAttract === "boolean") {
      if (typeof s.particleOrbitPath === "boolean") particleOrbitPath = s.particleOrbitPath;
      if (typeof s.particleSeekBrightness === "boolean") particleSeekBrightness = s.particleSeekBrightness;
      if (typeof s.particleColourAttract === "boolean") particleColourAttract = s.particleColourAttract;
      if (typeof s.particleMoveAttract === "boolean") particleMoveAttract = s.particleMoveAttract;
    } else if (s.particleBehavior === "orbit" || s.particleBehavior === "intelligent") {
      const legacyIntelligent = s.particleBehavior === "intelligent";
      particleOrbitPath = !legacyIntelligent;
      particleSeekBrightness = legacyIntelligent;
      particleColourAttract = legacyIntelligent;
      particleMoveAttract = legacyIntelligent;
    }
    if (typeof s.particleOrbitPath === "boolean" || typeof s.particleSeekBrightness === "boolean" ||
      typeof s.particleColourAttract === "boolean" || typeof s.particleMoveAttract === "boolean" ||
      s.particleBehavior === "orbit" || s.particleBehavior === "intelligent") {
      particleOrbitPathCheckbox.checked = particleOrbitPath;
      particleSeekBrightnessCheckbox.checked = particleSeekBrightness;
      particleColourAttractCheckbox.checked = particleColourAttract;
      particleMoveAttractCheckbox.checked = particleMoveAttract;
      saveParticleOrbitPathPref();
      saveParticleSeekBrightnessPref();
      saveParticleColourAttractPref();
      saveParticleMoveAttractPref();
      updateSceneSamplingTimer();
    }
    if (Number.isFinite(s.particleTrail)) {
      particleTrail = Math.max(0, Math.min(100, s.particleTrail));
      particleTrailSlider.value = String(particleTrail);
      particleTrailLabel.textContent = `${particleTrail}%`;
      saveParticleTrailPref();
    }
    if (Number.isFinite(s.particleCount)) {
      // Set directly, not via setParticleCount() (which re-seeds on the
      // spot) -- particles get seeded once anyway when the "restored
      // last" on/off block below decides whether to turn them on.
      particleCount = Math.max(5, Math.min(100, Math.round(s.particleCount)));
      particleCountSlider.value = String(particleCount);
      particleCountLabel.textContent = String(particleCount);
      saveParticleCountPref();
    }
    if (Number.isFinite(s.particleSizeScale)) {
      particleSizeScale = Math.max(20, Math.min(300, s.particleSizeScale));
      particleSizeSlider.value = String(particleSizeScale);
      particleSizeLabel.textContent = `${particleSizeScale}%`;
      saveParticleSizePref();
    }
    if (typeof s.chimeEnabled === "boolean" && s.chimeEnabled !== chimeEnabled) {
      setChimeEnabled(s.chimeEnabled);
    }
    if (Number.isFinite(s.chimeVolume)) {
      chimeVolume = Math.max(0, Math.min(100, s.chimeVolume));
      chimeVolumeSlider.value = String(chimeVolume);
      chimeVolumeLabel.textContent = `${chimeVolume}%`;
      saveChimeVolumePref();
    }
    if (s.chimeOutput === "synth" || s.chimeOutput === "midi" || s.chimeOutput === "instrument") {
      setChimeOutput(s.chimeOutput);
      chimeOutputSelect.value = chimeOutput;
    }
    if (typeof s.chimeInstrument === "string" && GM_ALL_INSTRUMENTS.some((i) => i.folder === s.chimeInstrument)) {
      setChimeInstrument(s.chimeInstrument);
      chimeInstrumentSelect.value = chimeInstrument;
    }
    if (s.chimeSource === "saved" || s.chimeSource === "live") {
      setChimeSource(s.chimeSource);
      chimeSourceSelect.value = chimeSource;
    }
    if (Number.isFinite(s.chimeRange)) {
      setChimeRange(s.chimeRange);
      chimeRangeSlider.value = String(chimeRange);
      chimeRangeLabel.textContent = String(chimeRange);
    }
    if (Number.isFinite(s.chimeTempo)) {
      setChimeTempo(s.chimeTempo);
      chimeTempoSlider.value = String(chimeTempoMs);
      chimeTempoLabel.textContent = `${chimeTempoMs}ms`;
    }
    if (Number.isFinite(s.chimeDetune)) {
      setChimeDetune(s.chimeDetune);
      chimeDetuneSlider.value = String(chimeDetuneCents);
      chimeDetuneLabel.textContent = `${chimeDetuneCents}c`;
    }
    if (Number.isFinite(s.chimeRandomness)) {
      setChimeRandomness(s.chimeRandomness);
      chimeRandomnessSlider.value = String(chimeRandomness);
      chimeRandomnessLabel.textContent = `${chimeRandomness}%`;
    }
    if (s.chimePattern === "proximity" || s.chimePattern === "random_walk" || s.chimePattern === "chord_cluster") {
      setChimePattern(s.chimePattern);
      chimePatternSelect.value = chimePattern;
    }
    if (typeof s.domToneEnabled === "boolean" && s.domToneEnabled !== domToneEnabled) {
      setDomToneEnabled(s.domToneEnabled);
    }
    if (Number.isFinite(s.domToneVolume)) {
      domToneVolume = Math.max(0, Math.min(100, s.domToneVolume));
      domToneVolumeSlider.value = String(domToneVolume);
      domToneVolumeLabel.textContent = `${domToneVolume}%`;
      saveDomToneVolumePref();
    }
    if (s.domToneStyle === "continuous" || s.domToneStyle === "melodic") {
      setDomToneStyle(s.domToneStyle);
      domToneStyleSelect.value = domToneStyle;
    }
    if (typeof s.domToneScientificPitchEnabled === "boolean") {
      domToneScientificPitchEnabled = s.domToneScientificPitchEnabled;
      domToneScientificPitchCheckbox.checked = domToneScientificPitchEnabled;
      saveDomToneScientificPitchPref();
    }
    if (s.domToneOutput === "synth" || s.domToneOutput === "midi" || s.domToneOutput === "instrument") {
      setDomToneOutput(s.domToneOutput);
      domToneOutputSelect.value = domToneOutput;
    }
    if (typeof s.domToneInstrument === "string" && GM_ALL_INSTRUMENTS.some((i) => i.folder === s.domToneInstrument)) {
      setDomToneInstrument(s.domToneInstrument);
      domToneInstrumentSelect.value = domToneInstrument;
    }
    if (Number.isFinite(s.domToneRange)) {
      setDomToneRange(s.domToneRange);
      domToneRangeSlider.value = String(domToneRangeOctaves);
      domToneRangeLabel.textContent = String(domToneRangeOctaves);
    }
    if (Number.isFinite(s.domToneTempo)) {
      setDomToneTempo(s.domToneTempo);
      domToneTempoSlider.value = String(domToneTempoMs);
      domToneTempoLabel.textContent = `${domToneTempoMs}ms`;
    }
    if (Number.isFinite(s.domToneDetune)) {
      setDomToneDetune(s.domToneDetune);
      domToneDetuneSlider.value = String(domToneDetuneCents);
      domToneDetuneLabel.textContent = `${domToneDetuneCents}c`;
    }
    if (Number.isFinite(s.domToneRandomness)) {
      setDomToneRandomness(s.domToneRandomness);
      domToneRandomnessSlider.value = String(domToneRandomness);
      domToneRandomnessLabel.textContent = `${domToneRandomness}%`;
    }
    if (s.domTonePattern === "arpeggio" || s.domTonePattern === "random_walk" || s.domTonePattern === "drone_pulse") {
      setDomTonePattern(s.domTonePattern);
      domTonePatternSelect.value = domTonePattern;
    }
    if (typeof s.edgeToneEnabled === "boolean" && s.edgeToneEnabled !== edgeToneEnabled) {
      setEdgeToneEnabled(s.edgeToneEnabled);
    }
    if (Number.isFinite(s.edgeToneVolume)) {
      edgeToneVolume = Math.max(0, Math.min(100, s.edgeToneVolume));
      edgeToneVolumeSlider.value = String(edgeToneVolume);
      edgeToneVolumeLabel.textContent = `${edgeToneVolume}%`;
      saveEdgeToneVolumePref();
    }
    if (s.edgeToneStyle === "continuous" || s.edgeToneStyle === "melodic") {
      setEdgeToneStyle(s.edgeToneStyle);
      edgeToneStyleSelect.value = edgeToneStyle;
    }
    if (s.edgeToneOutput === "synth" || s.edgeToneOutput === "midi" || s.edgeToneOutput === "instrument") {
      setEdgeToneOutput(s.edgeToneOutput);
      edgeToneOutputSelect.value = edgeToneOutput;
    }
    if (typeof s.edgeToneInstrument === "string" && GM_ALL_INSTRUMENTS.some((i) => i.folder === s.edgeToneInstrument)) {
      setEdgeToneInstrument(s.edgeToneInstrument);
      edgeToneInstrumentSelect.value = edgeToneInstrument;
    }
    if (Number.isFinite(s.edgeTonePitchRange)) {
      setEdgeTonePitchRange(s.edgeTonePitchRange);
      edgeTonePitchRangeSlider.value = String(edgeTonePitchRangeOctaves);
      edgeTonePitchRangeLabel.textContent = String(edgeTonePitchRangeOctaves);
    }
    if (Number.isFinite(s.edgeToneMinHits)) {
      setEdgeToneMinHits(s.edgeToneMinHits);
      edgeToneMinHitsSlider.value = String(edgeToneMinHits);
      edgeToneMinHitsLabel.textContent = String(edgeToneMinHits);
    }
    if (Number.isFinite(s.edgeToneMaxHits)) {
      setEdgeToneMaxHits(s.edgeToneMaxHits);
      edgeToneMaxHitsSlider.value = String(edgeToneMaxHits);
      edgeToneMaxHitsLabel.textContent = String(edgeToneMaxHits);
    }
    if (Number.isFinite(s.edgeToneTempo)) {
      setEdgeToneTempo(s.edgeToneTempo);
      edgeToneTempoSlider.value = String(edgeToneTempoBpm);
      edgeToneTempoLabel.textContent = `${edgeToneTempoBpm} BPM`;
    }
    if (Number.isFinite(s.edgeToneDetune)) {
      setEdgeToneDetune(s.edgeToneDetune);
      edgeToneDetuneSlider.value = String(edgeToneDetuneCents);
      edgeToneDetuneLabel.textContent = `${edgeToneDetuneCents}c`;
    }
    if (Number.isFinite(s.edgeToneRandomness)) {
      setEdgeToneRandomness(s.edgeToneRandomness);
      edgeToneRandomnessSlider.value = String(edgeToneRandomness);
      edgeToneRandomnessLabel.textContent = `${edgeToneRandomness}%`;
    }
    if (Number.isFinite(s.edgeToneBars)) {
      setEdgeToneBars(s.edgeToneBars);
      edgeToneBarsSlider.value = String(edgeToneBars);
      edgeToneBarsLabel.textContent = String(edgeToneBars);
    }
    if (s.edgeTonePattern === "euclidean" || s.edgeTonePattern === "steady_pulse" || s.edgeTonePattern === "swing" || s.edgeTonePattern === "random_walk") {
      setEdgeTonePattern(s.edgeTonePattern);
      edgeTonePatternSelect.value = edgeTonePattern;
    }
    if (Number.isFinite(s.audioReactStrength)) {
      audioReactStrength = Math.max(0, Math.min(100, s.audioReactStrength));
      audioReactStrengthSlider.value = String(audioReactStrength);
      audioReactStrengthLabel.textContent = `${audioReactStrength}%`;
      saveAudioReactStrengthPref();
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
    if (typeof s.scientificColourEnabled === "boolean") {
      scientificColourEnabled = s.scientificColourEnabled;
      scientificColourCheckbox.checked = scientificColourEnabled;
      saveScientificColourPref();
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
    if (typeof s.beatVibrateEnabled === "boolean") {
      beatVibrateEnabled = s.beatVibrateEnabled;
      beatVibrateCheckbox.checked = beatVibrateEnabled;
      saveBeatVibratePref();
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
    if (typeof s.audioReactEnabled === "boolean" && s.audioReactEnabled !== audioReactEnabled) {
      toggleAudioReact();
    }
    if (typeof s.beatFlashEnabled === "boolean" && s.beatFlashEnabled !== beatFlashEnabled) {
      toggleBeatFlash();
    }
    if (typeof s.particlesEnabled === "boolean" && s.particlesEnabled !== particlesEnabled) {
      toggleParticles();
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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // Programmatic a.click() still dispatches a real, bubbling click event.
    // Without this it reaches the tap-to-hide-HUD listener on document.body
    // (the anchor is outside every excluded container) and silently closes
    // the HUD right after every export download.
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

  particlesBtn.addEventListener("click", toggleParticles);
  particleOpacitySlider.addEventListener("input", () => {
    particleOpacity = parseFloat(particleOpacitySlider.value);
    particleOpacityLabel.textContent = `${particleOpacitySlider.value}%`;
    saveParticleOpacityPref();
  });
  particleOpacitySlider.value = String(particleOpacity);
  particleOpacityLabel.textContent = `${particleOpacitySlider.value}%`;
  particleOrbitPathCheckbox.addEventListener("change", () => setParticleOrbitPath(particleOrbitPathCheckbox.checked));
  particleOrbitPathCheckbox.checked = particleOrbitPath;
  particleSeekBrightnessCheckbox.addEventListener("change", () => setParticleSeekBrightness(particleSeekBrightnessCheckbox.checked));
  particleSeekBrightnessCheckbox.checked = particleSeekBrightness;
  particleColourAttractCheckbox.addEventListener("change", () => setParticleColourAttract(particleColourAttractCheckbox.checked));
  particleColourAttractCheckbox.checked = particleColourAttract;
  particleMoveAttractCheckbox.addEventListener("change", () => setParticleMoveAttract(particleMoveAttractCheckbox.checked));
  particleMoveAttractCheckbox.checked = particleMoveAttract;
  updateSceneSamplingTimer();
  particleTrailSlider.addEventListener("input", () => {
    setParticleTrail(parseFloat(particleTrailSlider.value));
    particleTrailLabel.textContent = `${particleTrailSlider.value}%`;
  });
  particleTrailSlider.value = String(particleTrail);
  particleTrailLabel.textContent = `${particleTrail}%`;
  particleCountSlider.addEventListener("input", () => {
    setParticleCount(parseFloat(particleCountSlider.value));
    particleCountLabel.textContent = particleCountSlider.value;
  });
  particleCountSlider.value = String(particleCount);
  particleCountLabel.textContent = String(particleCount);
  particleSizeSlider.addEventListener("input", () => {
    setParticleSizeScale(parseFloat(particleSizeSlider.value));
    particleSizeLabel.textContent = `${particleSizeSlider.value}%`;
  });
  particleSizeSlider.value = String(particleSizeScale);
  particleSizeLabel.textContent = `${particleSizeScale}%`;
  updateParticlesUi();

  // Shared MIDI output device picker -- populated once a MIDI output
  // actually exists (see refreshMidiOutputs); opened up-front if any
  // feature was already saved as MIDI output, so the device list is ready
  // without needing to re-select MIDI from a dropdown first.
  midiOutputSelect.addEventListener("change", () => {
    if (!midiAccess) return;
    midiOutput = midiAccess.outputs.get(midiOutputSelect.value) || null;
  });
  if (chimeOutput === "midi" || domToneOutput === "midi" || edgeToneOutput === "midi") ensureMidiAccess();

  chimeBtn.textContent = `Colour proximity chime: ${chimeEnabled ? "On" : "Off"}`;
  chimeBtn.setAttribute("aria-pressed", String(chimeEnabled));
  chimeVolumeWrap.classList.toggle("hide", !chimeEnabled);
  chimeSourceWrap.classList.toggle("hide", !chimeEnabled);
  chimeOutputWrap.classList.toggle("hide", !chimeEnabled);
  chimeInstrumentWrap.classList.toggle("hide", !chimeEnabled || chimeOutput === "synth");
  updateChimeSourceControlsVisibility();
  chimeTempoWrap.classList.toggle("hide", !chimeEnabled);
  chimeDetuneWrap.classList.toggle("hide", !chimeEnabled);
  chimeRandomnessWrap.classList.toggle("hide", !chimeEnabled);
  chimePatternWrap.classList.toggle("hide", !chimeEnabled);
  chimeBtn.addEventListener("click", () => setChimeEnabled(!chimeEnabled));
  chimeVolumeSlider.addEventListener("input", () => {
    chimeVolume = parseFloat(chimeVolumeSlider.value);
    chimeVolumeLabel.textContent = `${chimeVolumeSlider.value}%`;
    saveChimeVolumePref();
  });
  chimeVolumeSlider.value = String(chimeVolume);
  chimeVolumeLabel.textContent = `${chimeVolume}%`;
  chimeSourceSelect.addEventListener("change", () => setChimeSource(chimeSourceSelect.value));
  chimeSourceSelect.value = chimeSource;
  chimeOutputSelect.addEventListener("change", () => setChimeOutput(chimeOutputSelect.value));
  chimeOutputSelect.value = chimeOutput;
  chimeInstrumentSelect.addEventListener("change", () => setChimeInstrument(chimeInstrumentSelect.value));
  chimeInstrumentSelect.value = chimeInstrument;
  chimeRangeSlider.addEventListener("input", () => {
    setChimeRange(parseFloat(chimeRangeSlider.value));
    chimeRangeLabel.textContent = String(chimeRange);
  });
  chimeRangeSlider.value = String(chimeRange);
  chimeRangeLabel.textContent = String(chimeRange);
  chimeTempoSlider.addEventListener("input", () => {
    setChimeTempo(parseFloat(chimeTempoSlider.value));
    chimeTempoLabel.textContent = `${chimeTempoMs}ms`;
  });
  chimeTempoSlider.value = String(chimeTempoMs);
  chimeTempoLabel.textContent = `${chimeTempoMs}ms`;
  chimeDetuneSlider.addEventListener("input", () => {
    setChimeDetune(parseFloat(chimeDetuneSlider.value));
    chimeDetuneLabel.textContent = `${chimeDetuneCents}c`;
  });
  chimeDetuneSlider.value = String(chimeDetuneCents);
  chimeDetuneLabel.textContent = `${chimeDetuneCents}c`;
  chimeRandomnessSlider.addEventListener("input", () => {
    setChimeRandomness(parseFloat(chimeRandomnessSlider.value));
    chimeRandomnessLabel.textContent = `${chimeRandomness}%`;
  });
  chimeRandomnessSlider.value = String(chimeRandomness);
  chimeRandomnessLabel.textContent = `${chimeRandomness}%`;
  chimePatternSelect.addEventListener("change", () => setChimePattern(chimePatternSelect.value));
  chimePatternSelect.value = chimePattern;
  updateChimeSamplingTimer();

  domToneBtn.textContent = `Dominant colour tone: ${domToneEnabled ? "On" : "Off"}`;
  domToneBtn.setAttribute("aria-pressed", String(domToneEnabled));
  domToneVolumeWrap.classList.toggle("hide", !domToneEnabled);
  domToneStyleWrap.classList.toggle("hide", !domToneEnabled);
  updateDomToneOutputControlsVisibility();
  domToneBtn.addEventListener("click", () => setDomToneEnabled(!domToneEnabled));
  domToneVolumeSlider.addEventListener("input", () => {
    domToneVolume = parseFloat(domToneVolumeSlider.value);
    domToneVolumeLabel.textContent = `${domToneVolumeSlider.value}%`;
    saveDomToneVolumePref();
  });
  domToneVolumeSlider.value = String(domToneVolume);
  domToneVolumeLabel.textContent = `${domToneVolume}%`;
  domToneStyleSelect.addEventListener("change", () => setDomToneStyle(domToneStyleSelect.value));
  domToneStyleSelect.value = domToneStyle;
  domToneScientificPitchCheckbox.addEventListener("change", () => {
    domToneScientificPitchEnabled = domToneScientificPitchCheckbox.checked;
    saveDomToneScientificPitchPref();
  });
  domToneScientificPitchCheckbox.checked = domToneScientificPitchEnabled;
  domToneOutputSelect.addEventListener("change", () => setDomToneOutput(domToneOutputSelect.value));
  domToneOutputSelect.value = domToneOutput;
  domToneInstrumentSelect.addEventListener("change", () => setDomToneInstrument(domToneInstrumentSelect.value));
  domToneInstrumentSelect.value = domToneInstrument;
  domToneRangeSlider.addEventListener("input", () => {
    setDomToneRange(parseFloat(domToneRangeSlider.value));
    domToneRangeLabel.textContent = String(domToneRangeOctaves);
  });
  domToneRangeSlider.value = String(domToneRangeOctaves);
  domToneRangeLabel.textContent = String(domToneRangeOctaves);
  domToneTempoSlider.addEventListener("input", () => {
    setDomToneTempo(parseFloat(domToneTempoSlider.value));
    domToneTempoLabel.textContent = `${domToneTempoMs}ms`;
  });
  domToneTempoSlider.value = String(domToneTempoMs);
  domToneTempoLabel.textContent = `${domToneTempoMs}ms`;
  domToneDetuneSlider.addEventListener("input", () => {
    setDomToneDetune(parseFloat(domToneDetuneSlider.value));
    domToneDetuneLabel.textContent = `${domToneDetuneCents}c`;
  });
  domToneDetuneSlider.value = String(domToneDetuneCents);
  domToneDetuneLabel.textContent = `${domToneDetuneCents}c`;
  domToneRandomnessSlider.addEventListener("input", () => {
    setDomToneRandomness(parseFloat(domToneRandomnessSlider.value));
    domToneRandomnessLabel.textContent = `${domToneRandomness}%`;
  });
  domToneRandomnessSlider.value = String(domToneRandomness);
  domToneRandomnessLabel.textContent = `${domToneRandomness}%`;
  domTonePatternSelect.addEventListener("change", () => setDomTonePattern(domTonePatternSelect.value));
  domTonePatternSelect.value = domTonePattern;
  updateDomToneSamplingTimer();

  edgeToneBtn.textContent = `Edge texture tone: ${edgeToneEnabled ? "On" : "Off"}`;
  edgeToneBtn.setAttribute("aria-pressed", String(edgeToneEnabled));
  edgeToneVolumeWrap.classList.toggle("hide", !edgeToneEnabled);
  edgeToneStyleWrap.classList.toggle("hide", !edgeToneEnabled);
  updateEdgeToneOutputControlsVisibility();
  edgeToneBtn.addEventListener("click", () => setEdgeToneEnabled(!edgeToneEnabled));
  edgeToneVolumeSlider.addEventListener("input", () => {
    edgeToneVolume = parseFloat(edgeToneVolumeSlider.value);
    edgeToneVolumeLabel.textContent = `${edgeToneVolumeSlider.value}%`;
    saveEdgeToneVolumePref();
  });
  edgeToneVolumeSlider.value = String(edgeToneVolume);
  edgeToneVolumeLabel.textContent = `${edgeToneVolume}%`;
  edgeToneStyleSelect.addEventListener("change", () => setEdgeToneStyle(edgeToneStyleSelect.value));
  edgeToneStyleSelect.value = edgeToneStyle;
  edgeToneOutputSelect.addEventListener("change", () => setEdgeToneOutput(edgeToneOutputSelect.value));
  edgeToneOutputSelect.value = edgeToneOutput;
  edgeToneInstrumentSelect.addEventListener("change", () => setEdgeToneInstrument(edgeToneInstrumentSelect.value));
  edgeToneInstrumentSelect.value = edgeToneInstrument;
  edgeTonePitchRangeSlider.addEventListener("input", () => {
    setEdgeTonePitchRange(parseFloat(edgeTonePitchRangeSlider.value));
    edgeTonePitchRangeLabel.textContent = String(edgeTonePitchRangeOctaves);
  });
  edgeTonePitchRangeSlider.value = String(edgeTonePitchRangeOctaves);
  edgeTonePitchRangeLabel.textContent = String(edgeTonePitchRangeOctaves);
  edgeToneMinHitsSlider.addEventListener("input", () => {
    setEdgeToneMinHits(parseFloat(edgeToneMinHitsSlider.value));
    edgeToneMinHitsLabel.textContent = String(edgeToneMinHits);
  });
  edgeToneMinHitsSlider.value = String(edgeToneMinHits);
  edgeToneMinHitsLabel.textContent = String(edgeToneMinHits);
  edgeToneMaxHitsSlider.addEventListener("input", () => {
    setEdgeToneMaxHits(parseFloat(edgeToneMaxHitsSlider.value));
    edgeToneMaxHitsLabel.textContent = String(edgeToneMaxHits);
  });
  edgeToneMaxHitsSlider.value = String(edgeToneMaxHits);
  edgeToneMaxHitsLabel.textContent = String(edgeToneMaxHits);
  edgeToneTempoSlider.addEventListener("input", () => {
    setEdgeToneTempo(parseFloat(edgeToneTempoSlider.value));
    edgeToneTempoLabel.textContent = `${edgeToneTempoBpm} BPM`;
  });
  edgeToneTempoSlider.value = String(edgeToneTempoBpm);
  edgeToneTempoLabel.textContent = `${edgeToneTempoBpm} BPM`;
  edgeToneDetuneSlider.addEventListener("input", () => {
    setEdgeToneDetune(parseFloat(edgeToneDetuneSlider.value));
    edgeToneDetuneLabel.textContent = `${edgeToneDetuneCents}c`;
  });
  edgeToneDetuneSlider.value = String(edgeToneDetuneCents);
  edgeToneDetuneLabel.textContent = `${edgeToneDetuneCents}c`;
  edgeToneRandomnessSlider.addEventListener("input", () => {
    setEdgeToneRandomness(parseFloat(edgeToneRandomnessSlider.value));
    edgeToneRandomnessLabel.textContent = `${edgeToneRandomness}%`;
  });
  edgeToneRandomnessSlider.value = String(edgeToneRandomness);
  edgeToneRandomnessLabel.textContent = `${edgeToneRandomness}%`;
  edgeToneBarsSlider.addEventListener("input", () => {
    setEdgeToneBars(parseFloat(edgeToneBarsSlider.value));
    edgeToneBarsLabel.textContent = String(edgeToneBars);
  });
  edgeToneBarsSlider.value = String(edgeToneBars);
  edgeToneBarsLabel.textContent = String(edgeToneBars);
  edgeTonePatternSelect.addEventListener("change", () => setEdgeTonePattern(edgeTonePatternSelect.value));
  edgeTonePatternSelect.value = edgeTonePattern;
  updateEdgeToneSamplingTimer();

  audioTintBtn.addEventListener("click", toggleAudioTint);
  audioTintResetBtn.addEventListener("click", resetAudioTint);

  audioReactBtn.addEventListener("click", toggleAudioReact);
  updateAudioReactUi();
  audioReactStrengthSlider.addEventListener("input", () => {
    audioReactStrength = parseFloat(audioReactStrengthSlider.value);
    audioReactStrengthLabel.textContent = `${audioReactStrengthSlider.value}%`;
    saveAudioReactStrengthPref();
  });
  audioReactStrengthSlider.value = String(audioReactStrength);
  audioReactStrengthLabel.textContent = `${audioReactStrength}%`;
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

  scientificColourCheckbox.addEventListener("change", () => {
    scientificColourEnabled = scientificColourCheckbox.checked;
    saveScientificColourPref();
  });
  scientificColourCheckbox.checked = scientificColourEnabled;

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
  beatVibrateCheckbox.addEventListener("change", () => {
    beatVibrateEnabled = beatVibrateCheckbox.checked;
    saveBeatVibratePref();
  });
  beatVibrateCheckbox.checked = beatVibrateEnabled;
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

  // ---- Fullscreen ----
  // Replaced the old "Glasses mode" (fullscreen + HUD hidden + forced
  // landscape, for tethered AR/smart glasses) with a plain fullscreen
  // toggle — the landscape lock and AR framing went unused, and burying
  // the only way in behind either that button or the tiny gap of bare
  // video between HUD controls meant a mistap had no easy way back short
  // of reloading the page. This button lives outside both #hud and
  // #floatingCaptureBar, pinned to the screen at all times regardless of
  // HUD state, so there's always one large, unmissable target to get in
  // and back out.
  let fullscreenActive = false;

  function setFullscreenBtnState(active) {
    fullscreenBtn.classList.toggle("active", active);
    fullscreenBtn.setAttribute("aria-pressed", String(active));
  }

  async function enterFullscreen() {
    try {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) await req.call(document.documentElement);
    } catch (e) { /* fullscreen not available/permitted — still hide the HUD below */ }
    fullscreenActive = true;
    hud.classList.add("hide");
    setFullscreenBtnState(true);
  }

  function exitFullscreenMode() {
    fullscreenActive = false;
    hud.classList.remove("hide");
    setFullscreenBtnState(false);
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      exit.call(document).catch ? exit.call(document).catch(() => {}) : exit.call(document);
    }
  }

  function toggleFullscreenMode() {
    if (fullscreenActive) exitFullscreenMode(); else enterFullscreen();
  }
  fullscreenBtn.addEventListener("click", toggleFullscreenMode);

  // The browser's own fullscreen-exit gesture (Esc key, swipe-down on
  // mobile, back gesture) doesn't go through exitFullscreenMode() above, so
  // this catches that path too and keeps the button/HUD state in sync.
  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (fullscreenActive && !document.fullscreenElement && !document.webkitFullscreenElement) exitFullscreenMode();
    });
  });

  torchBtn.addEventListener("click", toggleTorch);

  calibrateBtn.addEventListener("click", () => openChoosePanel());
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
      "#hud, #overlay, #cameraStatus, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel, #fullscreenBtn"
    ));
  }

  document.body.addEventListener("click", (e) => {
    if (isHudTapTarget(e.target)) return;
    hud.classList.toggle("hide");
  });

  updatePointsCount();
  seedBuiltinTemplatesIfNeeded();
  renderProfileSelect();
  blendLabel.textContent = `${blendSlider.value}%`;
  spreadSlider.value = String(spread);
  spreadLabel.textContent = spreadDescription(spread);
  rotateBtn.classList.toggle("active", rotate180);
})();
