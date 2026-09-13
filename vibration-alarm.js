(() => {
  "use strict";

  // Vibration Alarm -- arm it, and the first vibration past the
  // sensitivity threshold latches a real, looping alarm sound on until
  // manually silenced. Not a one-shot trigger like the drum machine's
  // taps: a security-style alarm should stay sounding even after the
  // disturbance itself has stopped, until a person acknowledges it.
  //
  // The baseline/threshold approach is the same one Vibration Scan's
  // passive monitor and the drum machine use (an EMA rest baseline that
  // only drifts while not spiking).
  //
  // See the caveat in the UI: this only works while the tab stays open,
  // unlocked, and foregrounded -- mobile browsers throttle or fully
  // suspend background tabs, silently stopping detection. Not a real
  // security system.

  const BASELINE_ALPHA = 0.02;
  const LEVEL_ALPHA = 0.5;
  const MIN_THRESHOLD = 0.15; // m/s^2 at sensitivity 100 (most sensitive)
  const MAX_THRESHOLD = 5;    // m/s^2 at sensitivity 1 (least sensitive)

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const vaSupportHint = document.getElementById("vaSupportHint");

  const vaMain = document.getElementById("vaMain");
  const vaStatus = document.getElementById("vaStatus");
  const motionPill = document.getElementById("motionPill");
  const motionPillText = document.getElementById("motionPillText");
  const armPill = document.getElementById("armPill");
  const armPillText = document.getElementById("armPillText");
  const vaAlarmBanner = document.getElementById("vaAlarmBanner");
  const vaAlarmText = document.getElementById("vaAlarmText");

  const armBtn = document.getElementById("armBtn");
  const silenceBtn = document.getElementById("silenceBtn");
  const testBtn = document.getElementById("testBtn");

  const vaSoundSelect = document.getElementById("vaSoundSelect");
  const vaFileWrap = document.getElementById("vaFileWrap");
  const vaFileInput = document.getElementById("vaFileInput");
  const vaFileStatus = document.getElementById("vaFileStatus");

  const vaSensitivitySlider = document.getElementById("vaSensitivitySlider");
  const vaVolumeSlider = document.getElementById("vaVolumeSlider");
  const vaMotionUnsupportedHint = document.getElementById("vaMotionUnsupportedHint");

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const hasAudio = typeof AudioContextCtor === "function";
  const hasMotion = typeof window.DeviceMotionEvent !== "undefined";

  if (!hasAudio || !hasMotion) {
    const missing = [];
    if (!hasAudio) missing.push("Web Audio");
    if (!hasMotion) missing.push("a motion sensor");
    vaSupportHint.textContent = `This browser/device doesn't expose ${missing.join(" or ")} -- Vibration Alarm needs both.`;
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }

  let audioCtx = null;
  let motionListening = false;
  let motionPermissionAsked = false;
  let armed = false;
  let alarmActive = false;
  let monitorBaseline = null;
  let monitorLevel = 0;

  let soundSource = "siren"; // "siren" | "custom"
  let customBuffer = null;
  let customFileName = "";

  // ---- Siren (Web Audio) -- same "modulate an oscillator's frequency
  // with an LFO" wail technique Colour Alarm's siren uses, adapted here
  // rather than shared since it's the only other page that needs one.
  let sirenOsc = null, sirenLfo = null, sirenLfoGain = null, sirenGain = null;

  function ensureSiren() {
    if (sirenOsc) return;
    sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = "sawtooth";
    sirenOsc.frequency.value = 900;
    sirenLfo = audioCtx.createOscillator();
    sirenLfo.type = "sine";
    sirenLfo.frequency.value = 0.8; // one full wail cycle every 1.25s
    sirenLfoGain = audioCtx.createGain();
    sirenLfoGain.gain.value = 350; // sweep +-350Hz around the 900Hz centre
    sirenLfo.connect(sirenLfoGain);
    sirenLfoGain.connect(sirenOsc.frequency);
    sirenGain = audioCtx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(audioCtx.destination);
    sirenOsc.start();
    sirenLfo.start();
  }

  // ---- Custom file playback ----
  let customSourceNode = null;
  let customGain = null;

  function stopCustomPlayback() {
    if (customSourceNode) {
      try { customSourceNode.stop(); } catch (e) {}
      customSourceNode.disconnect();
      customSourceNode = null;
    }
  }

  function startCustomPlayback() {
    if (!customBuffer) return;
    stopCustomPlayback();
    customSourceNode = audioCtx.createBufferSource();
    customSourceNode.buffer = customBuffer;
    customSourceNode.loop = true;
    customGain = audioCtx.createGain();
    customGain.gain.value = Number(vaVolumeSlider.value) / 100;
    customSourceNode.connect(customGain).connect(audioCtx.destination);
    customSourceNode.start();
  }

  function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function startSound() {
    ensureAudio();
    if (soundSource === "custom" && customBuffer) {
      startCustomPlayback();
    } else {
      ensureSiren();
      if (audioCtx.state === "suspended") audioCtx.resume();
      sirenGain.gain.setTargetAtTime(Number(vaVolumeSlider.value) / 100, audioCtx.currentTime, 0.05);
    }
  }

  function stopSound() {
    if (sirenGain) sirenGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
    stopCustomPlayback();
  }

  vaVolumeSlider.addEventListener("input", () => {
    if (customGain) customGain.gain.value = Number(vaVolumeSlider.value) / 100;
    if (sirenGain && alarmActive) sirenGain.gain.setTargetAtTime(Number(vaVolumeSlider.value) / 100, audioCtx.currentTime, 0.05);
  });

  vaSoundSelect.addEventListener("change", () => {
    soundSource = vaSoundSelect.value;
    vaFileWrap.classList.toggle("hide", soundSource !== "custom");
    if (soundSource === "custom" && !customBuffer) {
      vaFileStatus.textContent = "Pick an audio file below.";
    }
  });

  vaFileInput.addEventListener("change", async () => {
    const file = vaFileInput.files[0];
    if (!file) return;
    vaFileStatus.textContent = `Decoding ${file.name}...`;
    try {
      ensureAudio();
      const arrayBuffer = await file.arrayBuffer();
      customBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      customFileName = file.name;
      vaFileStatus.textContent = `Ready: ${customFileName} (${customBuffer.duration.toFixed(1)}s, loops).`;
    } catch (e) {
      customBuffer = null;
      vaFileStatus.textContent = `Couldn't decode "${file.name}" -- try a different file.`;
    }
  });

  // ---- Arm / disarm / alarm state ----

  function setArmed(next) {
    armed = next;
    armBtn.textContent = armed ? "Disarm" : "Arm";
    armPill.className = armed ? "dmx-pill connected" : "dmx-pill";
    armPillText.textContent = armed ? "Armed" : "Disarmed";
    if (!armed) setAlarmActive(false);
    monitorBaseline = null;
    monitorLevel = 0;
  }

  function setAlarmActive(next) {
    alarmActive = next;
    silenceBtn.classList.toggle("hide", !alarmActive);
    vaAlarmBanner.classList.toggle("hide", !alarmActive);
    if (alarmActive) {
      vaAlarmText.textContent = "ALARM -- vibration detected";
      armPill.className = "dmx-pill error";
      armPillText.textContent = "ALARM";
      startSound();
    } else {
      stopSound();
      if (armed) {
        armPill.className = "dmx-pill connected";
        armPillText.textContent = "Armed";
      }
    }
  }

  armBtn.addEventListener("click", () => setArmed(!armed));
  silenceBtn.addEventListener("click", () => setAlarmActive(false));

  let testTimeoutId = null;
  testBtn.addEventListener("click", () => {
    ensureAudio();
    startSound();
    vaStatus.textContent = "Testing sound...";
    if (testTimeoutId) clearTimeout(testTimeoutId);
    testTimeoutId = setTimeout(() => {
      if (!alarmActive) stopSound();
      vaStatus.textContent = "";
      testTimeoutId = null;
    }, 3000);
  });

  function sensitivityThreshold() {
    const s = Math.max(1, Math.min(100, Number(vaSensitivitySlider.value)));
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

    if (armed && !alarmActive && monitorLevel >= threshold) {
      setAlarmActive(true);
    }
  }

  async function startMotionListening() {
    if (motionListening) return;
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
    vaMain.classList.remove("hide");
    ensureAudio();
    await startMotionListening();
    if (window.WakeLockHelper) window.WakeLockHelper.enable();
  });
})();
