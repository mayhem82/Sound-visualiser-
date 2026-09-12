(() => {
  "use strict";

  // Theremin — two independent sensing modes driving the same played
  // pitch/volume:
  //
  // Doppler: a one-antenna analogue of a real theremin's proximity
  // sensing, built entirely from Web Audio primitives already used
  // elsewhere in this suite (AudioContext, AnalyserNode). A fixed,
  // near-ultrasonic tone plays continuously through the speaker; a moving
  // hand nearby Doppler-shifts the echo the microphone picks up, and that
  // shift drives a played pitch/volume. Important honest limit, not just a
  // caveat banner: only MOTION produces a detectable Doppler shift at all
  // -- a hand held still and close looks identical (acoustically) to no
  // hand there, because the probe tone bleeds from speaker to mic directly
  // regardless, swamping any static reflection at the same frequency. So
  // this responds to "hand moving toward/away," not "hand held at a
  // certain distance," and the pitch estimate decays back toward centre on
  // its own when nothing's moving rather than holding -- a real theremin
  // can hold a pitch by holding a position; this mode can't, and doesn't
  // pretend to.
  //
  // Tilt: the phone's own real DeviceOrientationEvent reading -- gamma
  // (left/right tilt) drives pitch, beta (forward/back tilt) drives
  // volume. A real, direct, non-approximated reading (unlike Doppler),
  // just a different physical interaction: you're moving the instrument
  // itself, not sensing a hand near a still one -- and holding a tilt
  // angle genuinely holds the pitch, since there's no decay-to-centre
  // reason to fake here the way Doppler's velocity-derived signal needs.

  const PROBE_FREQ = 18500;       // Hz -- near-ultrasonic; may be faintly audible, especially to younger listeners
  const FFT_SIZE = 16384;         // ~2.7Hz/bin at 44.1kHz -- fine enough to resolve a walking-speed hand's Doppler shift
  const SIDE_BAND_LO_HZ = 60;     // skip bins closest to the probe tone -- dominated by direct bleed-through, not echo
  const SIDE_BAND_HI_HZ = 400;    // upper bound of Doppler shift worth watching for hand-speed motion
  const POSITION_GAIN = 0.35;     // how fast net approach/recede energy moves the pitch estimate
  const POSITION_DECAY_PER_SEC = 0.15; // fraction of position retained after 1s with no motion (leaky integrator)
  const ACTIVITY_SMOOTHING_PER_SEC = 8; // how fast the volume-driving activity estimate follows new energy
  const BASE_FREQ = 220;          // A3 -- centre pitch when position is 0
  const PITCH_RANGE_OCTAVES = 1.5;
  const TILT_PITCH_RANGE_DEG = 45;   // gamma at +-this many degrees maps to position +-1
  const TILT_VOLUME_RANGE_DEG = 45;  // beta at +-this many degrees maps to volume 0..1
  const TILT_SMOOTHING_PER_SEC = 12; // light smoothing only -- tilt is a direct reading, not a signal that needs heavy filtering
  const THEREMIN_MIDI_CHANNEL = 0;
  const NOTE_DURATION_MS = 500;
  const PENTATONIC_DEGREES = [0, 2, 4, 7, 9]; // major pentatonic, same shape as sound-colour.js's chime scale
  const SCALE_OCTAVES = 2;

  // MIDI/Instrument can only ever trigger discrete notes (a MIDI Note On,
  // or one sample start) -- neither can bend pitch smoothly the way the
  // Synth output's oscillator does, so both instead quantize the same
  // continuous position estimate onto this small scale and play a new note
  // only when it steps to a different degree (see tick()).
  function buildScaleHz(rootHz, octaves) {
    const semis = [];
    for (let oct = 0; oct < octaves; oct++) {
      for (const d of PENTATONIC_DEGREES) semis.push(d + oct * 12);
    }
    semis.push(octaves * 12);
    return semis.map((st) => rootHz * Math.pow(2, st / 12));
  }
  const SCALE_HZ = buildScaleHz(BASE_FREQ, SCALE_OCTAVES);

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const thSupportHint = document.getElementById("thSupportHint");

  const thMain = document.getElementById("thMain");
  const thStatus = document.getElementById("thStatus");
  const probePill = document.getElementById("probePill");
  const probePillText = document.getElementById("probePillText");
  const micPill = document.getElementById("micPill");
  const micPillText = document.getElementById("micPillText");
  const orientationPill = document.getElementById("orientationPill");
  const orientationPillText = document.getElementById("orientationPillText");

  const thStartBtn = document.getElementById("thStartBtn");
  const thStopBtn = document.getElementById("thStopBtn");
  const thMeterFill = document.getElementById("thMeterFill");
  const thNoteReadout = document.getElementById("thNoteReadout");
  const thProbeVolWrap = document.getElementById("thProbeVolWrap");
  const thProbeVolSlider = document.getElementById("thProbeVolSlider");
  const thSynthVolSlider = document.getElementById("thSynthVolSlider");
  const thOutputSelect = document.getElementById("thOutputSelect");
  const thInstrumentWrap = document.getElementById("thInstrumentWrap");
  const thInstrumentSelect = document.getElementById("thInstrumentSelect");
  const thMidiOutputWrap = document.getElementById("thMidiOutputWrap");
  const thMidiOutputSelect = document.getElementById("thMidiOutputSelect");
  const thMidiUnsupportedHint = document.getElementById("thMidiUnsupportedHint");
  const thSensingSelect = document.getElementById("thSensingSelect");
  const thCaveatDoppler = document.getElementById("thCaveatDoppler");
  const thCaveatTilt = document.getElementById("thCaveatTilt");
  const thMeterHintDoppler = document.getElementById("thMeterHintDoppler");
  const thMeterHintTilt = document.getElementById("thMeterHintTilt");

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const hasAudio = typeof AudioContextCtor === "function";
  const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasOrientation = typeof window.DeviceOrientationEvent !== "undefined";
  if (!hasAudio || (!hasMic && !hasOrientation)) {
    thSupportHint.textContent = "This browser doesn't support the Web Audio API and/or any sensing method (microphone, device orientation) -- at least one sensing method is needed here.";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }
  if (!hasMic) thSensingSelect.querySelector('option[value="doppler"]').disabled = true;
  if (!hasOrientation) thSensingSelect.querySelector('option[value="tilt"]').disabled = true;
  let sensingMode = hasMic ? "doppler" : "tilt";
  thSensingSelect.value = sensingMode;

  // MidiInstrumentHelper (midi-instrument.js) is a hard dependency of the
  // MIDI/Instrument outputs only -- Synth (the default) works without it,
  // so its absence disables those two options rather than the whole page.
  const hasMidiInstrumentHelper = typeof window.MidiInstrumentHelper === "object";
  if (hasMidiInstrumentHelper) {
    window.MidiInstrumentHelper.populateInstrumentSelect(thInstrumentSelect);
    thInstrumentSelect.value = "music_box";
  } else {
    thOutputSelect.querySelector('option[value="midi"]').disabled = true;
    thOutputSelect.querySelector('option[value="instrument"]').disabled = true;
  }
  let output = "synth";
  let instrument = "music_box";
  let lastScaleIndex = -1;

  let audioCtx = null;
  let micStream = null;
  let analyser = null;
  let freqData = null;
  let probeOsc = null, probeGain = null;
  let synthOsc = null, synthGain = null;
  let rafId = null;
  let lastTickAt = null;
  let playing = false;

  // Leaky-integrated position estimate (-1..1) and smoothed motion
  // activity (0..~) -- both pure state updated once per animation frame;
  // kept outside the loop function so a test can drive updateFromBands()
  // directly with synthetic spectra instead of needing real audio/mic
  // hardware to exercise the mapping logic. Doppler mode only.
  let position = 0;
  let smoothedActivity = 0;

  // Tilt mode's own state: raw values updated asynchronously by
  // handleOrientation whenever a deviceorientation event arrives, and
  // smoothed values tick() eases toward each frame -- a real direct
  // reading needs far lighter smoothing than Doppler's derived signal,
  // just enough to take the jitter off a shaky hand.
  let rawTiltPos = 0;
  let rawTiltVolume = 0;
  let smoothedTiltPos = 0;
  let smoothedTiltVolume = 0;
  let orientationPermissionGranted = false;

  function dbToLinearEnergy(db) {
    if (!isFinite(db)) return 0;
    return Math.pow(10, db / 20);
  }

  function updateFromBands(aboveEnergy, belowEnergy, dtSeconds) {
    const balance = aboveEnergy - belowEnergy;
    const activity = aboveEnergy + belowEnergy;
    position += balance * POSITION_GAIN * dtSeconds;
    position *= Math.pow(POSITION_DECAY_PER_SEC, dtSeconds);
    position = Math.max(-1, Math.min(1, position));
    const smoothing = Math.min(1, ACTIVITY_SMOOTHING_PER_SEC * dtSeconds);
    smoothedActivity += (activity - smoothedActivity) * smoothing;
    return { position, smoothedActivity };
  }

  function frequencyForPosition(pos) {
    return BASE_FREQ * Math.pow(2, pos * PITCH_RANGE_OCTAVES);
  }

  function noteNameForFrequency(freq) {
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
  }

  function handleOrientation(e) {
    if (typeof e.gamma !== "number" || typeof e.beta !== "number") return;
    rawTiltPos = Math.max(-1, Math.min(1, e.gamma / TILT_PITCH_RANGE_DEG));
    rawTiltVolume = Math.max(0, Math.min(1, (e.beta + TILT_VOLUME_RANGE_DEG) / (2 * TILT_VOLUME_RANGE_DEG)));
  }

  function dopplerPositionAndActivity(dtSeconds) {
    analyser.getFloatFrequencyData(freqData);
    const binHz = audioCtx.sampleRate / FFT_SIZE;
    const f0Bin = Math.round(PROBE_FREQ / binHz);
    const loOffset = Math.round(SIDE_BAND_LO_HZ / binHz);
    const hiOffset = Math.round(SIDE_BAND_HI_HZ / binHz);

    let aboveEnergy = 0, belowEnergy = 0;
    for (let i = loOffset; i <= hiOffset; i++) {
      const aboveBin = f0Bin + i, belowBin = f0Bin - i;
      if (aboveBin < freqData.length) aboveEnergy += dbToLinearEnergy(freqData[aboveBin]);
      if (belowBin >= 0) belowEnergy += dbToLinearEnergy(freqData[belowBin]);
    }

    const { position: pos, smoothedActivity: act } = updateFromBands(aboveEnergy, belowEnergy, dtSeconds);
    return { pos, activityGain: Math.max(0, Math.min(1, act * 3)) }; // scale so typical motion energy reaches full volume; silent when still
  }

  function tiltPositionAndActivity(dtSeconds) {
    const smoothing = Math.min(1, TILT_SMOOTHING_PER_SEC * dtSeconds);
    smoothedTiltPos += (rawTiltPos - smoothedTiltPos) * smoothing;
    smoothedTiltVolume += (rawTiltVolume - smoothedTiltVolume) * smoothing;
    return { pos: smoothedTiltPos, activityGain: smoothedTiltVolume };
  }

  function tick(now) {
    if (!playing) return;
    const dtSeconds = lastTickAt ? Math.min(0.2, (now - lastTickAt) / 1000) : 0.016;
    lastTickAt = now;

    const { pos, activityGain } = sensingMode === "doppler" ? dopplerPositionAndActivity(dtSeconds) : tiltPositionAndActivity(dtSeconds);

    const freq = frequencyForPosition(pos);
    const synthVol = Number(thSynthVolSlider.value) / 100;

    if (output === "synth") {
      synthOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.03);
      synthGain.gain.setTargetAtTime(synthVol * activityGain * 0.3, audioCtx.currentTime, 0.05);
      lastScaleIndex = -1; // re-arm so switching back to MIDI/Instrument always plays its current step, not "no change"
    } else {
      // Neither MIDI nor a sample can bend pitch smoothly -- keep the raw
      // oscillator silent and instead trigger one discrete note each time
      // the quantized position crosses into a new scale step.
      synthGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      const scaleIndex = Math.max(0, Math.min(SCALE_HZ.length - 1, Math.round(((pos + 1) / 2) * (SCALE_HZ.length - 1))));
      if (scaleIndex !== lastScaleIndex && activityGain > 0.05) {
        lastScaleIndex = scaleIndex;
        playDiscreteNote(SCALE_HZ[scaleIndex], Math.max(0.2, synthVol * activityGain));
      }
    }

    thMeterFill.style.left = pos >= 0 ? "50%" : `${50 + pos * 50}%`;
    thMeterFill.style.width = `${Math.abs(pos) * 50}%`;
    thNoteReadout.textContent = `${noteNameForFrequency(freq)} · ${Math.round(freq)}Hz`;

    rafId = requestAnimationFrame(tick);
  }

  function playDiscreteNote(freq, velocity) {
    const H = window.MidiInstrumentHelper;
    const midiNote = H.hzToMidiNote(freq);
    if (output === "midi") {
      const inst = H.GM_ALL_INSTRUMENTS.find((i) => i.folder === instrument) || H.GM_ALL_INSTRUMENTS.find((i) => i.folder === "music_box");
      H.midi.playNote(THEREMIN_MIDI_CHANNEL, inst.program, midiNote, velocity, NOTE_DURATION_MS);
    } else if (output === "instrument") {
      H.instrument.playNote(audioCtx, audioCtx.destination, instrument, midiNote, velocity, NOTE_DURATION_MS / 1000);
    }
  }

  async function startDopplerSensing() {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const micSource = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    freqData = new Float32Array(analyser.frequencyBinCount);
    micSource.connect(analyser);

    probeOsc = audioCtx.createOscillator();
    probeOsc.type = "sine";
    probeOsc.frequency.value = PROBE_FREQ;
    probeGain = audioCtx.createGain();
    probeGain.gain.value = Number(thProbeVolSlider.value) / 100;
    probeOsc.connect(probeGain).connect(audioCtx.destination);
    probeOsc.start();

    position = 0;
    smoothedActivity = 0;
    probePill.className = "dmx-pill connected";
    probePillText.textContent = "Probe tone: on";
    micPill.className = "dmx-pill connected";
    micPillText.textContent = "Microphone: on";
  }

  function stopDopplerSensing() {
    if (probeOsc) { try { probeOsc.stop(); } catch (e) {} probeOsc = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    analyser = null;
    freqData = null;
    probePill.className = "dmx-pill";
    probePillText.textContent = "Probe tone: off";
    micPill.className = "dmx-pill";
    micPillText.textContent = "Microphone: off";
  }

  async function startTiltSensing() {
    if (typeof DeviceOrientationEvent.requestPermission === "function" && !orientationPermissionGranted) {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== "granted") throw new Error("Orientation sensor: permission denied.");
      orientationPermissionGranted = true;
    }
    window.addEventListener("deviceorientation", handleOrientation);
    rawTiltPos = 0;
    rawTiltVolume = 0.5;
    smoothedTiltPos = 0;
    smoothedTiltVolume = 0.5;
    orientationPill.className = "dmx-pill connected";
    orientationPillText.textContent = "Orientation sensor: on";
  }

  function stopTiltSensing() {
    window.removeEventListener("deviceorientation", handleOrientation);
    orientationPill.className = "dmx-pill";
    orientationPillText.textContent = "Orientation sensor: off";
  }

  async function startSensing() {
    if (sensingMode === "doppler") await startDopplerSensing();
    else await startTiltSensing();
  }
  function stopSensing() {
    stopDopplerSensing();
    stopTiltSensing();
  }

  // Reflects sensingMode into every mode-specific control -- called on
  // page load and whenever Sensing changes.
  function applySensingModeUI() {
    const isDoppler = sensingMode === "doppler";
    probePill.classList.toggle("hide", !isDoppler);
    micPill.classList.toggle("hide", !isDoppler);
    orientationPill.classList.toggle("hide", isDoppler);
    thProbeVolWrap.classList.toggle("hide", !isDoppler);
    thCaveatDoppler.classList.toggle("hide", !isDoppler);
    thCaveatTilt.classList.toggle("hide", isDoppler);
    thMeterHintDoppler.classList.toggle("hide", !isDoppler);
    thMeterHintTilt.classList.toggle("hide", isDoppler);
  }
  applySensingModeUI();

  thSensingSelect.addEventListener("change", async () => {
    const next = thSensingSelect.value;
    if (next === sensingMode) return;
    if (playing) {
      // tick()'s rAF loop must not run while a sensor is mid-switch --
      // otherwise it can read Doppler's analyser (or tilt's smoothed
      // state) between stopSensing() clearing it and startSensing()
      // (an async mic-permission wait) finishing it, crashing on a null
      // analyser or just briefly reading stale state.
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      stopSensing();
      sensingMode = next;
      applySensingModeUI();
      try { await startSensing(); }
      catch (e) { thStatus.textContent = "Couldn't switch sensing: " + e.message; stopPlaying(); return; }
      lastTickAt = null;
      lastScaleIndex = -1;
      rafId = requestAnimationFrame(tick);
    } else {
      sensingMode = next;
      applySensingModeUI();
    }
  });

  async function startPlaying() {
    try {
      audioCtx = new AudioContextCtor();

      synthOsc = audioCtx.createOscillator();
      synthOsc.type = "sine";
      synthOsc.frequency.value = BASE_FREQ;
      synthGain = audioCtx.createGain();
      synthGain.gain.value = 0;
      synthOsc.connect(synthGain).connect(audioCtx.destination);
      synthOsc.start();

      await startSensing();

      lastTickAt = null;
      lastScaleIndex = -1;
      playing = true;

      thStartBtn.classList.add("hide");
      thStopBtn.classList.remove("hide");
      thStatus.textContent = "";
      if (window.WakeLockHelper) window.WakeLockHelper.enable();

      rafId = requestAnimationFrame(tick);
    } catch (e) {
      thStatus.textContent = "Couldn't start: " + (e.message || e.name || "unknown error");
      stopPlaying();
    }
  }

  function stopPlaying() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopSensing();
    if (synthOsc) { try { synthOsc.stop(); } catch (e) {} synthOsc = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    thStartBtn.classList.remove("hide");
    thStopBtn.classList.add("hide");
    thMeterFill.style.width = "0%";
    thNoteReadout.textContent = "--";
    if (window.WakeLockHelper) window.WakeLockHelper.disable();
  }

  thStartBtn.addEventListener("click", startPlaying);
  thStopBtn.addEventListener("click", stopPlaying);
  thProbeVolSlider.addEventListener("input", () => { if (probeGain) probeGain.gain.value = Number(thProbeVolSlider.value) / 100; });

  function refreshMidiOutputOptions(outputs, selectedId) {
    thMidiOutputSelect.innerHTML = "";
    outputs.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.name || "MIDI output";
      thMidiOutputSelect.appendChild(opt);
    });
    if (selectedId) thMidiOutputSelect.value = selectedId;
    thMidiOutputWrap.classList.toggle("hide", output !== "midi" || !outputs.length);
    thMidiUnsupportedHint.textContent = output === "midi" && !outputs.length
      ? "No MIDI output found -- connect a MIDI device (or a virtual one) and reselect MIDI."
      : "";
  }

  if (hasMidiInstrumentHelper) {
    thOutputSelect.addEventListener("change", () => {
      output = thOutputSelect.value;
      lastScaleIndex = -1;
      thInstrumentWrap.classList.toggle("hide", output === "synth");
      thMidiOutputWrap.classList.toggle("hide", output !== "midi");
      if (output === "midi") {
        window.MidiInstrumentHelper.midi.ensureAccess(refreshMidiOutputOptions).then((ok) => {
          if (!ok) thMidiUnsupportedHint.textContent = "This browser doesn't support Web MIDI -- try desktop Chrome or Edge.";
        });
      }
    });
    thInstrumentSelect.addEventListener("change", () => { instrument = thInstrumentSelect.value; });
    thMidiOutputSelect.addEventListener("change", () => window.MidiInstrumentHelper.midi.setOutput(thMidiOutputSelect.value));
  }

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    thMain.classList.remove("hide");
  });
})();
