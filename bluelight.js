(() => {
  "use strict";

  const ROTATE_KEY = "blueLightRotate180_v1";

  function loadBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) {
      return fallback;
    }
  }
  function saveBoolPref(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch (e) { /* ignore */ }
  }

  const video = document.getElementById("cameraFeed");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const sensorTempWrap = document.getElementById("sensorTempWrap");
  const sensorTempSlider = document.getElementById("sensorTempSlider");
  const sensorTempLabel = document.getElementById("sensorTempLabel");
  const sensorTempHint = document.getElementById("sensorTempHint");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  let currentStream = null;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  let torchTrack = null;
  let torchSupported = false;
  let torchOn = false;
  let sensorTempTrack = null;

  function setStatus(msg) {
    status.textContent = msg;
  }

  function setupTorch(track) {
    torchTrack = track;
    torchOn = false;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    torchSupported = !!(caps && caps.torch);
    torchBtn.classList.toggle("hide", !torchSupported);
    torchBtn.classList.remove("active");
    torchBtn.setAttribute("aria-pressed", "false");
    torchBtn.textContent = "Flashlight";
    if (!torchSupported) return;
    track.addEventListener("ended", () => {
      torchSupported = false;
      torchOn = false;
      torchBtn.classList.add("hide");
    });
  }

  async function toggleTorch() {
    if (!torchTrack || !torchSupported) return;
    const next = !torchOn;
    try {
      await torchTrack.applyConstraints({ advanced: [{ torch: next }] });
      torchOn = next;
      torchBtn.classList.toggle("active", torchOn);
      torchBtn.setAttribute("aria-pressed", String(torchOn));
      torchBtn.textContent = torchOn ? "Flashlight: On" : "Flashlight";
    } catch (err) {
      torchSupported = false;
      torchBtn.classList.add("hide");
    }
  }

  // ---- Sensor colour temperature ----
  // The ONLY blue-light reduction this page offers: MediaTrackConstraints'
  // colorTemperature + whiteBalanceMode, applied by the camera hardware/ISP
  // itself before a frame is ever captured -- a genuine reduction in what
  // the sensor takes in, not a software recolour of the picture afterward.
  // The view stays true at all times; there's no visual-filter fallback
  // when a device/browser doesn't expose this (most don't) -- feature-
  // detected via the track's own capabilities, hidden entirely (with an
  // explanatory hint in its place) rather than faked.
  function setupSensorTemp(track) {
    sensorTempTrack = track;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const range = caps && caps.colorTemperature;
    const supported = !!(range && Number.isFinite(range.min) && Number.isFinite(range.max));
    sensorTempWrap.classList.toggle("hide", !supported);
    sensorTempHint.classList.toggle("hide", supported);
    if (!supported) return;
    sensorTempSlider.min = String(range.min);
    sensorTempSlider.max = String(range.max);
    if (range.step) sensorTempSlider.step = String(range.step);
    const settings = track.getSettings ? track.getSettings() : {};
    const initial = Number.isFinite(settings.colorTemperature) ? settings.colorTemperature : Math.round((range.min + range.max) / 2);
    sensorTempSlider.value = String(initial);
    sensorTempLabel.textContent = `${initial}K`;
  }

  async function applySensorTemp(kelvin) {
    if (!sensorTempTrack) return;
    try {
      await sensorTempTrack.applyConstraints({ advanced: [{ whiteBalanceMode: "manual", colorTemperature: kelvin }] });
    } catch (err) {
      // Some devices report the capability but reject the constraint in
      // practice -- stop offering it rather than leave a dead control.
      sensorTempWrap.classList.add("hide");
      sensorTempHint.classList.remove("hide");
    }
  }

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      currentStream = stream;
      video.srcObject = stream;
      await video.play();
      setupTorch(stream.getVideoTracks()[0]);
      setupSensorTemp(stream.getVideoTracks()[0]);
      overlay.classList.add("hide");
      hud.classList.remove("hide");
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  startBtn.addEventListener("click", startCamera);

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    if (paused) video.pause(); else video.play().catch(() => {});
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    pauseBtn.setAttribute("aria-pressed", String(paused));
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    video.classList.toggle("rotate180", rotate180);
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveBoolPref(ROTATE_KEY, rotate180);
  });
  video.classList.toggle("rotate180", rotate180);
  rotateBtn.classList.toggle("active", rotate180);
  rotateBtn.setAttribute("aria-pressed", String(rotate180));

  torchBtn.addEventListener("click", toggleTorch);

  let sensorTempDebounce = null;
  sensorTempSlider.addEventListener("input", () => {
    const kelvin = parseInt(sensorTempSlider.value, 10);
    sensorTempLabel.textContent = `${kelvin}K`;
    // applyConstraints is a real (sometimes slow) device call -- debounce
    // so dragging the slider doesn't fire dozens of overlapping requests.
    clearTimeout(sensorTempDebounce);
    sensorTempDebounce = setTimeout(() => applySensorTemp(kelvin), 120);
  });

  // ---- Fullscreen ----
  // A single button, pinned outside both #hud and the normal flow, so it
  // never disappears regardless of HUD state -- one large, unmissable,
  // fixed target to get in and back out, with no tiny gap to hunt for and
  // no dead end that needs a page reload to escape.
  let fullscreenActive = false;

  async function enterFullscreen() {
    try {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) await req.call(document.documentElement);
    } catch (e) { /* fullscreen not available/permitted -- still hide the HUD below */ }
    fullscreenActive = true;
    hud.classList.add("hide");
    fullscreenBtn.classList.add("active");
    fullscreenBtn.setAttribute("aria-pressed", "true");
  }

  function exitFullscreenMode() {
    fullscreenActive = false;
    hud.classList.remove("hide");
    fullscreenBtn.classList.remove("active");
    fullscreenBtn.setAttribute("aria-pressed", "false");
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      exit.call(document).catch ? exit.call(document).catch(() => {}) : exit.call(document);
    }
  }

  fullscreenBtn.addEventListener("click", () => {
    if (fullscreenActive) exitFullscreenMode(); else enterFullscreen();
  });

  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (fullscreenActive && !document.fullscreenElement && !document.webkitFullscreenElement) exitFullscreenMode();
    });
  });
})();
