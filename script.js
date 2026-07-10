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
  const flashBtn = document.getElementById("flashBtn");
  const flashStatus = document.getElementById("flashStatus");
  const sensitivitySlider = document.getElementById("sensitivitySlider");

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

  let audioCtx, analyser, freqData, timeData, source, stream;
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
  let sensitivity = 0.5; // 0 (least sensitive) .. 1 (most sensitive)
  const BEAT_COOLDOWN_MS = 180;
  const BEAT_HISTORY_LEN = 40;

  function lerp(a, b, t) { return a + (b - a) * t; }

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

    if (flashEnabled) detectBeat();
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
      now - lastBeatAt > BEAT_COOLDOWN_MS;

    if (isBeat) {
      lastBeatAt = now;
      fireBeatEffects();
    }
  }

  function fireBeatEffects() {
    if (vibrateSupported) {
      try { navigator.vibrate(35); } catch (_) { /* ignore */ }
    }
    if (torchSupported && torchTrack && !torchBusy) {
      pulseTorch();
    }
  }

  function pulseTorch() {
    torchBusy = true;
    setTorchConstraint(true).then(() => {
      setTimeout(() => {
        setTorchConstraint(false).finally(() => {
          torchBusy = false;
        });
      }, 90);
    }).catch(() => {
      torchBusy = false;
    });
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
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5, 5, 10, 0.18)";
    ctx.fillRect(0, 0, width, height);

    computeBandEnergy();

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

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      const hue = p.band.hue + p.hueOffset;
      grad.addColorStop(0, `hsla(${hue}, 90%, 70%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (running) rafId = requestAnimationFrame(draw);
  }

  async function startAudio() {
    startBtn.disabled = true;
    statusEl.textContent = "";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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

    const nyquist = audioCtx.sampleRate / 2;
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
    rafId = requestAnimationFrame(draw);
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

  async function requestFlashCapability() {
    flashStatus.classList.remove("hide");

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      appendFlashStatus(
        "Camera flash isn't available in this browser." +
          (vibrateSupported ? " Vibrate-only mode armed." : "")
      );
      return;
    }

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      const track = camStream.getVideoTracks()[0];
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
    } catch (err) {
      appendFlashStatus(
        "Couldn't access the camera for flash: " +
          (err && err.message ? err.message : err) +
          (vibrateSupported ? " Vibrate-only mode armed." : "")
      );
    }
  }

  function appendFlashStatus(text) {
    flashStatus.textContent = text;
  }

  async function toggleFlash() {
    flashEnabled = !flashEnabled;
    if (flashEnabled && !torchSupported) {
      // First arm, or a previous arm was lost — (re)request the camera.
      await requestFlashCapability();
    }
    flashBtn.textContent = "Flash + vibrate on beat: " + (flashEnabled ? "On" : "Off");
    flashBtn.classList.toggle("active", flashEnabled);
    if (!flashEnabled && torchTrack) setTorchConstraint(false).catch(() => {});
  }

  function updateSensitivity() {
    sensitivity = Number(sensitivitySlider.value) / 100;
  }

  startBtn.addEventListener("click", startAudio);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  flashBtn.addEventListener("click", toggleFlash);
  sensitivitySlider.addEventListener("input", updateSensitivity);
  updateSensitivity();
})();
