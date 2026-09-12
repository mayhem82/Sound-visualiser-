(() => {
  "use strict";

  // Doppler Theremin — a one-antenna analogue of a real theremin's
  // proximity sensing, built entirely from Web Audio primitives already
  // used elsewhere in this suite (AudioContext, AnalyserNode). A fixed,
  // near-ultrasonic tone plays continuously through the speaker; a moving
  // hand nearby Doppler-shifts the echo the microphone picks up, and that
  // shift drives a played pitch/volume.
  //
  // Important honest limits, not just a caveat banner: only MOTION
  // produces a detectable Doppler shift at all -- a hand held still and
  // close looks identical (acoustically) to no hand there, because the
  // probe tone bleeds from speaker to mic directly regardless, swamping
  // any static reflection at the same frequency. So this responds to
  // "hand moving toward/away," not "hand held at a certain distance," and
  // the pitch estimate below decays back toward centre on its own when
  // nothing's moving rather than holding -- a real theremin can hold a
  // pitch by holding a position; this one can't, and doesn't pretend to.

  const PROBE_FREQ = 18500;       // Hz -- near-ultrasonic; may be faintly audible, especially to younger listeners
  const FFT_SIZE = 16384;         // ~2.7Hz/bin at 44.1kHz -- fine enough to resolve a walking-speed hand's Doppler shift
  const SIDE_BAND_LO_HZ = 60;     // skip bins closest to the probe tone -- dominated by direct bleed-through, not echo
  const SIDE_BAND_HI_HZ = 400;    // upper bound of Doppler shift worth watching for hand-speed motion
  const POSITION_GAIN = 0.35;     // how fast net approach/recede energy moves the pitch estimate
  const POSITION_DECAY_PER_SEC = 0.15; // fraction of position retained after 1s with no motion (leaky integrator)
  const ACTIVITY_SMOOTHING_PER_SEC = 8; // how fast the volume-driving activity estimate follows new energy
  const BASE_FREQ = 220;          // A3 -- centre pitch when position is 0
  const PITCH_RANGE_OCTAVES = 1.5;

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

  const thStartBtn = document.getElementById("thStartBtn");
  const thStopBtn = document.getElementById("thStopBtn");
  const thMeterFill = document.getElementById("thMeterFill");
  const thNoteReadout = document.getElementById("thNoteReadout");
  const thProbeVolSlider = document.getElementById("thProbeVolSlider");
  const thSynthVolSlider = document.getElementById("thSynthVolSlider");

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const hasAudio = typeof AudioContextCtor === "function";
  const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!hasAudio || !hasMic) {
    thSupportHint.textContent = "This browser doesn't support the Web Audio API and/or microphone access -- both are needed here.";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }

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
  // hardware to exercise the mapping logic.
  let position = 0;
  let smoothedActivity = 0;

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

  function tick(now) {
    if (!playing) return;
    const dtSeconds = lastTickAt ? Math.min(0.2, (now - lastTickAt) / 1000) : 0.016;
    lastTickAt = now;

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

    const freq = frequencyForPosition(pos);
    synthOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.03);
    const synthVol = Number(thSynthVolSlider.value) / 100;
    const activityGain = Math.max(0, Math.min(1, act * 3)); // scale so typical motion energy reaches full volume; silent when still
    synthGain.gain.setTargetAtTime(synthVol * activityGain * 0.3, audioCtx.currentTime, 0.05);

    thMeterFill.style.left = pos >= 0 ? "50%" : `${50 + pos * 50}%`;
    thMeterFill.style.width = `${Math.abs(pos) * 50}%`;
    thNoteReadout.textContent = `${noteNameForFrequency(freq)} · ${Math.round(freq)}Hz`;

    rafId = requestAnimationFrame(tick);
  }

  async function startPlaying() {
    try {
      audioCtx = new AudioContextCtor();
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

      synthOsc = audioCtx.createOscillator();
      synthOsc.type = "sine";
      synthOsc.frequency.value = BASE_FREQ;
      synthGain = audioCtx.createGain();
      synthGain.gain.value = 0;
      synthOsc.connect(synthGain).connect(audioCtx.destination);
      synthOsc.start();

      position = 0;
      smoothedActivity = 0;
      lastTickAt = null;
      playing = true;

      probePill.className = "dmx-pill connected";
      probePillText.textContent = "Probe tone: on";
      micPill.className = "dmx-pill connected";
      micPillText.textContent = "Microphone: on";
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
    if (probeOsc) { try { probeOsc.stop(); } catch (e) {} probeOsc = null; }
    if (synthOsc) { try { synthOsc.stop(); } catch (e) {} synthOsc = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    probePill.className = "dmx-pill";
    probePillText.textContent = "Probe tone: off";
    micPill.className = "dmx-pill";
    micPillText.textContent = "Microphone: off";
    thStartBtn.classList.remove("hide");
    thStopBtn.classList.add("hide");
    thMeterFill.style.width = "0%";
    thNoteReadout.textContent = "--";
    if (window.WakeLockHelper) window.WakeLockHelper.disable();
  }

  thStartBtn.addEventListener("click", startPlaying);
  thStopBtn.addEventListener("click", stopPlaying);
  thProbeVolSlider.addEventListener("input", () => { if (probeGain) probeGain.gain.value = Number(thProbeVolSlider.value) / 100; });

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    thMain.classList.remove("hide");
  });
})();
