(() => {
  "use strict";

  // ============================================================
  // This page reuses Colour Vision Extreme's correction pipeline —
  // same shader math (daltonize, Lab-weighted calibrated-point
  // correction, cartoon/duotone, outline edges), same calibration
  // data (reads the same localStorage key colorvision.html writes
  // to), same capability-gated camera controls (torch/exposure) —
  // reimplemented here rather than imported, since colorvision.js is
  // a self-contained page script, not a library, and the brief is
  // explicit that colorvision.html must not be touched or broken.
  //
  // On top of that pipeline sits the actual point of this page: a
  // recorded-automation engine. A Template is a full snapshot of the
  // control panel at record-start, plus a recording of the params
  // that changed *over time* on top of it. Triggering a Template —
  // in Studio or in Live — always reproduces that exact snapshot
  // first, so playback never depends on whatever's currently live;
  // Studio only authors Templates, it isn't a live preview feed into
  // Live mode. See PARAMS/Recorder/Player/TemplateStore below.
  // ============================================================

  const CALIBRATION_STORAGE_KEY = "cvCalibrationPoints_v1";
  const MAX_POINTS = 32;
  const TEMPLATES_KEY = "vpTemplates_v1";
  const TAKES_META_KEY = "vpTakesMeta_v1";
  const LIVE_LAYOUT_KEY = "vpLiveLayout_v1";
  const SCHEDULED_CUES_KEY = "vpScheduledCues_v1";

  // ---- Colour math (JS side, mirrors the shader) ----

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  function hexToRgb01(hex) {
    const m = (hex || "#000000").replace("#", "");
    return [
      parseInt(m.substring(0, 2), 16) / 255,
      parseInt(m.substring(2, 4), 16) / 255,
      parseInt(m.substring(4, 6), 16) / 255
    ];
  }

  function rgb01ToHex([r, g, b]) {
    const c = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

  function rgb2lab(r, g, b) {
    const rl = srgbToLinear(r), gl_ = srgbToLinear(g), bl = srgbToLinear(b);
    const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
    const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
    const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  const CVD_TYPE_CODES = { none: 0, protan: 1, deutan: 2, tritan: 3 };

  // ---- Shader (correction + daltonize + cartoon/duotone + outline,
  // ported from colorvision.js's FRAG_SRC, plus new global exposure/
  // contrast/brightness/saturation uniforms this page's Image group
  // drives — audio tint is out of scope here, there's no mic story) ----

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
    uniform float uBlend;
    uniform float uOutlineEnabled;
    uniform float uOutlineThickness;
    uniform float uOutlineBlend;
    uniform float uOutlineOpacity;
    uniform vec3 uOutlineColor;
    uniform float uCartoonEnabled;
    uniform float uCartoonBlend;
    uniform float uCartoonLevels;
    uniform float uCartoonEdgeThickness;
    uniform float uCartoonEdgeStrength;
    uniform float uCartoonSaturation;
    uniform float uDuoEnabled;
    uniform float uDuoBlend;
    uniform vec3 uDuoLo;
    uniform vec3 uDuoHi;
    uniform vec2 uTexelSize;
    uniform float uSpread;
    uniform int uPointCount;
    uniform vec3 uSourceLab[${MAX_POINTS}];
    uniform vec3 uCorrection[${MAX_POINTS}];
    uniform vec2 uCorrection2[${MAX_POINTS}];
    uniform int uCvdType;
    uniform float uCvdStrength;
    uniform float uExposure;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uSaturation;

    float srgbToLinear(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
    float linearToSrgb(float c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055; }

    vec3 daltonize(vec3 srgbColor, int type, float strength) {
      if (type == 0 || strength <= 0.0) return srgbColor;
      vec3 lin = vec3(srgbToLinear(srgbColor.r), srgbToLinear(srgbColor.g), srgbToLinear(srgbColor.b));
      mat3 sim; mat3 errMat;
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
      vec3 correctedSrgb = vec3(linearToSrgb(correctedLin.r), linearToSrgb(correctedLin.g), linearToSrgb(correctedLin.b));
      return mix(srgbColor, correctedSrgb, strength);
    }

    vec3 rgb2lab(vec3 c) {
      float r = srgbToLinear(c.r); float g = srgbToLinear(c.g); float b = srgbToLinear(c.b);
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
      float mx = max(max(c.r, c.g), c.b); float mn = min(min(c.r, c.g), c.b);
      float h = 0.0; float s = 0.0; float l = (mx + mn) * 0.5; float d = mx - mn;
      if (d > 0.0001) {
        s = d / (1.0 - abs(2.0 * l - 1.0));
        if (mx == c.r) { h = mod((c.g - c.b) / d, 6.0); }
        else if (mx == c.g) { h = (c.b - c.r) / d + 2.0; }
        else { h = (c.r - c.g) / d + 4.0; }
        h *= 60.0; if (h < 0.0) h += 360.0;
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

    float cvLuminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    float cvEdgeStrength(vec2 uv, float thickness) {
      vec2 t = uTexelSize * max(thickness, 0.0001);
      float tl = cvLuminance(texture2D(uTex, uv + vec2(-t.x, -t.y)).rgb);
      float tc = cvLuminance(texture2D(uTex, uv + vec2(0.0, -t.y)).rgb);
      float tr = cvLuminance(texture2D(uTex, uv + vec2(t.x, -t.y)).rgb);
      float ml = cvLuminance(texture2D(uTex, uv + vec2(-t.x, 0.0)).rgb);
      float mr = cvLuminance(texture2D(uTex, uv + vec2(t.x, 0.0)).rgb);
      float bl = cvLuminance(texture2D(uTex, uv + vec2(-t.x, t.y)).rgb);
      float bc = cvLuminance(texture2D(uTex, uv + vec2(0.0, t.y)).rgb);
      float br = cvLuminance(texture2D(uTex, uv + vec2(t.x, t.y)).rgb);
      float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
      float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
      return clamp(length(vec2(gx, gy)), 0.0, 1.0);
    }

    vec3 cvCartoonize(vec3 c, float levels, float saturation) {
      vec3 hsl = rgb2hsl(c);
      hsl.y = clamp(hsl.y * saturation + 0.05, 0.0, 1.0);
      vec3 boosted = hsl2rgb(hsl);
      float lv = max(levels, 2.0);
      return clamp(floor(boosted * lv) / (lv - 1.0), 0.0, 1.0);
    }

    float cvCartoonLine(vec2 uv, float thickness, float strength) {
      float edge = cvEdgeStrength(uv, thickness);
      float lo = mix(0.30, 0.04, strength);
      float hi = lo + 0.18;
      float opacity = mix(0.35, 1.0, strength);
      return smoothstep(lo, hi, edge) * opacity;
    }

    vec3 cvDuoColour(vec3 c, vec3 lo, vec3 hi) {
      float lum = cvLuminance(c);
      return mix(lo, hi, lum);
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
        totalWeight += 1.0 / (2500.0 + uSpread);
        correction = weightedSum / totalWeight;
        correction2 = weightedSum2 / totalWeight;
      }

      vec3 hsl = rgb2hsl(base);
      hsl.x = mod(hsl.x + correction.x + 360.0, 360.0);
      hsl.y = clamp(hsl.y + correction.y, 0.0, 1.0);
      hsl.z = clamp(hsl.z + correction.z, 0.0, 1.0);
      vec3 corrected = hsl2rgb(hsl);

      float contMul = 1.0 + correction2.x;
      float expMul = pow(2.0, correction2.y);
      corrected = clamp((corrected * expMul - 0.5) * contMul + 0.5, 0.0, 1.0);

      vec3 filled = mix(original, corrected, uBlend);
      vec3 finalColor = filled;
      if (uCartoonEnabled > 0.5) {
        vec3 toon = cvCartoonize(filled, uCartoonLevels, uCartoonSaturation);
        float line = cvCartoonLine(vUv, uCartoonEdgeThickness, uCartoonEdgeStrength);
        toon = mix(toon, vec3(0.02), line);
        finalColor = mix(filled, toon, uCartoonBlend);
      }
      if (uDuoEnabled > 0.5) {
        finalColor = mix(finalColor, cvDuoColour(finalColor, uDuoLo, uDuoHi), uDuoBlend);
      }
      if (uOutlineEnabled > 0.5) {
        float edge = cvEdgeStrength(vUv, uOutlineThickness) * uOutlineOpacity;
        vec3 outlineColor = uOutlineColor * edge;
        finalColor = mix(finalColor, outlineColor, uOutlineBlend);
      }

      // Global image adjustments — this page's own Exposure/Contrast/
      // Brightness/Saturation sliders, applied last, on top of everything
      // above (correction, cartoon, outline) so they read as a camera-like
      // grade over the whole shot rather than fighting the per-colour
      // correction math.
      vec3 satHsl = rgb2hsl(finalColor);
      satHsl.y = clamp(satHsl.y + uSaturation, 0.0, 1.0);
      finalColor = hsl2rgb(satHsl);
      finalColor = clamp(finalColor * pow(2.0, uExposure * 2.0), 0.0, 1.0);
      finalColor = clamp(finalColor + uBrightness * 0.5, 0.0, 1.0);
      finalColor = clamp((finalColor - 0.5) * (1.0 + uContrast) + 0.5, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function compileShaderFor(glCtx, type, src) {
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

  // Factored out of initGLContext so a second camera feed (dual/PiP mode)
  // can get its own texture using the exact same setup, without needing a
  // second shader program — both textures are sampled by the same uTex
  // uniform, one draw call at a time, just rebound between them.
  function createVideoTexture(glCtx) {
    const tex = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
    glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL, true);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);
    return tex;
  }

  function initGLContext(canvas) {
    const glCtx = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true }) ||
      canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!glCtx) throw new Error("WebGL not supported on this device/browser.");
    const vs = compileShaderFor(glCtx, glCtx.VERTEX_SHADER, VERT_SRC);
    const fs = compileShaderFor(glCtx, glCtx.FRAGMENT_SHADER, FRAG_SRC);
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
      throw new Error("Program link error: " + glCtx.getProgramInfoLog(prog));
    }
    glCtx.useProgram(prog);
    const qBuf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, qBuf);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), glCtx.STATIC_DRAW);
    const aPos = glCtx.getAttribLocation(prog, "aPos");
    glCtx.enableVertexAttribArray(aPos);
    glCtx.vertexAttribPointer(aPos, 2, glCtx.FLOAT, false, 0, 0);
    const tex = createVideoTexture(glCtx);
    const uniformNames = [
      "uTex", "uBlend", "uOutlineEnabled", "uOutlineThickness", "uOutlineBlend", "uOutlineOpacity", "uOutlineColor",
      "uCartoonEnabled", "uCartoonBlend", "uCartoonLevels", "uCartoonEdgeThickness", "uCartoonEdgeStrength", "uCartoonSaturation",
      "uDuoEnabled", "uDuoBlend", "uDuoLo", "uDuoHi", "uTexelSize", "uSpread", "uPointCount", "uSourceLab", "uCorrection",
      "uCorrection2", "uCvdType", "uCvdStrength", "uExposure", "uContrast", "uBrightness", "uSaturation",
      "uRotate180", "uUvScale", "uUvOffset"
    ];
    const uni = {};
    uniformNames.forEach((n) => { uni[n] = glCtx.getUniformLocation(prog, n); });
    return { gl: glCtx, program: prog, uniforms: uni, quadBuffer: qBuf, videoTexture: tex };
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

  // Digital zoom: crops further into the centre of the already
  // cover-fitted UV rect. Real hardware zoom (when the camera supports
  // the `zoom` constraint) is tried first in setZoom() below; this is
  // always applied on top as a multiplier (1 when hardware zoom covered
  // the whole requested amount, >1 for the remainder or as the sole
  // mechanism when hardware zoom isn't available at all).
  function applyDigitalZoom(cover, zoomFactor) {
    const z = Math.max(1, zoomFactor);
    if (z <= 1.0001) return cover;
    const sx = cover.sx / z, sy = cover.sy / z;
    return { sx, sy, ox: cover.ox + (cover.sx - sx) / 2, oy: cover.oy + (cover.sy - sy) / 2 };
  }

  // ============================================================
  // Calibration (read-only reuse of colorvision.html's saved points)
  // ============================================================

  function loadCalibrationPoints() {
    try {
      const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function uploadPointUniforms(glCtx, prog, uni, points) {
    const count = Math.min(points.length, MAX_POINTS);
    const labArr = new Float32Array(MAX_POINTS * 3);
    const corrArr = new Float32Array(MAX_POINTS * 3);
    const corr2Arr = new Float32Array(MAX_POINTS * 2);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const [L, A, B] = rgb2lab(p.sourceColor[0], p.sourceColor[1], p.sourceColor[2]);
      labArr[i * 3] = L; labArr[i * 3 + 1] = A; labArr[i * 3 + 2] = B;
      corrArr[i * 3] = p.hueShift; corrArr[i * 3 + 1] = p.satAdjust; corrArr[i * 3 + 2] = p.lightAdjust;
      corr2Arr[i * 2] = p.contrastAdjust || 0; corr2Arr[i * 2 + 1] = p.exposureAdjust || 0;
    }
    glCtx.useProgram(prog);
    glCtx.uniform1i(uni.uPointCount, count);
    glCtx.uniform3fv(uni.uSourceLab, labArr);
    glCtx.uniform3fv(uni.uCorrection, corrArr);
    glCtx.uniform2fv(uni.uCorrection2, corr2Arr);
  }

  window.VP_CORE = {
    hexToRgb01, rgb01ToHex, rgb2lab, clamp01, CVD_TYPE_CODES,
    VERT_SRC, FRAG_SRC, compileShaderFor, initGLContext, computeCoverUv,
    applyDigitalZoom, createVideoTexture, loadCalibrationPoints, uploadPointUniforms,
    CALIBRATION_STORAGE_KEY, MAX_POINTS, TEMPLATES_KEY, TAKES_META_KEY, LIVE_LAYOUT_KEY, SCHEDULED_CUES_KEY
  };
})();
