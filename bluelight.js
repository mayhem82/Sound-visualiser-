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
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const blueLight = createBlueLightFeature(video, document.getElementById("blueLightPanel"));

  let currentStream = null;
  let videoDevices = [];
  let switchingCamera = false;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  const torch = createTorchController(torchBtn);

  function setStatus(msg) {
    status.textContent = msg;
  }

  // Sensor controls + tap-to-focus now live in bluelight-core.js
  // (createBlueLightFeature), shared with the Hub.

  // ---- Screen Wake Lock ----
  // The whole point of this page is extended low-light viewing -- exactly
  // the situation where a phone's own screen timeout is most likely to
  // kick in and undo it. Handled by the shared wake-lock.js
  // (window.WakeLockHelper) now -- see the startBtn listener below.

  // Ambient-brightness/blue-light-share sampling now lives in
  // bluelight-core.js too.

  // ---- Camera device selection ----
  // getUserMedia's facingMode ("environment"/"user") is a phone concept --
  // it means nothing to a USB webcam or an HDMI/SDI-to-USB capture card
  // feeding a real camera into a desktop, which the OS (and so the
  // browser) just sees as one more plain video input device, no different
  // from a phone's own lens. This lists every one of them by name and
  // lets a specific one be picked directly, the same enumerate/switch
  // pattern already used for phone lens-switching in colorvision.js,
  // generalized here to any camera hardware at all.
  async function attachStream(stream) {
    currentStream = stream;
    await attachVideoElement(video, stream);
    torch.setup(stream.getVideoTracks()[0]);
    blueLight.onTrackChanged(stream.getVideoTracks()[0]);
  }

  function stopCurrentStream() {
    if (!currentStream) return;
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  async function refreshVideoDevices() {
    try {
      const resolved = await listVideoInputsWithActive(currentStream);
      videoDevices = resolved.videoDevices;
      const activeId = resolved.activeId;
      cameraSelectWrap.classList.toggle("hide", videoDevices.length <= 1);
      cameraSelect.innerHTML = "";
      videoDevices.forEach((d, i) => {
        const option = document.createElement("option");
        option.value = d.deviceId;
        option.textContent = d.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(option);
      });
      if (activeId) cameraSelect.value = activeId;
    } catch (err) {
      cameraSelectWrap.classList.add("hide");
    }
  }

  async function switchToDevice(deviceId) {
    if (switchingCamera) return;
    switchingCamera = true;
    // Release the current camera before requesting the next one -- some
    // camera drivers/capture cards refuse or silently fail a second
    // concurrent open, same reasoning as the existing lens-switch code in
    // colorvision.js.
    stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      await attachStream(stream);
      setStatus("");
      await refreshVideoDevices();
    } catch (err) {
      setStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
    } finally {
      switchingCamera = false;
    }
  }

  cameraSelect.addEventListener("change", () => switchToDevice(cameraSelect.value));

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      await attachStream(stream);
      overlay.classList.add("hide");
      hud.classList.remove("hide");
      blueLight.start();
      await refreshVideoDevices();
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  startBtn.addEventListener("click", startCamera);
  startBtn.addEventListener("click", () => { if (window.WakeLockHelper) window.WakeLockHelper.enable(); });

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

  torchBtn.addEventListener("click", torch.toggle);

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
