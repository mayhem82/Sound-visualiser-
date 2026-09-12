(() => {
  "use strict";

  // Vibration Drum Machine -- a full kit of drum pads playable two ways:
  // tap one on screen for a direct hit, or tap one to arm it (it stays
  // armed after you let go) and then tap the table beside the phone
  // instead. The accelerometer can only ever report "an impact happened
  // nearby, this strong," never which drum was physically tapped or
  // where on the table -- there's no spatial information in a single
  // vibration sensor. So real-world taps always play whichever pad is
  // currently armed, never a pad chosen by tap location. See the caveat
  // banner in the UI for the rest of the honesty around this
  // (surface-dependent sensitivity, real latency).
  //
  // The baseline/threshold tap-detection approach below is the same one
  // Vibration Scan's passive monitor uses (an EMA rest baseline that only
  // drifts while not spiking, so a real event doesn't get absorbed into
  // "the new normal" mid-event). Re-triggering is gated purely by
  // elapsed time (the "Minimum gap between taps" setting) rather than
  // requiring the level to first decay back below threshold -- a
  // resonant surface can keep ringing above threshold well after the
  // physical tap, which would otherwise suppress every next tap until it
  // fully settles.

  const BASELINE_ALPHA = 0.02; // per-sample EMA rate for the drifting rest baseline
  const LEVEL_ALPHA = 0.5;     // per-sample EMA rate for the live level
  const MIN_THRESHOLD = 0.15;  // m/s^2 at sensitivity 100 (most sensitive)
  const MAX_THRESHOLD = 5;     // m/s^2 at sensitivity 1 (least sensitive)

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const dmSupportHint = document.getElementById("dmSupportHint");

  const dmMain = document.getElementById("dmMain");
  const dmStatus = document.getElementById("dmStatus");
  const motionPill = document.getElementById("motionPill");
  const motionPillText = document.getElementById("motionPillText");
  const dmArmedStatus = document.getElementById("dmArmedStatus");
  const dmSensitivitySlider = document.getElementById("dmSensitivitySlider");
  const dmVolumeSlider = document.getElementById("dmVolumeSlider");
  const dmMinGapSlider = document.getElementById("dmMinGapSlider");
  const dmMotionUnsupportedHint = document.getElementById("dmMotionUnsupportedHint");
  const pads = Array.from(document.querySelectorAll(".dm-pad"));

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const hasAudio = typeof AudioContextCtor === "function";
  const hasMotion = typeof window.DeviceMotionEvent !== "undefined";

  if (!hasAudio) {
    dmSupportHint.textContent = "This browser doesn't support the Web Audio API -- needed to play the drum sounds at all.";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }
  if (!hasMotion) {
    dmMotionUnsupportedHint.textContent = "This browser/device doesn't expose a motion sensor -- pads still play by tapping the screen, but holding one down won't respond to real-world taps on the table.";
  }

  let audioCtx = null;
  let noiseBuffer = null;
  let armedPad = null; // pad id currently armed, or null
  let motionListening = false;
  let motionPermissionAsked = false;
  let monitorBaseline = null;
  let monitorLevel = 0;
  let lastTriggerAt = -Infinity;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (!noiseBuffer) {
      const len = audioCtx.sampleRate; // 1 second of white noise, sliced from for every hit
      noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function volume() { return Number(dmVolumeSlider.value) / 100; }

  function playKick() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function playSnare() {
    const now = audioCtx.currentTime;
    const vol = volume();

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(bp).connect(noiseGain).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.2);

    const osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(vol * 0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function playHihat() {
    const now = audioCtx.currentTime;
    const vol = volume();
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(hp).connect(gain).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  function playClap() {
    const now = audioCtx.currentTime;
    const vol = volume();
    [0, 0.02, 0.04].forEach((offset, i) => {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol * (i === 2 ? 1 : 0.6), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      noise.connect(bp).connect(gain).connect(audioCtx.destination);
      noise.start(now + offset);
      noise.stop(now + offset + 0.1);
    });
  }

  // Shared helper for the "sweeping sine" family (kick/toms/sub kick) --
  // just the start/end frequency and decay time differ between them.
  function playSweep(startHz, endHz, decayS, volMult) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + decayS * 0.4);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume() * volMult, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decayS);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + decayS + 0.05);
  }

  // Shared helper for the "filtered noise burst" family (hats/cymbals/
  // shaker/snap/rimshot) -- filter type/frequency and decay differ.
  function playNoiseBurst(filterType, filterFreq, decayS, volMult) {
    const now = audioCtx.currentTime;
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume() * volMult, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decayS);
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + decayS + 0.02);
  }

  function playTom() { playSweep(220, 90, 0.3, 0.9); }
  function playHighTom() { playSweep(300, 140, 0.25, 0.85); }
  function playLowTom() { playSweep(150, 60, 0.35, 0.95); }
  function play808SubKick() { playSweep(80, 30, 0.6, 1); }

  function playRimshot() {
    playNoiseBurst("bandpass", 2500, 0.05, 0.7);
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 400;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume() * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playCowbell() {
    const now = audioCtx.currentTime;
    const vol = volume();
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    bp.connect(gain).connect(audioCtx.destination);
    [587, 845].forEach((freq) => {
      const osc = audioCtx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(bp);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  function playCrash() {
    playNoiseBurst("highpass", 5000, 1.2, 0.7);
  }

  function playRide() {
    playNoiseBurst("highpass", 4000, 0.15, 0.4);
    playNoiseBurst("bandpass", 3500, 0.6, 0.35);
  }

  function playOpenHihat() { playNoiseBurst("highpass", 6500, 0.4, 0.55); }

  function playConga() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume() * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  function playShaker() {
    playNoiseBurst("highpass", 8000, 0.08, 0.3);
    setTimeout(() => { if (audioCtx) playNoiseBurst("highpass", 8000, 0.08, 0.25); }, 60);
  }

  function playTambourine() {
    playNoiseBurst("highpass", 6000, 0.15, 0.3);
    [4000, 6500, 9000].forEach((freq) => playNoiseBurst("bandpass", freq, 0.2, 0.18));
  }

  function playWoodblock() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 1000;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume() * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playSnap() { playNoiseBurst("bandpass", 2800, 0.04, 0.6); }

  const PAD_SOUNDS = {
    kick: playKick, snare: playSnare, hihat: playHihat, clap: playClap,
    tom: playTom, rimshot: playRimshot, cowbell: playCowbell, crash: playCrash,
    openhihat: playOpenHihat, ride: playRide, hightom: playHighTom, lowtom: playLowTom,
    conga: playConga, shaker: playShaker, tambourine: playTambourine,
    woodblock: playWoodblock, snap: playSnap, subkick: play808SubKick,
  };

  function triggerPad(padId, source) {
    const fn = PAD_SOUNDS[padId];
    if (!fn) return;
    ensureAudio();
    fn();
    const el = document.getElementById(`dmPad-${padId}`);
    if (el) {
      el.classList.add("hit");
      setTimeout(() => el.classList.remove("hit"), 120);
    }
    if (source === "tap") dmArmedStatus.textContent = `Table tap detected -- played ${padId}.`;
  }

  function setArmedPad(padId) {
    if (armedPad) {
      const prev = document.getElementById(`dmPad-${armedPad}`);
      if (prev) prev.classList.remove("armed");
    }
    armedPad = padId;
    if (armedPad) {
      const el = document.getElementById(`dmPad-${armedPad}`);
      if (el) el.classList.add("armed");
      dmArmedStatus.textContent = `${armedPad} armed -- tap the table beside the phone to play it, hands-free.`;
    } else {
      dmArmedStatus.textContent = "";
    }
  }

  // Tap to select, not hold-to-arm -- holding a pad down would pin the
  // hand that should be free to tap the table right onto the screen,
  // defeating the entire point. A tap plays the pad AND leaves it armed
  // afterward; tapping the same armed pad again releases it (no pad
  // armed at all), tapping a different pad switches which one's armed.
  pads.forEach((pad) => {
    const padId = pad.dataset.pad;
    pad.addEventListener("pointerdown", () => {
      triggerPad(padId, "press");
      setArmedPad(armedPad === padId ? null : padId);
    });
  });

  function sensitivityThreshold() {
    const s = Math.max(1, Math.min(100, Number(dmSensitivitySlider.value)));
    return MAX_THRESHOLD - (s / 100) * (MAX_THRESHOLD - MIN_THRESHOLD);
  }

  function magnitudeOf(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x === null || a.x === undefined) return null;
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }

  function minGapMs() { return Number(dmMinGapSlider.value); }

  function handleMotion(e) {
    const m = magnitudeOf(e);
    if (m === null) return;
    if (monitorBaseline === null) monitorBaseline = m;
    const deviation = Math.abs(m - monitorBaseline);
    const threshold = sensitivityThreshold();
    if (deviation < threshold) monitorBaseline += (m - monitorBaseline) * BASELINE_ALPHA;
    monitorLevel += (deviation - monitorLevel) * LEVEL_ALPHA;

    if (monitorLevel >= threshold) {
      const now = performance.now();
      if (now - lastTriggerAt >= minGapMs()) {
        lastTriggerAt = now;
        if (armedPad) triggerPad(armedPad, "tap");
        else dmArmedStatus.textContent = "Table tap detected -- tap a pad to arm one.";
      }
    }
  }

  async function startMotionListening() {
    if (!hasMotion || motionListening) return;
    try {
      if (!motionPermissionAsked && typeof DeviceMotionEvent.requestPermission === "function") {
        motionPermissionAsked = true;
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== "granted") {
          motionPill.className = "dmx-pill error";
          motionPillText.textContent = "Motion sensor: permission denied";
          return;
        }
      }
      window.addEventListener("devicemotion", handleMotion);
      motionListening = true;
      motionPill.className = "dmx-pill connected";
      motionPillText.textContent = "Motion sensor: on";
    } catch (e) {
      motionPill.className = "dmx-pill error";
      motionPillText.textContent = "Motion sensor: error";
    }
  }

  startBtn.addEventListener("click", async () => {
    overlay.classList.add("hide");
    dmMain.classList.remove("hide");
    ensureAudio();
    await startMotionListening();
    if (window.WakeLockHelper) window.WakeLockHelper.enable();
  });
})();
