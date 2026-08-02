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
  const micModeBtn = document.getElementById("micModeBtn");
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
  const syncDelaySlider = document.getElementById("syncDelaySlider");
  const syncDelayLabel = document.getElementById("syncDelayLabel");
  const connectTabletBtn = document.getElementById("connectTabletBtn");
  const cameraBgBtn = document.getElementById("cameraBgBtn");
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const nebulaBtn = document.getElementById("nebulaBtn");
  const cameraFeed = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const colourVisionBtn = document.getElementById("colourVisionBtn");
  const colourVisionFlashBtn = document.getElementById("colourVisionFlashBtn");
  const blendWrap = document.getElementById("blendWrap");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const cvdTypeWrap = document.getElementById("cvdTypeWrap");
  const cvdTypeSelect = document.getElementById("cvdTypeSelect");
  const cvdStrengthWrap = document.getElementById("cvdStrengthWrap");
  const cvdStrengthSlider = document.getElementById("cvdStrengthSlider");
  const cvdStrengthLabel = document.getElementById("cvdStrengthLabel");
  const spreadWrap = document.getElementById("spreadWrap");
  const spreadSlider = document.getElementById("spreadSlider");
  const spreadLabel = document.getElementById("spreadLabel");
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const pointsCount = document.getElementById("pointsCount");
  const rotateBtn = document.getElementById("rotateBtn");
  const choosePanel = document.getElementById("choosePanel");
  const chooseAimBtn = document.getElementById("chooseAimBtn");
  const colourPickerInput = document.getElementById("colourPickerInput");
  const presetGrid = document.getElementById("presetGrid");
  const closeChooseBtn = document.getElementById("closeChooseBtn");
  const reticleLayer = document.getElementById("reticleLayer");
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
  const viewerPanel = document.getElementById("viewerPanel");
  const startShareBtn = document.getElementById("startShareBtn");
  const shareCodeBlock = document.getElementById("shareCodeBlock");
  const shareRoomCode = document.getElementById("shareRoomCode");
  const shareViewUrlText = document.getElementById("shareViewUrlText");
  const viewerStatus = document.getElementById("viewerStatus");
  const closeViewerPanelBtn = document.getElementById("closeViewerPanelBtn");
  const viewerConnectedBadge = document.getElementById("viewerConnectedBadge");

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

  // Public, no-signup STUN server — needed for NAT traversal even between
  // devices on the same wifi network in many router configurations. No
  // TURN relay is configured, so very restrictive networks can still
  // block the connection.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  let audioCtx, analyser, freqData, timeData, source, stream, nyquist;
  // Default getUserMedia constraints apply echo cancellation & noise
  // suppression tuned for speech, which treats music playing from this
  // device's own speaker as "echo" and suppresses it — so it picks up a
  // voice fine but not Spotify played out loud. Music mode disables those.
  const MIC_MODE_KEY = "micMusicMode_v1";
  let musicMode = localStorage.getItem(MIC_MODE_KEY) === "1";
  let cameraBackgroundEnabled = false;
  let nebulaEnabled = true;
  let cameraStream = null;
  const CAMERA_DEVICE_KEY = "cameraDeviceId_v1";
  let selectedCameraId = localStorage.getItem(CAMERA_DEVICE_KEY) || "";
  // Declared up here (not down with the rest of the colour-vision state,
  // near where it's used) because resize() — called immediately below —
  // already calls resizeCorrectionCanvas(), which reads correctionCanvas.
  // A let binding referenced before its own declaration line has run
  // throws (temporal dead zone), even though the *function* referencing it
  // is safely hoisted; only actually needs to exist as null this early.
  let correctionCanvas = null, correctionGl = null, correctionProgram = null,
    correctionUniforms = null, correctionQuadBuffer = null, correctionVideoTexture = null;
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
  let syncDelayMs = 0; // delays torch/vibrate/screen flash after beat detection
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
    resizeCorrectionCanvas();
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

    if (flashEnabled || screenFlashEnabled || colourVisionFlashEnabled) detectBeat();
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
      if (syncDelayMs > 0) {
        setTimeout(() => fireBeatEffects(strength), syncDelayMs);
      } else {
        fireBeatEffects(strength);
      }
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
    if (colourVisionFlashEnabled) {
      fireColourVisionFlash(strength);
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
    if (colourVisionFlashEnabled && correctionGl) {
      const rgb = cvHsl2rgb(hue, sat / 100, light / 100);
      const corrected = correctColorViaShader(rgb, 1);
      if (corrected) return cvRgbToCss(corrected);
    }
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
    if (cameraBackgroundEnabled) {
      // A fresh camera frame every draw, rather than the plain background's
      // fade trail — the trail effect is for a background that otherwise
      // never changes on its own; a live camera feed already does that, and
      // redrawing it full-opacity each frame means it never gets muddied by
      // leftover particle glow, only ever the newest frame. Still dimmed
      // over so the particles read clearly against whatever's in view —
      // unless the nebula's hidden, in which case skip the dimming too so
      // the camera (and any colour vision correction on it) shows clean.
      drawCameraBackground();
      if (nebulaEnabled) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(5, 5, 10, 0.35)";
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(5, 5, 10, 0.18)";
      ctx.fillRect(0, 0, width, height);
    }

    // Beat detection and band energy still need to run every frame even
    // with the nebula hidden — colour vision flash mode and the screen
    // flash are still beat-synced without the particles visible.
    computeBandEnergy();

    if (nebulaEnabled) {
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
    }

    if (running) rafId = requestAnimationFrame(draw);
  }

  async function startAudio() {
    startBtn.disabled = true;
    statusEl.textContent = "";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints(), video: false });
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

  function micConstraints() {
    return musicMode
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : true;
  }

  function updateMicModeBtn() {
    micModeBtn.textContent = musicMode ? "Mic mode: Music (Spotify)" : "Mic mode: Voice";
    micModeBtn.classList.toggle("active", musicMode);
    micModeBtn.setAttribute("aria-pressed", String(musicMode));
  }

  async function toggleMicMode() {
    musicMode = !musicMode;
    localStorage.setItem(MIC_MODE_KEY, musicMode ? "1" : "0");
    updateMicModeBtn();

    if (!stream) return; // not started yet — the new mode applies when startAudio() runs

    // Already running: re-request the mic with the new constraints and
    // swap the live stream in, instead of requiring a full restart.
    micModeBtn.disabled = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: micConstraints(),
        video: false
      });
      stream.getTracks().forEach((t) => t.stop());
      stream = newStream;
      source.disconnect();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (err) {
      flashStatus.classList.remove("hide");
      appendFlashStatus("Couldn't switch mic mode: " + (err && err.message ? err.message : err));
    } finally {
      micModeBtn.disabled = false;
    }
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

  // ---- Camera background ("party mode") ----
  // Shows the live camera feed behind the particles instead of a plain
  // dark background — independent of the mic/audio flow, and independent
  // of the separate camera stream requestFlashCapability() opens for the
  // torch (that one never touches a <video> element or gets drawn; this
  // one does).

  function drawCameraBackground() {
    if (!cameraFeed || cameraFeed.readyState < cameraFeed.HAVE_CURRENT_DATA) return;
    const vw = cameraFeed.videoWidth, vh = cameraFeed.videoHeight;
    if (!vw || !vh) return;

    if (colourVisionEnabled && correctionGl) {
      // Colour Vision Assist's full correction (calibrated points + CVD
      // simulation + blend), rendered into an off-screen WebGL canvas from
      // the same cameraFeed, then blitted here — this <video> element only
      // ever has one raw feed, so the corrected version needs somewhere
      // else to be composited before it can be drawn as the background.
      renderCorrectionFrame(vw, vh);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(correctionCanvas, 0, 0, width, height);
      return;
    }

    // "object-fit: cover" crop, same technique as colorvision.js/restore.js
    // use for their own camera view, so the feed fills the screen without
    // stretching regardless of how its aspect ratio compares to the
    // screen's (routinely mismatched in landscape).
    let sx = 0, sy = 0, sw = vw, sh = vh;
    const videoAspect = vw / vh;
    const canvasAspect = width / height;
    if (videoAspect > canvasAspect) {
      sw = vh * canvasAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / canvasAspect;
      sy = (vh - sh) / 2;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(cameraFeed, sx, sy, sw, sh, 0, 0, width, height);
  }

  function cameraConstraints() {
    // A specific saved camera wins; otherwise fall back to "any
    // environment-facing camera", same as before device selection existed.
    return selectedCameraId
      ? { deviceId: { exact: selectedCameraId } }
      : { facingMode: { ideal: "environment" } };
  }

  function onCameraTrackEnded() {
    // Commonly fires when the screen locks or the tab loses focus,
    // which can end the camera connection outright.
    disableCameraBackground();
    appendFlashStatus("Camera background stopped — the camera connection ended.");
    flashStatus.classList.remove("hide");
  }

  async function refreshCameraDeviceList() {
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.enumerateDevices) return;
    let devices;
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (_) {
      return;
    }
    const cameras = devices.filter((d) => d.kind === "videoinput");
    // Labels are only populated once camera permission has been granted at
    // least once — before that every entry is blank, so there's nothing
    // useful to show yet.
    if (cameras.length < 2 || !cameras[0].label) {
      cameraSelectWrap.classList.add("hide");
      return;
    }
    cameraSelect.innerHTML = "";
    cameras.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${i + 1}`;
      cameraSelect.appendChild(opt);
    });
    if (!cameras.some((d) => d.deviceId === selectedCameraId)) {
      // Previously saved camera is gone (or nothing saved yet) — fall back
      // to whichever one actually started, so the dropdown reflects reality
      // instead of silently defaulting to the browser's first list entry.
      selectedCameraId = cameraStream ? cameraStream.getVideoTracks()[0].getSettings().deviceId || "" : "";
    }
    if (selectedCameraId) cameraSelect.value = selectedCameraId;
    cameraSelectWrap.classList.remove("hide");
  }

  async function enableCameraBackground() {
    cameraBgBtn.disabled = true;
    cameraBgBtn.textContent = "Camera background: Starting…";
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
        audio: false
      });
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
      cameraBackgroundEnabled = true;
      cameraBgBtn.textContent = "Camera background: On";
      cameraBgBtn.classList.add("active");
      cameraBgBtn.setAttribute("aria-pressed", "true");
      cameraStream.getVideoTracks()[0].addEventListener("ended", onCameraTrackEnded);
      refreshCameraDeviceList();
    } catch (err) {
      cameraBgBtn.textContent = "Camera background: Off";
      appendFlashStatus("Couldn't start the camera background: " + (err.message || err.name || "unknown error"));
      flashStatus.classList.remove("hide");
    } finally {
      cameraBgBtn.disabled = false;
    }
  }

  function disableCameraBackground() {
    cameraBackgroundEnabled = false;
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    cameraFeed.srcObject = null;
    cameraBgBtn.textContent = "Camera background: Off";
    cameraBgBtn.classList.remove("active");
    cameraBgBtn.setAttribute("aria-pressed", "false");
  }

  async function switchCamera(deviceId) {
    selectedCameraId = deviceId;
    localStorage.setItem(CAMERA_DEVICE_KEY, selectedCameraId);
    if (!cameraBackgroundEnabled) return; // applies next time the camera starts

    cameraSelect.disabled = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
        audio: false
      });
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = newStream;
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();
      cameraStream.getVideoTracks()[0].addEventListener("ended", onCameraTrackEnded);
    } catch (err) {
      appendFlashStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
      flashStatus.classList.remove("hide");
    } finally {
      cameraSelect.disabled = false;
    }
  }

  function toggleCameraBackground() {
    if (cameraBackgroundEnabled) {
      disableCameraBackground();
    } else {
      enableCameraBackground();
    }
  }

  function toggleNebula() {
    nebulaEnabled = !nebulaEnabled;
    nebulaBtn.textContent = nebulaEnabled ? "Nebula: On" : "Nebula: Off";
    // "Active" here means the particles are hidden — the non-default state
    // a user deliberately switched to, same as how other HUD toggles light
    // up when engaged.
    nebulaBtn.classList.toggle("active", !nebulaEnabled);
    nebulaBtn.setAttribute("aria-pressed", String(!nebulaEnabled));
  }

  // ---- Colour Vision Assist, live on the camera background ----
  // The full correction engine from colorvision.html/colorvision.js —
  // calibrated points, colour-blindness-type simulation, blend — applied
  // to the same camera background above instead of navigating away to a
  // separate page. Renders into its own off-screen WebGL canvas (see
  // renderCorrectionFrame / drawCameraBackground above) since cameraFeed
  // only ever holds the one raw feed.
  //
  // Deliberately its own storage key, separate from colorvision.html's
  // (colorvision.js's STORAGE_KEY) — they used to share one calibrated-
  // points list, which meant deleting a colour on one page silently wiped
  // it on the other too. Each page now keeps its own independent set.
  // loadCvPoints() seeds this new key from the old shared one the first
  // time it's read (see below), so switching to independent storage
  // doesn't look like existing colours vanished.

  const MAX_POINTS = 32;
  const CV_STORAGE_KEY = "cvCalibrationPoints_soundNebula_v1";
  const CV_LEGACY_STORAGE_KEY = "cvCalibrationPoints_v1";
  const CV_ROTATE_KEY = "cvRotate180_v1";
  const CV_SPREAD_KEY = "cvSpread_v1";
  const CV_DEFAULT_SPREAD = 4;
  const CV_CVD_TYPE_KEY = "cvCvdType_v1";
  const CV_CVD_STRENGTH_KEY = "cvCvdStrength_v1";
  const CVD_TYPE_CODES = { none: 0, protan: 1, deutan: 2, tritan: 3 };

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

  let colourVisionEnabled = false;
  let points = loadCvPoints();
  let editingPointId = null;
  let frozenColor = null;
  let tuneReturnFocusEl = null;
  let choosePanelReturnFocusEl = null;
  let aiming = false;
  let aimIntervalId = null;
  let selectMode = false;
  let selectedIds = new Set();
  let rotate180 = loadRotatePref();
  let spread = loadSpreadPref();
  let cvdType = loadCvdTypePref();
  let cvdStrength = loadCvdStrengthPref();

  let colourVisionFlashEnabled = false;
  let cvFlashPointIndex = 0;

  // ---- Colour math (mirrors the shader's math for JS-side previews) ----

  function cvRgb2hsl(r, g, b) {
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

  function cvHsl2rgb(h, s, l) {
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

  function cvSrgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function cvRgb2lab(r, g, b) {
    const rl = cvSrgbToLinear(r);
    const gl_ = cvSrgbToLinear(g);
    const bl = cvSrgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function cvApplyCorrection([r, g, b], hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust) {
    let [h, s, l] = cvRgb2hsl(r, g, b);
    h = (h + hueShift + 360) % 360;
    s = Math.min(1, Math.max(0, s + satAdjust));
    l = Math.min(1, Math.max(0, l + lightAdjust));
    let [r1, g1, b1] = cvHsl2rgb(h, s, l);
    const expMul = Math.pow(2, exposureAdjust || 0);
    const contMul = 1 + (contrastAdjust || 0);
    r1 = (r1 * expMul - 0.5) * contMul + 0.5;
    g1 = (g1 * expMul - 0.5) * contMul + 0.5;
    b1 = (b1 * expMul - 0.5) * contMul + 0.5;
    return [cvClamp01(r1), cvClamp01(g1), cvClamp01(b1)];
  }

  function cvClamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function cvRgbToCss([r, g, b]) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  function cvHexToRgb01(hex) {
    const m = hex.replace("#", "");
    const r = parseInt(m.substring(0, 2), 16) / 255;
    const g = parseInt(m.substring(2, 4), 16) / 255;
    const b = parseInt(m.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  // A colour swatch alone doesn't help the people this is for — the whole
  // point is that colour perception can't be trusted, so every swatch also
  // gets a plain-language name from a fixed palette of familiar terms.
  function cvNearestColorName([r, g, b]) {
    const [h, s, l] = cvRgb2hsl(r, g, b);
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

  // ---- Persistence (same keys as colorvision.html) ----

  function loadCvPoints() {
    try {
      const raw = localStorage.getItem(CV_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      return [];
    }
    // CV_STORAGE_KEY has never been written here — either a first-ever run,
    // or the first run since Sound Nebula got its own independent storage.
    // Seed once from whatever's already calibrated under the old shared key
    // (colorvision.html's), then persist immediately under the new key so
    // this only ever runs once: later loads use the new key exclusively,
    // and edits on colorvision.html no longer reach here at all.
    let seeded = [];
    try {
      const legacyRaw = localStorage.getItem(CV_LEGACY_STORAGE_KEY);
      const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
      seeded = Array.isArray(legacyParsed) ? legacyParsed : [];
    } catch (e) { /* legacy data unreadable — start empty rather than fail */ }
    try {
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(seeded));
    } catch (e) { /* storage write failed — still return the in-memory seed */ }
    return seeded;
  }

  function saveCvPoints() {
    try {
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(points));
    } catch (e) {
      cvStatus("Could not save (storage full or unavailable).");
    }
  }

  function loadRotatePref() {
    try {
      return localStorage.getItem(CV_ROTATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveRotatePref() {
    try {
      localStorage.setItem(CV_ROTATE_KEY, rotate180 ? "1" : "0");
    } catch (e) {}
  }

  function loadSpreadPref() {
    try {
      const raw = parseFloat(localStorage.getItem(CV_SPREAD_KEY));
      return Number.isFinite(raw) ? raw : CV_DEFAULT_SPREAD;
    } catch (e) {
      return CV_DEFAULT_SPREAD;
    }
  }

  function saveSpreadPref() {
    try {
      localStorage.setItem(CV_SPREAD_KEY, String(spread));
    } catch (e) {}
  }

  function spreadDescription(value) {
    if (value <= 3) return "Tight";
    if (value <= 10) return "Medium";
    if (value <= 22) return "Wide";
    return "Very wide";
  }

  function loadCvdTypePref() {
    try {
      const raw = localStorage.getItem(CV_CVD_TYPE_KEY);
      return Object.prototype.hasOwnProperty.call(CVD_TYPE_CODES, raw) ? raw : "none";
    } catch (e) {
      return "none";
    }
  }

  function saveCvdTypePref() {
    try {
      localStorage.setItem(CV_CVD_TYPE_KEY, cvdType);
    } catch (e) {}
  }

  function loadCvdStrengthPref() {
    try {
      const raw = parseFloat(localStorage.getItem(CV_CVD_STRENGTH_KEY));
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
    } catch (e) {
      return 1;
    }
  }

  function saveCvdStrengthPref() {
    try {
      localStorage.setItem(CV_CVD_STRENGTH_KEY, String(cvdStrength));
    } catch (e) {}
  }

  function cvStatus(msg) {
    appendFlashStatus(msg);
    flashStatus.classList.remove("hide");
  }

  // ---- WebGL correction shader (identical to colorvision.js's) ----

  const CV_VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    uniform float uRotate180;
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      uv = uv * uUvScale + uUvOffset;
      vUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const CV_FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform float uSpread;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];   // hueShift(deg), satAdjust, lightAdjust
    uniform vec2 uCorrection2[${MAX_POINTS}];  // contrastAdjust, exposureAdjust
    uniform int uCvdType;      // 0=none, 1=protan, 2=deutan, 3=tritan
    uniform float uCvdStrength;

    float srgbToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
    }

    float linearToSrgb(float c) {
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    }

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
        if (totalWeight > 0.0) {
          correction = weightedSum / totalWeight;
          correction2 = weightedSum2 / totalWeight;
        }
      }

      vec3 hsl = rgb2hsl(base);
      hsl.x = mod(hsl.x + correction.x + 360.0, 360.0);
      hsl.y = clamp(hsl.y + correction.y, 0.0, 1.0);
      hsl.z = clamp(hsl.z + correction.z, 0.0, 1.0);
      vec3 corrected = hsl2rgb(hsl);

      float contMul = 1.0 + correction2.x;
      float expMul = pow(2.0, correction2.y);
      corrected = clamp((corrected * expMul - 0.5) * contMul + 0.5, 0.0, 1.0);

      gl_FragColor = vec4(mix(original, corrected, uBlend), 1.0);
    }
  `;

  function cvCompileShader(glCtx, type, src) {
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

  function ensureCorrectionCanvas() {
    if (correctionCanvas) return;
    correctionCanvas = document.createElement("canvas");
    correctionCanvas.width = canvas.width;
    correctionCanvas.height = canvas.height;
    correctionCanvas.style.position = "fixed";
    correctionCanvas.style.left = "-99999px";
    correctionCanvas.style.top = "0";
    document.body.appendChild(correctionCanvas);

    const glCtx = correctionCanvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) ||
      correctionCanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!glCtx) {
      cvStatus("Colour vision correction isn't supported in this browser.");
      return;
    }

    const vs = cvCompileShader(glCtx, glCtx.VERTEX_SHADER, CV_VERT_SRC);
    const fs = cvCompileShader(glCtx, glCtx.FRAGMENT_SHADER, CV_FRAG_SRC);
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
      cvStatus("Colour vision correction failed to start: " + glCtx.getProgramInfoLog(prog));
      return;
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
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);

    correctionGl = glCtx;
    correctionProgram = prog;
    correctionQuadBuffer = qBuf;
    correctionVideoTexture = tex;
    correctionUniforms = {
      uTex: glCtx.getUniformLocation(prog, "uTex"),
      uBlend: glCtx.getUniformLocation(prog, "uBlend"),
      uSpread: glCtx.getUniformLocation(prog, "uSpread"),
      uRotate180: glCtx.getUniformLocation(prog, "uRotate180"),
      uUvScale: glCtx.getUniformLocation(prog, "uUvScale"),
      uUvOffset: glCtx.getUniformLocation(prog, "uUvOffset"),
      uPointCount: glCtx.getUniformLocation(prog, "uPointCount"),
      uSourceLab: glCtx.getUniformLocation(prog, "uSourceLab"),
      uCorrection: glCtx.getUniformLocation(prog, "uCorrection"),
      uCorrection2: glCtx.getUniformLocation(prog, "uCorrection2"),
      uCvdType: glCtx.getUniformLocation(prog, "uCvdType"),
      uCvdStrength: glCtx.getUniformLocation(prog, "uCvdStrength")
    };
    uploadPointUniforms();
  }

  function resizeCorrectionCanvas() {
    if (!correctionCanvas) return;
    correctionCanvas.width = canvas.width;
    correctionCanvas.height = canvas.height;
    correctionGl.viewport(0, 0, correctionCanvas.width, correctionCanvas.height);
  }

  function uploadPointUniforms() {
    if (!correctionGl) return;
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = cvRgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
      corr2Arr[i * 2] = p.contrastAdjust || 0; corr2Arr[i * 2 + 1] = p.exposureAdjust || 0;
    }
    correctionGl.useProgram(correctionProgram);
    correctionGl.uniform1i(correctionUniforms.uPointCount, count);
    correctionGl.uniform3fv(correctionUniforms.uSourceLab, labArr);
    correctionGl.uniform3fv(correctionUniforms.uCorrection, corrArr);
    correctionGl.uniform2fv(correctionUniforms.uCorrection2, corr2Arr);
  }

  // "object-fit: cover" — same technique as colorvision.js/restore.js use
  // for their own camera view, so the feed fills the canvas without
  // stretching regardless of how its aspect ratio compares to the
  // canvas's (routinely mismatched in landscape).
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

  function renderCorrectionFrame(vw, vh) {
    const cover = computeCoverUv(vw, vh, correctionCanvas.width, correctionCanvas.height);
    correctionGl.bindTexture(correctionGl.TEXTURE_2D, correctionVideoTexture);
    correctionGl.texImage2D(correctionGl.TEXTURE_2D, 0, correctionGl.RGBA, correctionGl.RGBA, correctionGl.UNSIGNED_BYTE, cameraFeed);
    correctionGl.uniform1i(correctionUniforms.uTex, 0);
    correctionGl.uniform1f(correctionUniforms.uBlend, parseFloat(blendSlider.value) / 100);
    correctionGl.uniform1f(correctionUniforms.uSpread, spread);
    correctionGl.uniform1f(correctionUniforms.uRotate180, rotate180 ? 1 : 0);
    correctionGl.uniform2f(correctionUniforms.uUvScale, cover.sx, cover.sy);
    correctionGl.uniform2f(correctionUniforms.uUvOffset, cover.ox, cover.oy);
    correctionGl.uniform1i(correctionUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
    correctionGl.uniform1f(correctionUniforms.uCvdStrength, cvdStrength);
    correctionGl.drawArrays(correctionGl.TRIANGLE_STRIP, 0, 4);
  }

  async function enableColourVision() {
    if (!cameraBackgroundEnabled) {
      await enableCameraBackground();
      if (!cameraBackgroundEnabled) return; // camera failed to start
    }
    ensureCorrectionCanvas();
    if (!correctionGl) return;
    colourVisionEnabled = true;
    colourVisionBtn.textContent = "Colour vision: On";
    colourVisionBtn.classList.add("active");
    colourVisionBtn.setAttribute("aria-pressed", "true");
    [blendWrap, cvdTypeWrap, spreadWrap, calibrateBtn, pointsBtn, rotateBtn].forEach((el) => el.classList.remove("hide"));
    cvdStrengthWrap.classList.toggle("hide", cvdType === "none");
  }

  function disableColourVision() {
    if (colourVisionFlashEnabled) disableColourVisionFlash();
    colourVisionEnabled = false;
    colourVisionBtn.textContent = "Colour vision: Off";
    colourVisionBtn.classList.remove("active");
    colourVisionBtn.setAttribute("aria-pressed", "false");
    [blendWrap, cvdTypeWrap, cvdStrengthWrap, spreadWrap, calibrateBtn, pointsBtn, rotateBtn].forEach((el) => el.classList.add("hide"));
    hideCvOverlayPanels();
  }

  function toggleColourVision() {
    if (colourVisionEnabled) disableColourVision();
    else enableColourVision();
  }

  // ---- Colour vision flash mode ----
  // On each beat, alternates the camera background (and the beat screen
  // flash) between the true camera view and one saved calibration point's
  // correction shown in isolation — a different point each time a
  // correction beat comes around — so consecutive corrected beats are
  // never the same point twice in a row and every point gets its own
  // dedicated true-colour beat as a break in between.

  // Re-uploads the correction shader's point uniforms restricted to a
  // single point (uPointCount=1) instead of the full calibrated set, so
  // its correction applies uniformly across the frame with no blending
  // against any other point — isolating exactly what that one point does.
  function uploadSinglePointUniforms(point) {
    if (!correctionGl) return;
    const [L, A, B] = cvRgb2lab(point.sourceColor[0], point.sourceColor[1], point.sourceColor[2]);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    labArr[0] = L; labArr[1] = A; labArr[2] = B;
    corrArr[0] = point.hueShift; corrArr[1] = point.satAdjust; corrArr[2] = point.lightAdjust;
    corr2Arr[0] = point.contrastAdjust || 0; corr2Arr[1] = point.exposureAdjust || 0;
    correctionGl.useProgram(correctionProgram);
    correctionGl.uniform1i(correctionUniforms.uPointCount, 1);
    correctionGl.uniform3fv(correctionUniforms.uSourceLab, labArr);
    correctionGl.uniform3fv(correctionUniforms.uCorrection, corrArr);
    correctionGl.uniform2fv(correctionUniforms.uCorrection2, corr2Arr);
  }

  async function enableColourVisionFlash() {
    if (!colourVisionEnabled) {
      await enableColourVision();
      if (!colourVisionEnabled) return; // colour vision failed to start
    }
    if (points.length === 0) {
      cvStatus("Calibrate at least one colour point first — flash mode alternates between them.");
      return;
    }
    colourVisionFlashEnabled = true;
    cvFlashPointIndex = 0;
    uploadSinglePointUniforms(points[cvFlashPointIndex]);
    // Show the corrected view immediately, not whichever value the blend
    // slider was left at (e.g. 0/true from a previous disableColourVisionFlash)
    // — otherwise the live camera stays on the true/raw view until the
    // first beat flips it.
    blendSlider.value = "100";
    blendLabel.textContent = "100%";
    // Locked while flash mode is on so it can't be manually dragged back to
    // a true/uncorrected view — flash mode's whole point is never showing it.
    blendSlider.disabled = true;
    colourVisionFlashBtn.textContent = "Colour vision flash mode: On";
    colourVisionFlashBtn.classList.add("active");
    colourVisionFlashBtn.setAttribute("aria-pressed", "true");
  }

  function disableColourVisionFlash() {
    colourVisionFlashEnabled = false;
    colourVisionFlashBtn.textContent = "Colour vision flash mode: Off";
    colourVisionFlashBtn.classList.remove("active");
    colourVisionFlashBtn.setAttribute("aria-pressed", "false");
    blendSlider.disabled = false;
    blendSlider.value = "0";
    blendLabel.textContent = "0%";
    // Restore the normal calibrated view — every saved point blended
    // together by Lab distance — instead of leaving the shader pinned to
    // whichever single point flash mode last isolated.
    uploadPointUniforms();
  }

  function toggleColourVisionFlash() {
    if (colourVisionFlashEnabled) disableColourVisionFlash();
    else enableColourVisionFlash();
  }

  function fireColourVisionFlash(strength) {
    if (!colourVisionFlashEnabled || !correctionGl || points.length === 0) return;

    // Advance to the next saved point on every beat so consecutive beats
    // never repeat the same one — always shown corrected/isolated, never
    // alternating back to the true/raw camera view.
    cvFlashPointIndex = (cvFlashPointIndex + 1) % points.length;
    uploadSinglePointUniforms(points[cvFlashPointIndex]);

    blendSlider.value = "100";
    blendLabel.textContent = "100%";
  }

  // Runs a single RGB colour through the same correction/CVD shader used
  // for the live camera feed, via a 1x1 texture — this avoids
  // reimplementing the daltonize matrix math a second time in JS, where a
  // transcription slip would silently produce wrong colours.
  function correctColorViaShader([r, g, b], blendOverride) {
    if (!correctionGl) return null;
    const glCtx = correctionGl;
    glCtx.useProgram(correctionProgram);
    glCtx.bindTexture(glCtx.TEXTURE_2D, correctionVideoTexture);
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, false);
    const px = new Uint8Array([
      Math.round(cvClamp01(r) * 255),
      Math.round(cvClamp01(g) * 255),
      Math.round(cvClamp01(b) * 255),
      255
    ]);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, 1, 1, 0, glCtx.RGBA, glCtx.UNSIGNED_BYTE, px);
    glCtx.uniform1i(correctionUniforms.uTex, 0);
    glCtx.uniform1f(correctionUniforms.uBlend, blendOverride);
    glCtx.uniform1f(correctionUniforms.uSpread, spread);
    glCtx.uniform1f(correctionUniforms.uRotate180, 0);
    glCtx.uniform2f(correctionUniforms.uUvScale, 1, 1);
    glCtx.uniform2f(correctionUniforms.uUvOffset, 0, 0);
    glCtx.uniform1i(correctionUniforms.uCvdType, CVD_TYPE_CODES[cvdType]);
    glCtx.uniform1f(correctionUniforms.uCvdStrength, cvdStrength);
    glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);

    const out = new Uint8Array(4);
    glCtx.readPixels(0, 0, 1, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, out);
    // Reset for renderCorrectionFrame(), which relies on flipped Y for
    // the real camera texture.
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    return [out[0] / 255, out[1] / 255, out[2] / 255];
  }

  // ---- Sampling for calibration ----
  // Averages a small patch from the raw video frame (not the shader's
  // corrected output) so calibration is always anchored to the real colour.

  const SAMPLE_SIZE = 12;

  function sampleCenterColor() {
    if (cameraFeed.readyState < cameraFeed.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    sampleCanvas.width = 64;
    sampleCanvas.height = 64;
    const vw = cameraFeed.videoWidth, vh = cameraFeed.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.15;
    const sx = vw / 2 - cropSize / 2;
    const sy = vh / 2 - cropSize / 2;
    sampleCtx.drawImage(cameraFeed, sx, sy, cropSize, cropSize, 0, 0, 64, 64);
    const data = sampleCtx.getImageData(24, 24, SAMPLE_SIZE, SAMPLE_SIZE).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return [r / n / 255, g / n / 255, b / n / 255];
  }

  function startAiming() {
    aiming = true;
    reticleLayer.classList.remove("hide");
    aimIntervalId = setInterval(() => {
      const c = sampleCenterColor();
      reticleSwatch.style.background = cvRgbToCss(c);
      reticleColorName.textContent = cvNearestColorName(c);
    }, 120);
    cancelAimBtn.focus();
  }

  function stopAiming() {
    aiming = false;
    reticleLayer.classList.add("hide");
    if (aimIntervalId) { clearInterval(aimIntervalId); aimIntervalId = null; }
    calibrateBtn.focus();
  }

  // ---- Tune / choose / saved-colours panels ----
  // Share a z-index with the tablet-viewer panel and each other, so only
  // one is ever open at a time.

  function hideCvOverlayPanels() {
    tunePanel.classList.add("hide");
    pointsPanel.classList.add("hide");
    choosePanel.classList.add("hide");
    viewerPanel.classList.add("hide");
  }

  function openTuneForNewPoint(sourceColor) {
    hideCvOverlayPanels();
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
    hideCvOverlayPanels();
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
    const corrected = cvApplyCorrection(frozenColor, hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust);
    swatchOriginal.style.background = cvRgbToCss(frozenColor);
    swatchCorrected.style.background = cvRgbToCss(corrected);
    swatchOriginalName.textContent = cvNearestColorName(frozenColor);
    swatchCorrectedName.textContent = cvNearestColorName(corrected);
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

  function saveCvPoint() {
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
        cvStatus(`Limit of ${MAX_POINTS} saved colours reached — delete one to add another.`);
        return;
      }
      points.push({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: labelInput.value.trim(),
        sourceColor: frozenColor,
        hueShift, satAdjust, lightAdjust, contrastAdjust, exposureAdjust
      });
    }
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function deleteCurrentCvPoint() {
    if (!editingPointId) return;
    points = points.filter((p) => p.id !== editingPointId);
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function updatePointsCount() {
    pointsCount.textContent = String(points.length);
  }

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
      const colorName = cvNearestColorName(p.sourceColor);
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
      sw.style.background = cvRgbToCss(p.sourceColor);
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
    saveCvPoints();
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
    saveCvPoints();
    uploadPointUniforms();
    updatePointsCount();
    setSelectMode(false);
  }

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
        openTuneForNewPoint(cvHexToRgb01(preset.hex));
      });
      presetGrid.appendChild(card);
    });
  }

  function openChoosePanel() {
    hideCvOverlayPanels();
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

  function closePointsPanel() {
    pointsPanel.classList.add("hide");
    importExportStatus.textContent = "";
    pointsBtn.focus();
  }

  // ---- Export / import ----

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

  function cvDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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
    cvDownloadBlob(blob, `colour-vision-calibration-${new Date().toISOString().slice(0, 10)}.json`);
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
      saveCvPoints();
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

    refreshCameraDeviceList(); // permission just granted — labels may now be readable

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

  function updateSyncDelay() {
    syncDelayMs = Number(syncDelaySlider.value);
    syncDelayLabel.textContent = `${syncDelayMs} ms`;
  }

  // ---- Tablet viewer (WebRTC, signaled over public MQTT relays) ----
  // Streams this same stage canvas to a second device (e.g. a tablet or
  // TV) as a read-only viewer — same room-code pairing pattern as
  // colorvision.js/restore.js's "Connect tablet" feature (and viewer.html
  // is the same generic viewer page; a single stream here just lands in
  // its plain single-pane fallback, since there's no original/corrected
  // pair to compare for a visualiser).

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
  }

  function updateViewerConnectedBadge() {
    const anyConnected = Array.from(broadcastShare.peers.values()).some(
      (entry) => entry.pc && entry.pc.connectionState === "connected"
    );
    viewerConnectedBadge.classList.toggle("hide", !anyConnected);
    if (anyConnected) viewerStatus.textContent = "Tablet connected.";
  }

  async function ensureBroadcastPeerFor(viewerId) {
    if (broadcastShare.peers.has(viewerId)) return; // dedupe repeated viewer-here / multi-broker echoes
    if (typeof canvas.captureStream !== "function") {
      viewerStatus.textContent = "Viewer streaming isn't supported in this browser.";
      return;
    }
    const entry = { pc: null };
    broadcastShare.peers.set(viewerId, entry);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    entry.pc = pc;
    const canvasStream = canvas.captureStream(30);
    canvasStream.getTracks().forEach((t) => pc.addTrack(t, canvasStream));

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
        correctedStreamId: canvasStream.id
      }, { qos: 1 });
    } catch (err) {
      broadcastShare.peers.delete(viewerId);
      viewerStatus.textContent = "Couldn't connect to the other device: " + (err.message || err.name || "unknown error");
    }
  }

  async function handleBroadcastAnswer(msg) {
    const entry = broadcastShare.peers.get(msg.from);
    if (!entry || !entry.pc) return;
    if (entry.pc.signalingState !== "have-local-offer") return; // dedupe: already answered / stale
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
    viewerStatus.textContent = message || "";
    startShareBtn.textContent = "Start live sharing";
    startShareBtn.disabled = false;
  }

  async function startTabletShare() {
    startShareBtn.disabled = true;
    viewerStatus.textContent = "Connecting to relay…";
    const room = makeRoomCode();
    broadcastShare.room = room;

    try {
      await connectBroadcastSignaling(room);
    } catch (err) {
      viewerStatus.textContent = err.message || "Couldn't start live sharing.";
      broadcastShare.room = null;
      startShareBtn.disabled = false;
      return;
    }

    broadcastShare.active = true;
    shareRoomCode.textContent = room;
    const viewUrl = new URL("viewer.html", location.href);
    viewUrl.searchParams.set("room", room);
    shareViewUrlText.textContent = viewUrl.toString();
    shareCodeBlock.classList.remove("hide");
    viewerStatus.textContent = "Waiting for the other device to connect…";
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

  // Mobile browsers throttle requestAnimationFrame hard (often to ~1fps or
  // less) in a tab that isn't the active/foreground one — which is exactly
  // the render loop that feeds the shared canvas, so backgrounding this
  // tab (e.g. switching to the viewer in a second tab on the same phone)
  // makes the connected viewer's screen freeze or go blank even though the
  // WebRTC connection itself is still "connected". Surfacing that here is
  // the most this page can do about it — there's no way for a background
  // tab to force full-rate rendering.
  document.addEventListener("visibilitychange", () => {
    if (!broadcastShare.active) return;
    if (document.hidden) {
      viewerStatus.textContent = "This tab is in the background — the shared view will freeze until it's active again.";
    } else {
      const anyConnected = Array.from(broadcastShare.peers.values()).some(
        (entry) => entry.pc && entry.pc.connectionState === "connected"
      );
      viewerStatus.textContent = anyConnected ? "Tablet connected." : "Waiting for a tablet to connect…";
      updateViewerConnectedBadge();
    }
  });

  function openViewerPanel() {
    hideCvOverlayPanels();
    viewerPanel.classList.remove("hide");
    closeViewerPanelBtn.focus();
  }

  function closeViewerPanel() {
    viewerPanel.classList.add("hide");
    connectTabletBtn.focus();
  }

  startBtn.addEventListener("click", startAudio);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  micModeBtn.addEventListener("click", toggleMicMode);
  updateMicModeBtn();
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
  syncDelaySlider.addEventListener("input", updateSyncDelay);
  cameraBgBtn.addEventListener("click", toggleCameraBackground);
  cameraSelect.addEventListener("change", () => switchCamera(cameraSelect.value));
  if ("mediaDevices" in navigator && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", refreshCameraDeviceList);
  }
  nebulaBtn.addEventListener("click", toggleNebula);
  connectTabletBtn.addEventListener("click", openViewerPanel);
  startShareBtn.addEventListener("click", toggleTabletShare);
  closeViewerPanelBtn.addEventListener("click", closeViewerPanel);
  updateSensitivity();
  updateFlashSpeed();
  updateFreqRange("low");
  updateSyncDelay();

  // ---- Colour vision wiring ----

  colourVisionBtn.addEventListener("click", toggleColourVision);
  colourVisionFlashBtn.addEventListener("click", toggleColourVisionFlash);

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

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveRotatePref();
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
    openTuneForNewPoint(cvHexToRgb01(colourPickerInput.value));
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
  savePointBtn.addEventListener("click", saveCvPoint);
  deletePointBtn.addEventListener("click", deleteCurrentCvPoint);
  closeTuneBtn.addEventListener("click", closeTunePanel);

  pointsBtn.addEventListener("click", () => {
    hideCvOverlayPanels();
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
    } else if (aiming) {
      stopAiming();
    }
  });

  updatePointsCount();
  blendLabel.textContent = `${blendSlider.value}%`;
  spreadSlider.value = String(spread);
  spreadLabel.textContent = spreadDescription(spread);
  rotateBtn.classList.toggle("active", rotate180);
  cvdTypeSelect.value = cvdType;
  cvdStrengthSlider.value = String(Math.round(cvdStrength * 100));
  cvdStrengthLabel.textContent = `${cvdStrengthSlider.value}%`;

  // Tap the empty screen to hide/show the menu; double-tap to black out
  // the screen. Beat detection and effects (torch/vibrate/screen flash)
  // keep running underneath either way — only the visuals are hidden.
  const DOUBLE_TAP_MS = 300;
  let singleTapTimer = null;
  let lastTapAt = 0;

  function isMenuTarget(el) {
    return !!(el && el.closest && el.closest(
      "#hud, #overlay, .flash-status, #viewerPanel, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel"
    ));
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
