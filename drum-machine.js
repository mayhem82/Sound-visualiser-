(() => {
  "use strict";

  // Vibration Drum Machine -- four drum pads playable two ways: tap one
  // on screen for a direct hit, or press and hold one down while tapping
  // the table beside the phone. The accelerometer can only ever report
  // "an impact happened nearby, this strong," never which drum was
  // physically tapped or where on the table -- there's no spatial
  // information in a single vibration sensor. So real-world taps always
  // play whichever pad is currently held (armed), never a pad chosen by
  // tap location. See the caveat banner in the UI for the rest of the
  // honesty around this (surface-dependent sensitivity, real latency).
  //
  // The baseline/threshold/hysteresis tap-detection approach below is the
  // same one Vibration Scan's passive monitor uses (an EMA rest baseline
  // that only drifts while not spiking, so a real event doesn't get
  // absorbed into "the new normal" mid-event), just tuned for a single
  // one-shot trigger per tap instead of a continuous logged level.

  const BASELINE_ALPHA = 0.02; // per-sample EMA rate for the drifting rest baseline
  const LEVEL_ALPHA = 0.5;     // per-sample EMA rate for the live level -- faster than Vibration Scan's since a drum hit needs to decay back below threshold quickly to be ready for the next one
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
  let armedPad = null; // pad id currently held down, or null
  let motionListening = false;
  let motionPermissionAsked = false;
  let monitorBaseline = null;
  let monitorLevel = 0;
  let monitorArmed = true; // hysteresis: only fires again once the level drops back below threshold

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

  const PAD_SOUNDS = { kick: playKick, snare: playSnare, hihat: playHihat, clap: playClap };

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

  function handleMotion(e) {
    const m = magnitudeOf(e);
    if (m === null) return;
    if (monitorBaseline === null) monitorBaseline = m;
    const deviation = Math.abs(m - monitorBaseline);
    const threshold = sensitivityThreshold();
    if (deviation < threshold) monitorBaseline += (m - monitorBaseline) * BASELINE_ALPHA;
    monitorLevel += (deviation - monitorLevel) * LEVEL_ALPHA;

    if (monitorLevel >= threshold) {
      if (monitorArmed) {
        monitorArmed = false;
        if (armedPad) triggerPad(armedPad, "tap");
        else dmArmedStatus.textContent = "Table tap detected -- hold a pad down to hear it next time.";
      }
    } else {
      monitorArmed = true;
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
