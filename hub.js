(() => {
  "use strict";

  const ROTATE_KEY = "hubRotate180_v1";

  function loadBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) { return fallback; }
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
  const modeSwitcher = document.getElementById("modeSwitcher");
  const featurePanel = document.getElementById("featurePanel");

  let currentStream = null;
  let currentTrack = null;
  let videoDevices = [];
  let switchingCamera = false;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  const torch = createTorchController(torchBtn);
  const isHudTapTarget = makeIsHudTapTarget();

  function setStatus(msg) { status.textContent = msg; }

  // ---------------------------------------------------------------------
  // Feature registry -- each entry is { id, label, ready, create }.
  // `create` is only called for ready:true entries; it must return
  // { onTrackChanged(track), start(), stop() } (see bluelight-core.js's
  // createBlueLightFeature for the reference shape every adapter follows).
  // Everything not yet adapted stays ready:false and shows a "coming soon"
  // note in the panel instead -- the standalone page is the only way to
  // use that feature until it gets its own core module split out, the
  // same way bluelight.js's was.
  // ---------------------------------------------------------------------
  const FEATURES = [
    { id: "bluelight", label: "Blue Light Filter", ready: true, create: (v, panel) => createBlueLightFeature(v, panel) },
    { id: "colorvision", label: "Colour Vision Extreme", ready: false },
    { id: "colorassist", label: "Colour Assist", ready: false },
    { id: "soundcolour", label: "Sound Colour", ready: false },
    { id: "restore", label: "Restore", ready: false },
    { id: "colouralarm", label: "Colour Alarm", ready: false },
    { id: "nebula", label: "Sound Nebula", ready: false },
    { id: "dmx", label: "DMX", ready: false },
    { id: "videoproduction", label: "Video Production", ready: false },
    { id: "batcount", label: "Flying Fox Count", ready: false },
    { id: "call", label: "Call / Viewer pairing", ready: false },
    { id: "camerdiag", label: "Camera Diagnostic", ready: false },
  ];

  let activeFeatureId = null;
  let activeInstance = null;
  const modeButtonsById = new Map();

  // Built ONCE -- selectFeature only ever updates these same button
  // elements' classes/attributes afterward, never replaces them. Rebuilding
  // modeSwitcher's innerHTML from inside a button's own click handler would
  // detach that exact button mid-click: the document-level "tap outside
  // the HUD to hide it" listener (see below) still receives the bubbled
  // click, but Element.closest() from a now-parentless target can no
  // longer reach #hud, so it would misjudge the click as "outside" and
  // hide the whole HUD as a side effect of picking a feature.
  function buildModeSwitcher() {
    modeSwitcher.innerHTML = "";
    modeButtonsById.clear();
    FEATURES.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hud-btn mode-btn";
      btn.textContent = f.ready ? f.label : f.label + " (soon)";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", "false");
      if (!f.ready) btn.disabled = true;
      btn.addEventListener("click", () => selectFeature(f.id));
      modeSwitcher.appendChild(btn);
      modeButtonsById.set(f.id, btn);
    });
  }

  function updateModeSwitcherActiveState() {
    modeButtonsById.forEach((btn, id) => {
      const isActive = id === activeFeatureId;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function selectFeature(id) {
    if (id === activeFeatureId) return;
    const spec = FEATURES.find((f) => f.id === id);
    if (!spec) return;

    if (activeInstance) {
      activeInstance.stop();
      activeInstance = null;
    }
    featurePanel.innerHTML = "";
    activeFeatureId = id;

    if (spec.ready) {
      activeInstance = spec.create(video, featurePanel);
      if (currentTrack) activeInstance.onTrackChanged(currentTrack);
      activeInstance.start();
    } else {
      const note = document.createElement("p");
      note.id = "comingSoonNote";
      note.className = "hint";
      note.textContent = `${spec.label} isn't wired into the Hub yet -- use its own standalone page for now.`;
      featurePanel.appendChild(note);
    }
    updateModeSwitcherActiveState();
  }

  // ---- Torch/HUD tap-to-hide (shared modules) ----

  document.body.addEventListener("click", (e) => {
    if (isHudTapTarget(e.target)) return;
    hud.classList.toggle("hide");
  });

  // ---- Camera lifecycle ----

  async function attachStream(stream) {
    currentStream = stream;
    await attachVideoElement(video, stream);
    currentTrack = stream.getVideoTracks()[0];
    torch.setup(currentTrack);
    if (activeInstance) activeInstance.onTrackChanged(currentTrack);
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
      await refreshVideoDevices();
      buildModeSwitcher();
      // Land on the one ready feature by default rather than an empty
      // panel -- there's exactly one right now; as more get adapted this
      // just becomes "the first ready one".
      const firstReady = FEATURES.find((f) => f.ready);
      if (firstReady) selectFeature(firstReady.id);
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

  torchBtn.addEventListener("click", torch.toggle);

  // ---- Fullscreen ----

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

  window.__hubTestables = {
    getActiveFeatureId: () => activeFeatureId,
    getFeatureCount: () => FEATURES.length,
    getReadyFeatureIds: () => FEATURES.filter((f) => f.ready).map((f) => f.id),
  };
})();
