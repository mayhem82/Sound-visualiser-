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

  let audioCtx, analyser, freqData, timeData, source, stream, nyquist;
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
  let flashSpeed = 0.5; // 0 (slow) .. 1 (fast strobe)
  let beatCooldownMs = 180;
  let minFlashMs = 50;
  let maxFlashMs = 160;
  let dimFlickerEnabled = false;
  let screenFlashEnabled = false;
  let torchInverted = false; // false: off, flashes on beat. true: on, cuts on beat.
  const BEAT_HISTORY_LEN = 40;
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

    if (flashEnabled || screenFlashEnabled) detectBeat();
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
      fireBeatEffects(strength);
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
      flashScreen(beatColor(strength), duration, strength);
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
  }

  startBtn.addEventListener("click", startAudio);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  flashBtn.addEventListener("click", toggleFlash);
  sensitivitySlider.addEventListener("input", updateSensitivity);
  speedSlider.addEventListener("input", updateFlashSpeed);
  dimToggle.addEventListener("change", () => {
    dimFlickerEnabled = dimToggle.checked;
  });
  invertToggle.addEventListener("change", async () => {
    torchInverted = invertToggle.checked;
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
  updateSensitivity();
  updateFlashSpeed();
  updateFreqRange("low");

  // Tap the empty screen to hide/show the menu; double-tap to black out
  // the screen. Beat detection and effects (torch/vibrate/screen flash)
  // keep running underneath either way — only the visuals are hidden.
  const DOUBLE_TAP_MS = 300;
  let singleTapTimer = null;
  let lastTapAt = 0;

  function isMenuTarget(el) {
    return !!(el && el.closest && el.closest("#hud, #overlay, .flash-status"));
  }

  function toggleHud() {
    hud.classList.toggle("hide");
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
