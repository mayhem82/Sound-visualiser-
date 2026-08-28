(() => {
  "use strict";

  const BLEND_KEY = "blueLightBlend_v1";
  const INTENSITY_KEY = "blueLightIntensity_v1";
  const WARMTH_KEY = "blueLightWarmth_v1";
  const ROTATE_KEY = "blueLightRotate180_v1";
  const DEFAULT_BLEND = 100;
  const DEFAULT_INTENSITY = 50;
  const DEFAULT_WARMTH = 20;

  function loadNumberPref(key, fallback) {
    try {
      const raw = parseFloat(localStorage.getItem(key));
      return Number.isFinite(raw) ? raw : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveNumberPref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ }
  }
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

  const stage = document.getElementById("stage");
  const video = document.getElementById("cameraFeed");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const intensitySlider = document.getElementById("intensitySlider");
  const intensityLabel = document.getElementById("intensityLabel");
  const warmthSlider = document.getElementById("warmthSlider");
  const warmthLabel = document.getElementById("warmthLabel");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  let currentStream = null;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  let torchTrack = null;
  let torchSupported = false;
  let torchOn = false;
  let gl = null;
  let uniforms = null;
  let videoTexture = null;

  const VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    uniform float uRotate180;
    // Crops the video to fill the canvas without distortion ("object-fit:
    // cover"), same technique used across the suite's other camera pages —
    // uUvScale/uUvOffset computed in JS each frame from the real video and
    // canvas dimensions.
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      uv = uv * uUvScale + uUvOffset;
      vUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform float uIntensity;
    uniform float uWarmth;
    void main() {
      vec3 original = texture2D(uTex, vUv).rgb;
      vec3 filtered = original;
      // Blue-light reduction: scale the blue channel down, up to 70% cut
      // at full intensity -- the simplest, most direct way to attenuate
      // the short-wavelength part of the spectrum a screen actually emits.
      filtered.b *= mix(1.0, 0.3, uIntensity);
      // Warmth: an extra push on top, independent of Intensity, for a
      // stronger evening/night-mode look without cutting blue further.
      filtered.r = clamp(filtered.r + uWarmth * 0.18, 0.0, 1.0);
      filtered.g = clamp(filtered.g + uWarmth * 0.06, 0.0, 1.0);
      filtered.b = clamp(filtered.b - uWarmth * 0.08, 0.0, 1.0);
      vec3 finalColor = mix(original, filtered, uBlend);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function compileShader(glCtx, type, src) {
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

  function initGL() {
    gl = stage.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) ||
      stage.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL not supported on this device/browser.");

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const qBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    uniforms = {
      uTex: gl.getUniformLocation(prog, "uTex"),
      uBlend: gl.getUniformLocation(prog, "uBlend"),
      uIntensity: gl.getUniformLocation(prog, "uIntensity"),
      uWarmth: gl.getUniformLocation(prog, "uWarmth"),
      uRotate180: gl.getUniformLocation(prog, "uRotate180"),
      uUvScale: gl.getUniformLocation(prog, "uUvScale"),
      uUvOffset: gl.getUniformLocation(prog, "uUvOffset")
    };
  }

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

  function resizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.round(window.innerWidth * dpr);
    stage.height = Math.round(window.innerHeight * dpr);
    if (gl) gl.viewport(0, 0, stage.width, stage.height);
  }

  function renderLoop() {
    if (!paused && video.readyState >= video.HAVE_CURRENT_DATA) {
      const cover = computeCoverUv(video.videoWidth, video.videoHeight, stage.width, stage.height);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, parseFloat(blendSlider.value) / 100);
      gl.uniform1f(uniforms.uIntensity, parseFloat(intensitySlider.value) / 100);
      gl.uniform1f(uniforms.uWarmth, parseFloat(warmthSlider.value) / 100);
      gl.uniform1f(uniforms.uRotate180, rotate180 ? 1 : 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(renderLoop);
  }

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
      resizeStage();
      initGL();
      renderLoop();
      overlay.classList.add("hide");
      hud.classList.remove("hide");
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  startBtn.addEventListener("click", startCamera);

  blendSlider.addEventListener("input", () => {
    blendLabel.textContent = `${blendSlider.value}%`;
    saveNumberPref(BLEND_KEY, parseFloat(blendSlider.value));
  });
  intensitySlider.addEventListener("input", () => {
    intensityLabel.textContent = `${intensitySlider.value}%`;
    saveNumberPref(INTENSITY_KEY, parseFloat(intensitySlider.value));
  });
  warmthSlider.addEventListener("input", () => {
    warmthLabel.textContent = `${warmthSlider.value}%`;
    saveNumberPref(WARMTH_KEY, parseFloat(warmthSlider.value));
  });
  blendSlider.value = String(loadNumberPref(BLEND_KEY, DEFAULT_BLEND));
  blendLabel.textContent = `${blendSlider.value}%`;
  intensitySlider.value = String(loadNumberPref(INTENSITY_KEY, DEFAULT_INTENSITY));
  intensityLabel.textContent = `${intensitySlider.value}%`;
  warmthSlider.value = String(loadNumberPref(WARMTH_KEY, DEFAULT_WARMTH));
  warmthLabel.textContent = `${warmthSlider.value}%`;

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    pauseBtn.setAttribute("aria-pressed", String(paused));
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveBoolPref(ROTATE_KEY, rotate180);
  });
  rotateBtn.classList.toggle("active", rotate180);
  rotateBtn.setAttribute("aria-pressed", String(rotate180));

  torchBtn.addEventListener("click", toggleTorch);

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

  window.addEventListener("resize", resizeStage);
})();
