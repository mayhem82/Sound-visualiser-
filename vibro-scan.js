(() => {
  "use strict";

  // Vibration Scan — a comparative aid only, never a validated crack/defect
  // detector. See the caveat in the UI (and in the README) for why: the
  // phone's own vibration motor has no amplitude/frequency control
  // (navigator.vibrate is a crude on/off duration, nothing richer), and the
  // accelerometer reading afterward is dominated by contact pressure/angle,
  // not by whatever it's pressed against. All this can honestly do is flag
  // a point whose reading differs from its recent neighbours.

  const LOG_KEY = "vibroScanLog_v1";
  const PRE_WINDOW_MS = 150;   // rest baseline sampled just before the pulse
  const POST_WINDOW_MS = 900;  // response window sampled after the pulse
  const TAIL_MS = 300;         // trailing slice of the response window used as "residual"
  const PULSE_MS = 60;
  const FLAG_STDDEV_MULT = 1.5;
  const MIN_POINTS_FOR_FLAGGING = 3;

  const overlay = document.getElementById("overlay");
  const panel = document.getElementById("panel");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const vsSupportHint = document.getElementById("vsSupportHint");

  const vsMain = document.getElementById("vsMain");
  const vsStatus = document.getElementById("vsStatus");
  const vsUnsupportedHint = document.getElementById("vsUnsupportedHint");

  const motionPill = document.getElementById("motionPill");
  const motionPillText = document.getElementById("motionPillText");
  const vibratePill = document.getElementById("vibratePill");
  const vibratePillText = document.getElementById("vibratePillText");
  const motionToggleBtn = document.getElementById("motionToggleBtn");

  const pulseBtn = document.getElementById("pulseBtn");
  const pulseStatus = document.getElementById("pulseStatus");
  const clearLogBtn = document.getElementById("clearLogBtn");
  const exportLogBtn = document.getElementById("exportLogBtn");

  const vsLogEmptyHint = document.getElementById("vsLogEmptyHint");
  const vsLogTableWrap = document.getElementById("vsLogTableWrap");
  const vsLogBody = document.getElementById("vsLogBody");

  const hasMotion = typeof window.DeviceOrientationEvent !== "undefined" || typeof window.DeviceMotionEvent !== "undefined";
  const hasVibrate = typeof navigator.vibrate === "function";

  if (!hasMotion || !hasVibrate) {
    const missing = [];
    if (!hasVibrate) missing.push("vibration");
    if (!hasMotion) missing.push("motion sensor");
    vsSupportHint.textContent = `This browser/device doesn't expose ${missing.join(" or ")} access -- Vibration Scan needs both.`;
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }

  let motionEnabled = false;
  let sampling = false;
  let sampleBuf = []; // { t, magnitude }
  let log = loadLog();

  function magnitudeOf(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x === null || a.x === undefined) return null;
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }

  function handleMotion(e) {
    if (!sampling) return;
    const m = magnitudeOf(e);
    if (m === null) return;
    sampleBuf.push({ t: performance.now(), magnitude: m });
  }

  function updateMotionPill() {
    motionPill.className = motionEnabled ? "dmx-pill connected" : "dmx-pill";
    motionPillText.textContent = "Motion sensor: " + (motionEnabled ? "on" : "off");
    pulseBtn.disabled = !motionEnabled;
  }

  async function enableMotion() {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== "granted") { vsStatus.textContent = "Motion sensor: permission denied."; return; }
      }
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== "granted") { vsStatus.textContent = "Motion sensor: permission denied."; return; }
      }
      window.addEventListener("devicemotion", handleMotion);
      motionEnabled = true;
      motionToggleBtn.textContent = "Disable motion sensor";
      motionToggleBtn.classList.add("active");
      motionToggleBtn.setAttribute("aria-pressed", "true");
      vsStatus.textContent = "";
      updateMotionPill();
    } catch (e) {
      vsStatus.textContent = "Motion sensor error: " + e.message;
    }
  }
  function disableMotion() {
    window.removeEventListener("devicemotion", handleMotion);
    motionEnabled = false;
    motionToggleBtn.textContent = "Enable motion sensor";
    motionToggleBtn.classList.remove("active");
    motionToggleBtn.setAttribute("aria-pressed", "false");
    updateMotionPill();
  }
  motionToggleBtn.addEventListener("click", () => { motionEnabled ? disableMotion() : enableMotion(); });
  updateMotionPill();

  // ---- Pulse & measure -------------------------------------------------

  function currentBaselineStats() {
    // Mean/stddev of residuals over points not already flagged as
    // outliers, so one bad point doesn't drag the baseline toward itself.
    const clean = log.filter((p) => !p.flagged).map((p) => p.residual);
    if (clean.length < MIN_POINTS_FOR_FLAGGING) return null;
    const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
    const variance = clean.reduce((a, b) => a + (b - mean) * (b - mean), 0) / clean.length;
    return { mean, stddev: Math.sqrt(variance) };
  }

  async function pulseAndMeasure() {
    if (!motionEnabled) { pulseStatus.textContent = "Enable the motion sensor first."; return; }
    pulseBtn.disabled = true;
    pulseStatus.textContent = "Hold still…";

    // Rest baseline just before the pulse, so "peak"/"residual" below are
    // deviations from however the phone happens to be held right now, not
    // from a fixed 9.8 m/s^2 that assumes it's held perfectly still/flat.
    sampleBuf = [];
    sampling = true;
    await new Promise((r) => setTimeout(r, PRE_WINDOW_MS));
    const restSamples = sampleBuf.slice();
    const rest = restSamples.length
      ? restSamples.reduce((a, s) => a + s.magnitude, 0) / restSamples.length
      : 9.8;

    sampleBuf = [];
    try { navigator.vibrate(PULSE_MS); } catch (e) { /* ignore -- best effort */ }
    pulseStatus.textContent = "Measuring response…";
    await new Promise((r) => setTimeout(r, POST_WINDOW_MS));
    sampling = false;

    const samples = sampleBuf.slice();
    pulseBtn.disabled = !motionEnabled;
    if (!samples.length) { pulseStatus.textContent = "No motion samples captured -- try again."; return; }

    const deviations = samples.map((s) => Math.abs(s.magnitude - rest));
    const peak = Math.max(...deviations);
    const tailStart = performance.now() - TAIL_MS; // approx -- POST_WINDOW_MS already elapsed
    const tailSamples = samples.filter((s) => s.t >= samples[samples.length - 1].t - TAIL_MS);
    const residual = tailSamples.length
      ? tailSamples.reduce((a, s) => a + Math.abs(s.magnitude - rest), 0) / tailSamples.length
      : deviations[deviations.length - 1];

    const baseline = currentBaselineStats();
    const flagged = !!(baseline && Math.abs(residual - baseline.mean) > FLAG_STDDEV_MULT * baseline.stddev);

    log.push({ n: log.length + 1, peak, residual, flagged });
    saveLog();
    renderLog();
    pulseStatus.textContent = flagged
      ? `Point ${log.length}: residual ${residual.toFixed(2)} -- differs noticeably from nearby points.`
      : `Point ${log.length}: residual ${residual.toFixed(2)}.`;
  }
  pulseBtn.addEventListener("click", pulseAndMeasure);

  function renderLog() {
    if (!log.length) {
      vsLogEmptyHint.classList.remove("hide");
      vsLogTableWrap.classList.add("hide");
      return;
    }
    vsLogEmptyHint.classList.add("hide");
    vsLogTableWrap.classList.remove("hide");
    vsLogBody.innerHTML = "";
    log.forEach((p) => {
      const tr = document.createElement("tr");
      if (p.flagged) tr.className = "flagged";
      tr.innerHTML = `<td>${p.n}</td><td>${p.peak.toFixed(2)}</td><td>${p.residual.toFixed(2)}</td><td>${p.flagged ? "⚠️ differs" : ""}</td>`;
      vsLogBody.appendChild(tr);
    });
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) { /* storage full/unavailable -- log still holds for this session */ }
  }

  clearLogBtn.addEventListener("click", () => {
    log = [];
    saveLog();
    renderLog();
    pulseStatus.textContent = "Log cleared.";
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  exportLogBtn.addEventListener("click", () => {
    if (!log.length) { pulseStatus.textContent = "Nothing to export yet."; return; }
    const rows = ["point,peak,residual,flagged"];
    log.forEach((p) => rows.push([p.n, p.peak.toFixed(3), p.residual.toFixed(3), p.flagged].join(",")));
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), `vibro-scan-${new Date().toISOString().slice(0, 10)}.csv`);
  });

  renderLog();

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    vsMain.classList.remove("hide");
  });
})();
