(() => {
  "use strict";

  const MAX_POINTS = 32;
  const STORAGE_KEY = "cvCalibrationPoints_v1";
  const ROTATE_KEY = "cvRotate180_v1";

  const stage = document.getElementById("stage");
  const video = document.getElementById("cameraFeed");
  const sampleCanvas = document.getElementById("sampleCanvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  const hud = document.getElementById("hud");
  const blendSlider = document.getElementById("blendSlider");
  const blendLabel = document.getElementById("blendLabel");
  const calibrateBtn = document.getElementById("calibrateBtn");
  const pointsBtn = document.getElementById("pointsBtn");
  const pointsCount = document.getElementById("pointsCount");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");

  const reticleLayer = document.getElementById("reticleLayer");
  const reticleSwatch = document.getElementById("reticleSwatch");
  const freezeBtn = document.getElementById("freezeBtn");
  const cancelAimBtn = document.getElementById("cancelAimBtn");

  const tunePanel = document.getElementById("tunePanel");
  const swatchOriginal = document.getElementById("swatchOriginal");
  const swatchCorrected = document.getElementById("swatchCorrected");
  const hueSlider = document.getElementById("hueSlider");
  const satSlider = document.getElementById("satSlider");
  const lightSlider = document.getElementById("lightSlider");
  const hueLabel = document.getElementById("hueLabel");
  const satLabel = document.getElementById("satLabel");
  const lightLabel = document.getElementById("lightLabel");
  const labelInput = document.getElementById("labelInput");
  const savePointBtn = document.getElementById("savePointBtn");
  const deletePointBtn = document.getElementById("deletePointBtn");
  const closeTuneBtn = document.getElementById("closeTuneBtn");

  const pointsPanel = document.getElementById("pointsPanel");
  const pointsGrid = document.getElementById("pointsGrid");
  const closePointsBtn = document.getElementById("closePointsBtn");

  // Each saved point is a real colour the user aimed at and personally tuned:
  // { id, label, sourceColor: [r,g,b 0-1], hueShift (deg), satAdjust, lightAdjust (-1..1) }.
  // The shader blends correction across the whole frame by weighting each
  // point's contribution by inverse Lab-distance from the pixel's own colour,
  // so nearby real-world colours inherit similar correction and coverage
  // improves the more points get calibrated.
  let points = loadPoints();
  let editingPointId = null;
  let frozenColor = null;
  let aiming = false;
  let paused = false;
  // Some phones (notably several Android back cameras) deliver frames
  // pre-rotated 180° at the driver/OS level — unrelated to WebGL's own
  // texture-space Y-flip, and not something we can reliably detect, so it's
  // a manual per-device toggle instead, persisted once the user sets it.
  let rotate180 = loadRotatePref();
  let gl, program, uniforms, quadBuffer, videoTexture;
  let rafId = null;
  let aimIntervalId = null;

  // ---- Colour math (mirrors the shader's math for JS-side previews) ----

  function rgb2hsl(r, g, b) {
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

  function hsl2rgb(h, s, l) {
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

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgb2lab(r, g, b) {
    const rl = srgbToLinear(r);
    const gl_ = srgbToLinear(g);
    const bl = srgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function applyCorrection([r, g, b], hueShift, satAdjust, lightAdjust) {
    let [h, s, l] = rgb2hsl(r, g, b);
    h = (h + hueShift + 360) % 360;
    s = Math.min(1, Math.max(0, s + satAdjust));
    l = Math.min(1, Math.max(0, l + lightAdjust));
    return hsl2rgb(h, s, l);
  }

  function rgbToCss([r, g, b]) {
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  // ---- Persistence ----

  function loadPoints() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function savePoints() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch (e) {
      setStatus("Could not save (storage full or unavailable).");
    }
  }

  function loadRotatePref() {
    try {
      return localStorage.getItem(ROTATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveRotatePref() {
    try {
      localStorage.setItem(ROTATE_KEY, rotate180 ? "1" : "0");
    } catch (e) {
      // Non-fatal — just won't persist across reloads.
    }
  }

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  // ---- WebGL ----
  // One shader does both true and corrected colour and mixes them by uBlend,
  // rather than rendering two passes and compositing.

  const VERT_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    uniform float uRotate180;
    void main() {
      vec2 uv = aPos * 0.5 + 0.5;
      vUv = uRotate180 > 0.5 ? (1.0 - uv) : uv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uBlend;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];

    float srgbToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
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
      vec3 correction = vec3(0.0);

      if (uPointCount > 0) {
        vec3 labP = rgb2lab(original);
        float totalWeight = 0.0;
        vec3 weightedSum = vec3(0.0);
        for (int i = 0; i < ${MAX_POINTS}; i++) {
          if (i >= uPointCount) break;
          float d = distance(labP, uSourceLab[i]);
          float w = 1.0 / (d * d + 4.0);
          weightedSum += uCorrection[i] * w;
          totalWeight += w;
        }
        if (totalWeight > 0.0) correction = weightedSum / totalWeight;
      }

      vec3 hsl = rgb2hsl(original);
      hsl.x = mod(hsl.x + correction.x + 360.0, 360.0);
      hsl.y = clamp(hsl.y + correction.y, 0.0, 1.0);
      hsl.z = clamp(hsl.z + correction.z, 0.0, 1.0);
      vec3 corrected = hsl2rgb(hsl);

      gl_FragColor = vec4(mix(original, corrected, uBlend), 1.0);
    }
  `;

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Shader compile error: " + log);
    }
    return sh;
  }

  function initGL() {
    gl = stage.getContext("webgl", { antialias: false }) || stage.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL not supported on this device/browser.");

    const vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    // Video frames upload top-row-first, but WebGL texture space has its
    // origin at the bottom-left, so without this every frame renders upside-down.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    uniforms = {
      uTex: gl.getUniformLocation(program, "uTex"),
      uBlend: gl.getUniformLocation(program, "uBlend"),
      uRotate180: gl.getUniformLocation(program, "uRotate180"),
      uPointCount: gl.getUniformLocation(program, "uPointCount"),
      uSourceLab: gl.getUniformLocation(program, "uSourceLab"),
      uCorrection: gl.getUniformLocation(program, "uCorrection")
    };
  }

  function resizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.round(window.innerWidth * dpr);
    stage.height = Math.round(window.innerHeight * dpr);
    if (gl) gl.viewport(0, 0, stage.width, stage.height);
  }

  function uploadPointUniforms() {
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = rgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
    }
    gl.useProgram(program);
    gl.uniform1i(uniforms.uPointCount, count);
    gl.uniform3fv(uniforms.uSourceLab, labArr);
    gl.uniform3fv(uniforms.uCorrection, corrArr);
  }

  function renderLoop() {
    if (!paused && video.readyState >= video.HAVE_CURRENT_DATA) {
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, parseFloat(blendSlider.value) / 100);
      gl.uniform1f(uniforms.uRotate180, rotate180 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  // ---- Camera ----

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      overlay.classList.add("hide");
      hud.classList.remove("hide");
      resizeStage();
      initGL();
      uploadPointUniforms();
      renderLoop();
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  // ---- Sampling for calibration ----
  // Averages a small patch from the raw video frame (not the shader's
  // corrected output) so calibration is always anchored to the real colour.

  const SAMPLE_SIZE = 12;

  function sampleCenterColor() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return [0.5, 0.5, 0.5];
    sampleCanvas.width = 64;
    sampleCanvas.height = 64;
    const vw = video.videoWidth, vh = video.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.15;
    const sx = vw / 2 - cropSize / 2;
    const sy = vh / 2 - cropSize / 2;
    sampleCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 64, 64);
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
      reticleSwatch.style.background = rgbToCss(sampleCenterColor());
    }, 120);
  }

  function stopAiming() {
    aiming = false;
    reticleLayer.classList.add("hide");
    if (aimIntervalId) { clearInterval(aimIntervalId); aimIntervalId = null; }
  }

  // ---- Tune panel ----

  function openTuneForNewPoint(sourceColor) {
    editingPointId = null;
    frozenColor = sourceColor;
    hueSlider.value = 0; satSlider.value = 0; lightSlider.value = 0;
    labelInput.value = "";
    deletePointBtn.classList.add("hide");
    refreshTunePreview();
    tunePanel.classList.remove("hide");
  }

  function openTuneForExistingPoint(point) {
    editingPointId = point.id;
    frozenColor = point.sourceColor;
    hueSlider.value = point.hueShift;
    satSlider.value = Math.round(point.satAdjust * 100);
    lightSlider.value = Math.round(point.lightAdjust * 100);
    labelInput.value = point.label || "";
    deletePointBtn.classList.remove("hide");
    refreshTunePreview();
    pointsPanel.classList.add("hide");
    tunePanel.classList.remove("hide");
  }

  function currentTuneValues() {
    return {
      hueShift: parseFloat(hueSlider.value),
      satAdjust: parseFloat(satSlider.value) / 100,
      lightAdjust: parseFloat(lightSlider.value) / 100
    };
  }

  function refreshTunePreview() {
    if (!frozenColor) return;
    const { hueShift, satAdjust, lightAdjust } = currentTuneValues();
    swatchOriginal.style.background = rgbToCss(frozenColor);
    swatchCorrected.style.background = rgbToCss(applyCorrection(frozenColor, hueShift, satAdjust, lightAdjust));
    hueLabel.textContent = `${hueShift}°`;
    satLabel.textContent = `${satSlider.value}%`;
    lightLabel.textContent = `${lightSlider.value}%`;
  }

  function closeTunePanel() {
    tunePanel.classList.add("hide");
    frozenColor = null;
    editingPointId = null;
  }

  function savePoint() {
    const { hueShift, satAdjust, lightAdjust } = currentTuneValues();
    if (editingPointId) {
      const p = points.find((pt) => pt.id === editingPointId);
      if (p) {
        p.sourceColor = frozenColor;
        p.hueShift = hueShift;
        p.satAdjust = satAdjust;
        p.lightAdjust = lightAdjust;
        p.label = labelInput.value.trim();
      }
    } else {
      if (points.length >= MAX_POINTS) {
        setStatus(`Limit of ${MAX_POINTS} saved colours reached — delete one to add another.`);
        return;
      }
      points.push({
        id: "pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        label: labelInput.value.trim(),
        sourceColor: frozenColor,
        hueShift, satAdjust, lightAdjust
      });
    }
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function deleteCurrentPoint() {
    if (!editingPointId) return;
    points = points.filter((p) => p.id !== editingPointId);
    savePoints();
    uploadPointUniforms();
    updatePointsCount();
    closeTunePanel();
  }

  function updatePointsCount() {
    pointsCount.textContent = String(points.length);
  }

  // ---- Saved-colours grid ----

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
      const card = document.createElement("div");
      card.className = "point-card";
      const sw = document.createElement("div");
      sw.className = "point-swatch";
      sw.style.background = rgbToCss(p.sourceColor);
      const label = document.createElement("div");
      label.className = "point-label";
      label.textContent = p.label || "untitled";
      card.appendChild(sw);
      card.appendChild(label);
      card.addEventListener("click", () => openTuneForExistingPoint(p));
      pointsGrid.appendChild(card);
    });
  }

  // ---- Wiring ----

  startBtn.addEventListener("click", startCamera);

  blendSlider.addEventListener("input", () => {
    blendLabel.textContent = `${blendSlider.value}%`;
  });

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    rotateBtn.classList.toggle("active", rotate180);
    saveRotatePref();
  });

  calibrateBtn.addEventListener("click", startAiming);
  cancelAimBtn.addEventListener("click", stopAiming);

  freezeBtn.addEventListener("click", () => {
    const c = sampleCenterColor();
    stopAiming();
    openTuneForNewPoint(c);
  });

  [hueSlider, satSlider, lightSlider].forEach((el) => {
    el.addEventListener("input", refreshTunePreview);
  });

  savePointBtn.addEventListener("click", savePoint);
  deletePointBtn.addEventListener("click", deleteCurrentPoint);
  closeTuneBtn.addEventListener("click", closeTunePanel);

  pointsBtn.addEventListener("click", () => {
    renderPointsGrid();
    pointsPanel.classList.remove("hide");
  });
  closePointsBtn.addEventListener("click", () => pointsPanel.classList.add("hide"));

  window.addEventListener("resize", resizeStage);

  updatePointsCount();
  blendLabel.textContent = `${blendSlider.value}%`;
  rotateBtn.classList.toggle("active", rotate180);
})();
