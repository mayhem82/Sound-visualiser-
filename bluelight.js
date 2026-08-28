(() => {
  "use strict";

  const INTENSITY_KEY = "blueLightIntensity_v3";
  const WARMTH_KEY = "blueLightWarmth_v3";
  const ROTATE_KEY = "blueLightRotate180_v1";
  const DEFAULT_INTENSITY = 50;
  const DEFAULT_WARMTH = 50;

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

  // ---- Spectral model ----
  // Working "at the optic transmission layer" rather than the pixel level:
  // reconstruct an approximate light spectrum from each pixel's linear RGB,
  // attenuate it wavelength-by-wavelength with a real blue-light-filter
  // transmission curve, then reproject that filtered spectrum back to RGB
  // through the actual CIE colour-matching functions -- the same pipeline
  // a physically-based renderer uses for a coloured/spectral filter, not an
  // arbitrary channel scale or a flat colour tint.
  //
  // Every step here (RGB->spectrum reconstruction, the transmission curve,
  // spectrum->XYZ reprojection) is LINEAR in the input RGB. Composing linear
  // operations is still linear, which means the whole per-wavelength
  // simulation collapses algebraically into a single 3x3 matrix from linear
  // RGB to linear RGB -- so the heavy N-wavelength integration only has to
  // run in JS once per settings change, not per pixel per frame. The shader
  // itself just does one 3x3 matrix multiply per pixel: exactly the same
  // result as running the full spectral sum at every pixel, only computed
  // once and reused.

  const WAVELENGTH_MIN = 400;
  const WAVELENGTH_MAX = 700;
  const WAVELENGTH_STEP = 5; // nm
  const WAVELENGTHS = [];
  for (let w = WAVELENGTH_MIN; w <= WAVELENGTH_MAX; w += WAVELENGTH_STEP) WAVELENGTHS.push(w);

  function asymGauss(x, mu, sigma1, sigma2) {
    const sigma = x < mu ? sigma1 : sigma2;
    const t = (x - mu) / sigma;
    return Math.exp(-0.5 * t * t);
  }
  function gauss(x, mu, sigma) {
    return asymGauss(x, mu, sigma, sigma);
  }

  // Wyman, Sloan & Shirley (2013), "Simple Analytic Approximations to the
  // CIE XYZ Color Matching Functions" -- a compact multi-Gaussian fit to
  // the standard 1931 2-degree observer, accurate enough for a perceptual
  // effect like this without needing to ship a full tabulated CMF dataset.
  function xBar(l) {
    return 1.056 * asymGauss(l, 599.8, 37.9, 31.0) +
      0.362 * asymGauss(l, 442.0, 16.0, 26.7) -
      0.065 * asymGauss(l, 501.1, 20.4, 26.2);
  }
  function yBar(l) {
    return 0.821 * asymGauss(l, 568.8, 46.9, 40.5) +
      0.286 * asymGauss(l, 530.9, 16.3, 31.1);
  }
  function zBar(l) {
    return 1.217 * asymGauss(l, 437.0, 11.8, 36.0) +
      0.681 * asymGauss(l, 459.0, 26.0, 13.8);
  }

  // Plausible emission spectra for a display/camera's R, G, B primaries --
  // a single Gaussian per primary, centred near typical sRGB primary
  // wavelengths. RGB has only three samples of a real spectrum, so any
  // reconstruction is necessarily approximate (metamerism) -- this is the
  // same kind of basis-function approach used in real-time "fake spectral"
  // rendering (c.f. Smits 1999 for the reflectance-spectrum equivalent).
  function basisR(l) { return gauss(l, 611, 28); }
  function basisG(l) { return gauss(l, 549, 30); }
  function basisB(l) { return gauss(l, 465, 20); }

  // A real blue-light-blocking lens/coating's transmission curve: near-zero
  // transmission at the deepest blue (worst for eye strain / melatonin
  // suppression), rising smoothly back to full transmission by some cutoff
  // wavelength. "Filter strength" sets how deep the block goes; "Cutoff
  // reach" sets how far across the spectrum (into blue-green) it extends --
  // matching how stronger, more amber-looking blue-light lenses have both a
  // deeper AND wider cutoff than a mild one.
  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  function transmission(l, intensity01, warmth01) {
    const minT = 1 - 0.95 * intensity01;
    const cutoff = 450 + 110 * warmth01;
    return minT + (1 - minT) * smoothstep(WAVELENGTH_MIN, cutoff, l);
  }

  // Precompute per-wavelength basis/CMF values once -- these never change.
  const LUT = WAVELENGTHS.map((l) => ({
    xBar: xBar(l), yBar: yBar(l), zBar: zBar(l),
    basisR: basisR(l), basisG: basisG(l), basisB: basisB(l)
  }));

  function matMul3(a, b) {
    const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
      }
    }
    return out;
  }
  function invert3x3(m) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    const invDet = 1 / det;
    return [
      [(e * i - f * h) * invDet, -(b * i - c * h) * invDet, (b * f - c * e) * invDet],
      [-(d * i - f * g) * invDet, (a * i - c * g) * invDet, -(a * f - c * d) * invDet],
      [(d * h - e * g) * invDet, -(a * h - b * g) * invDet, (a * e - b * d) * invDet]
    ];
  }

  // Standard sRGB (D65) XYZ -> linear RGB matrix.
  const XYZ_TO_RGB = [
    [3.2406, -1.5372, -0.4986],
    [-0.9689, 1.8758, 0.0415],
    [0.0557, -0.2040, 1.0570]
  ];

  // R,G,B(linear) -> X,Y,Z, with or without the transmission curve applied.
  // Returns a 3x3 matrix B such that [X,Y,Z] = B * [R,G,B].
  function spectrumToXyzMatrix(intensity01, warmth01, applyFilter) {
    const rows = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < LUT.length; i++) {
      const s = LUT[i];
      const l = WAVELENGTHS[i];
      const t = applyFilter ? transmission(l, intensity01, warmth01) : 1;
      rows[0][0] += t * s.xBar * s.basisR; rows[0][1] += t * s.xBar * s.basisG; rows[0][2] += t * s.xBar * s.basisB;
      rows[1][0] += t * s.yBar * s.basisR; rows[1][1] += t * s.yBar * s.basisG; rows[1][2] += t * s.yBar * s.basisB;
      rows[2][0] += t * s.zBar * s.basisR; rows[2][1] += t * s.zBar * s.basisG; rows[2][2] += t * s.zBar * s.basisB;
    }
    return rows;
  }

  // The fixed correction for the basis/CMF approximation's own systematic
  // colour cast: without it, even "no filter at all" wouldn't reproduce the
  // original colour exactly, since reconstructing a spectrum from 3 RGB
  // samples and reprojecting it back is inherently lossy. Computed once, at
  // T(lambda)=1 everywhere, so it exactly cancels regardless of the filter
  // settings applied on top of it.
  const M0 = matMul3(XYZ_TO_RGB, spectrumToXyzMatrix(0, 0, false));
  const CORRECTION = invert3x3(M0);

  // Column-major flat array for gl.uniformMatrix3fv, given a row-major 3x3.
  function toColumnMajor(m) {
    return new Float32Array([
      m[0][0], m[1][0], m[2][0],
      m[0][1], m[1][1], m[2][1],
      m[0][2], m[1][2], m[2][2]
    ]);
  }

  function computeFilterMatrix(intensity01, warmth01) {
    const mT = matMul3(XYZ_TO_RGB, spectrumToXyzMatrix(intensity01, warmth01, true));
    const effective = matMul3(CORRECTION, mT);
    return toColumnMajor(effective);
  }

  const stage = document.getElementById("stage");
  const video = document.getElementById("cameraFeed");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const intensitySlider = document.getElementById("intensitySlider");
  const intensityLabel = document.getElementById("intensityLabel");
  const warmthSlider = document.getElementById("warmthSlider");
  const warmthLabel = document.getElementById("warmthLabel");
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
  let gl = null;
  let uniforms = null;
  let videoTexture = null;
  let filterMatrix = computeFilterMatrix(loadNumberPref(INTENSITY_KEY, DEFAULT_INTENSITY) / 100, loadNumberPref(WARMTH_KEY, DEFAULT_WARMTH) / 100);

  const VERT_SRC = `
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

  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform mat3 uFilterMatrix;

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }
    vec3 linearToSrgb(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    void main() {
      vec3 original = texture2D(uTex, vUv).rgb;
      vec3 lin = srgbToLinear(original);
      // The one per-pixel operation: everything about the spectral
      // reconstruction, the transmission curve, and the CIE reprojection
      // has already been folded into this single matrix (see
      // computeFilterMatrix in bluelight.js) -- this line IS the optical
      // filter, not an approximation of it.
      vec3 filtered = uFilterMatrix * lin;
      filtered = clamp(filtered, 0.0, 1.0);
      gl_FragColor = vec4(linearToSrgb(filtered), 1.0);
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
      uFilterMatrix: gl.getUniformLocation(prog, "uFilterMatrix"),
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
      gl.uniformMatrix3fv(uniforms.uFilterMatrix, false, filterMatrix);
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

  // ---- Sensor colour temperature ----
  // The spectral filter above is a post-process on whatever the camera's
  // own image pipeline already produced. This instead reaches for the
  // camera hardware/ISP itself, before that -- MediaTrackConstraints
  // exposes colorTemperature + whiteBalanceMode on the few browser/device
  // combinations that support it (mostly Chrome on some Android devices;
  // there is no web API for genuinely reshaping a CMOS/CCD sensor's
  // per-wavelength response, only this coarse single-Kelvin-value lever
  // some camera drivers happen to expose). Feature-detected: shown only
  // when the track's own capabilities actually list it, otherwise a hint
  // explains why it's missing rather than showing a dead control.
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

  function updateFilterMatrix() {
    filterMatrix = computeFilterMatrix(parseFloat(intensitySlider.value) / 100, parseFloat(warmthSlider.value) / 100);
  }

  intensitySlider.addEventListener("input", () => {
    intensityLabel.textContent = `${intensitySlider.value}%`;
    saveNumberPref(INTENSITY_KEY, parseFloat(intensitySlider.value));
    updateFilterMatrix();
  });
  warmthSlider.addEventListener("input", () => {
    warmthLabel.textContent = `${warmthSlider.value}%`;
    saveNumberPref(WARMTH_KEY, parseFloat(warmthSlider.value));
    updateFilterMatrix();
  });
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

  window.addEventListener("resize", resizeStage);
})();
