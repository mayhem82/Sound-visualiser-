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

  const BANDS = [
    { name: "bass", from: 0, to: 0.08, hue: 262, count: 90 },   // violet
    { name: "mid", from: 0.08, to: 0.32, hue: 189, count: 90 }, // cyan
    { name: "treble", from: 0.32, to: 0.85, hue: 330, count: 90 } // pink
  ];

  let audioCtx, analyser, freqData, timeData, source, stream;
  let width, height, cx, cy, dpr;
  let particles = [];
  let running = false;
  let rafId = null;
  let smoothedVolume = 0;
  const bandEnergy = { bass: 0, mid: 0, treble: 0 };
  const bandEnergySmoothed = { bass: 0, mid: 0, treble: 0 };

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
    analyser.smoothingTimeConstant = 0.8;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);

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

  startBtn.addEventListener("click", startAudio);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
})();
