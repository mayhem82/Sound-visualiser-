(() => {
  "use strict";

  // Selective Effects -- a standalone experiment in mask-aware rendering
  // ("apply this effect only inside/outside a region"), kept as its own
  // page rather than folded into Colour Vision Extreme so nothing here
  // can risk that page's own long-tuned correction pipeline. The effect
  // engine is deliberately much simpler than Colour Vision Extreme's
  // WebGL shader (plain 2D canvas pixel processing, no colour-correction
  // math at all) -- this page exists to prove out real segmentation ->
  // real mask -> selective effect, not to duplicate that other page.
  //
  // See the caveat banner in the UI for the full honesty around this:
  // it's the only feature in the whole suite with an external
  // dependency (a real pretrained person-segmentation model, fetched
  // once from a CDN), the mask is approximate, and it only ever
  // distinguishes "person" from "everything else" -- no tap-to-select,
  // no cross-frame identity tracking. Both are real, separate future
  // work, not attempted here.

  const RENDER_WIDTH = 480;         // working resolution -- this is plain JS pixel processing, not WebGL, so kept modest
  const SEGMENTATION_INTERVAL_MS = 200; // how often a fresh mask is requested -- segmentation is the expensive part
  const RENDER_INTERVAL_MS = 100;   // ~10fps -- real per-pixel JS work on every tick, not free

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const seSupportHint = document.getElementById("seSupportHint");

  const seMain = document.getElementById("seMain");
  const seStatus = document.getElementById("seStatus");
  const modelPill = document.getElementById("modelPill");
  const modelPillText = document.getElementById("modelPillText");

  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");

  const seEffectSelect = document.getElementById("seEffectSelect");
  const sePosterizeWrap = document.getElementById("sePosterizeWrap");
  const sePosterizeSlider = document.getElementById("sePosterizeSlider");
  const sePosterizeLabel = document.getElementById("sePosterizeLabel");
  const seEdgeStrengthSlider = document.getElementById("seEdgeStrengthSlider");
  const seEdgeStrengthLabel = document.getElementById("seEdgeStrengthLabel");
  const seDuotoneLoWrap = document.getElementById("seDuotoneLoWrap");
  const seDuotoneLoInput = document.getElementById("seDuotoneLoInput");
  const seDuotoneHiWrap = document.getElementById("seDuotoneHiWrap");
  const seDuotoneHiInput = document.getElementById("seDuotoneHiInput");
  const seRegionSelect = document.getElementById("seRegionSelect");
  const seMaskUnsupportedHint = document.getElementById("seMaskUnsupportedHint");

  const video = document.getElementById("seVideo");
  const outputCanvas = document.getElementById("seOutputCanvas");
  const outputCtx = outputCanvas.getContext("2d");

  const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!hasCamera) {
    seSupportHint.textContent = "This browser doesn't support camera access.";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.4";
    startBtn.style.cursor = "not-allowed";
    return;
  }

  let renderW = RENDER_WIDTH, renderH = RENDER_WIDTH;
  let naturalCanvas, naturalCtx, effectCanvas, effectCtx, maskCanvas, maskCtx;
  let latestMaskData = null; // Uint8ClampedArray at render resolution -- red channel is person probability, 0..255
  let segmentation = null;
  let segmentationTimer = null;
  let renderTimer = null;

  let effect = "cartoon";
  let posterizeLevels = 5;
  let edgeStrength = 1; // 1.0 = 100% = the original fixed sensitivity
  let duotoneLo = hexToRgb(seDuotoneLoInput.value);
  let duotoneHi = hexToRgb(seDuotoneHiInput.value);
  let region = "everyone";

  let currentStream = null;
  let videoDevices = [];
  let switchingCamera = false;

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    return [parseInt(m.substring(0, 2), 16), parseInt(m.substring(2, 4), 16), parseInt(m.substring(4, 6), 16)];
  }

  function ensureOffscreenCanvases() {
    if (naturalCanvas) return;
    naturalCanvas = document.createElement("canvas");
    naturalCtx = naturalCanvas.getContext("2d", { willReadFrequently: true });
    effectCanvas = document.createElement("canvas");
    effectCtx = effectCanvas.getContext("2d", { willReadFrequently: true });
    maskCanvas = document.createElement("canvas");
    maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  }

  function resizeCanvases() {
    const aspect = video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 0.75;
    renderW = RENDER_WIDTH;
    renderH = Math.round(RENDER_WIDTH * aspect);
    [naturalCanvas, effectCanvas, maskCanvas, outputCanvas].forEach((c) => { c.width = renderW; c.height = renderH; });
  }

  // ---- Effect computation: real pixel processing, no WebGL, no
  // dependency -- this is the "Vision Extreme remains responsible for
  // WHAT the effect does" half of the architecture. ----

  function computeCartoonEffect(srcData) {
    const w = renderW, h = renderH;
    const src = srcData.data;
    const out = effectCtx.createImageData(w, h);
    const outD = out.data;
    const levels = posterizeLevels;
    // Cheap edge proxy: luminance gradient magnitude between neighbours,
    // same idea (much simpler execution) as Colour Vision Extreme's own
    // cartoon ink-line pass.
    const lum = new Float32Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      lum[p] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i = p * 4;
        let r = Math.round((src[i] / 255) * levels) / levels * 255;
        let g = Math.round((src[i + 1] / 255) * levels) / levels * 255;
        let b = Math.round((src[i + 2] / 255) * levels) / levels * 255;
        let gx = 0, gy = 0;
        if (x > 0 && x < w - 1) gx = lum[p + 1] - lum[p - 1];
        if (y > 0 && y < h - 1) gy = lum[p + w] - lum[p - w];
        const edge = Math.min(1, (Math.sqrt(gx * gx + gy * gy) * edgeStrength) / 60);
        r *= 1 - edge; g *= 1 - edge; b *= 1 - edge;
        outD[i] = r; outD[i + 1] = g; outD[i + 2] = b; outD[i + 3] = 255;
      }
    }
    return out;
  }

  function computeDuotoneEffect(srcData) {
    const w = renderW, h = renderH;
    const src = srcData.data;
    const out = effectCtx.createImageData(w, h);
    const outD = out.data;
    for (let i = 0; i < src.length; i += 4) {
      const l = (0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]) / 255;
      outD[i] = duotoneLo[0] + (duotoneHi[0] - duotoneLo[0]) * l;
      outD[i + 1] = duotoneLo[1] + (duotoneHi[1] - duotoneLo[1]) * l;
      outD[i + 2] = duotoneLo[2] + (duotoneHi[2] - duotoneLo[2]) * l;
      outD[i + 3] = 255;
    }
    return out;
  }

  // ---- Segmentation (MediaPipe Selfie Segmentation, loaded lazily) ----
  // Only fetched once the user actually picks a region that needs a real
  // mask -- "Segmentation should preferentially execute locally" and
  // "occurs only when requested," not on every page load regardless of
  // whether it's used.

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureSegmentation() {
    if (segmentation) return;
    modelPillText.textContent = "Segmentation model: loading…";
    try {
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js");
      if (typeof window.SelfieSegmentation !== "function") throw new Error("SelfieSegmentation unavailable after script load");
      segmentation = new window.SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      segmentation.setOptions({ modelSelection: 0 });
      segmentation.onResults((results) => {
        if (!results || !results.segmentationMask || !maskCtx) return;
        maskCtx.drawImage(results.segmentationMask, 0, 0, renderW, renderH);
        latestMaskData = maskCtx.getImageData(0, 0, renderW, renderH).data;
      });
      modelPill.className = "dmx-pill connected";
      modelPillText.textContent = "Segmentation model: ready";
    } catch (e) {
      modelPill.className = "dmx-pill error";
      modelPillText.textContent = "Segmentation model: failed to load";
      seMaskUnsupportedHint.textContent = "Couldn't load the segmentation model (needs an internet connection the first time) -- \"Everyone\" still works with no mask needed, but Background-only/Person-only have nothing to select with.";
    }
  }

  function segmentationTick() {
    if (!segmentation || region === "everyone") return;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    segmentation.send({ image: video }).catch(() => {});
  }

  // ---- Main render loop ----

  function renderTick() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    naturalCtx.drawImage(video, 0, 0, renderW, renderH);
    const naturalData = naturalCtx.getImageData(0, 0, renderW, renderH);
    const effectData = effect === "cartoon" ? computeCartoonEffect(naturalData) : computeDuotoneEffect(naturalData);

    if (region === "everyone" || !latestMaskData) {
      outputCtx.putImageData(effectData, 0, 0);
      return;
    }

    // Mask-aware composite: "the mask determines WHERE an existing
    // effect operates" -- a per-pixel mix between the untouched natural
    // frame and the computed effect frame, driven by the segmentation
    // model's own soft (not hard-thresholded) probability value, the
    // same 2D-canvas equivalent of the WebGL mix() this same idea would
    // use in a shader.
    const out = outputCtx.createImageData(renderW, renderH);
    const outD = out.data;
    const nat = naturalData.data;
    const eff = effectData.data;
    const mask = latestMaskData;
    for (let i = 0; i < outD.length; i += 4) {
      const personProb = mask[i] / 255;
      const useEffect = region === "background" ? 1 - personProb : personProb;
      outD[i] = nat[i] * (1 - useEffect) + eff[i] * useEffect;
      outD[i + 1] = nat[i + 1] * (1 - useEffect) + eff[i + 1] * useEffect;
      outD[i + 2] = nat[i + 2] * (1 - useEffect) + eff[i + 2] * useEffect;
      outD[i + 3] = 255;
    }
    outputCtx.putImageData(out, 0, 0);
  }

  seEffectSelect.addEventListener("change", () => {
    effect = seEffectSelect.value;
    sePosterizeWrap.classList.toggle("hide", effect !== "cartoon");
    seDuotoneLoWrap.classList.toggle("hide", effect !== "duotone");
    seDuotoneHiWrap.classList.toggle("hide", effect !== "duotone");
  });
  sePosterizeSlider.addEventListener("input", () => {
    posterizeLevels = Number(sePosterizeSlider.value);
    sePosterizeLabel.textContent = String(posterizeLevels);
  });
  seEdgeStrengthSlider.addEventListener("input", () => {
    edgeStrength = Number(seEdgeStrengthSlider.value) / 100;
    seEdgeStrengthLabel.textContent = `${seEdgeStrengthSlider.value}%`;
  });
  seDuotoneLoInput.addEventListener("input", () => { duotoneLo = hexToRgb(seDuotoneLoInput.value); });
  seDuotoneHiInput.addEventListener("input", () => { duotoneHi = hexToRgb(seDuotoneHiInput.value); });
  seRegionSelect.addEventListener("change", () => {
    region = seRegionSelect.value;
    if (region !== "everyone") ensureSegmentation();
  });

  // Only cartoon's controls are relevant at load (cartoon is the default).
  seDuotoneLoWrap.classList.add("hide");
  seDuotoneHiWrap.classList.add("hide");

  // ---- Camera selection -- every camera the browser can see (a phone's
  // own lenses, or a USB webcam/capture card), not just a single
  // hardcoded back-facing request. Mirrors colorvision.js's own
  // deviceId-addressed switching (shares the enumeration/active-device
  // lookup half via camera-lifecycle.js; the switching/fallback logic
  // itself is kept per-page, same as every other page in this suite --
  // see that shared file's own header comment for why).
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
    } catch (e) {
      cameraSelectWrap.classList.add("hide");
    }
  }

  async function switchToDevice(deviceId) {
    if (switchingCamera) return;
    switchingCamera = true;
    if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
      currentStream = stream;
      await attachVideoElement(video, stream);
      resizeCanvases();
      seStatus.textContent = "";
      await refreshVideoDevices();
    } catch (e) {
      seStatus.textContent = "Couldn't switch camera: " + (e.message || e.name || "unknown error");
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        currentStream = fallback;
        await attachVideoElement(video, fallback);
        resizeCanvases();
        await refreshVideoDevices();
      } catch (e2) {
        seStatus.textContent = "Camera lost -- reload the page to reconnect.";
      }
    } finally {
      switchingCamera = false;
    }
  }

  cameraSelect.addEventListener("change", () => switchToDevice(cameraSelect.value));

  startBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      currentStream = stream;
      await attachVideoElement(video, stream);
      ensureOffscreenCanvases();
      resizeCanvases();
      overlay.classList.add("hide");
      seMain.classList.remove("hide");
      if (window.WakeLockHelper) window.WakeLockHelper.enable();
      await refreshVideoDevices();
      renderTimer = setInterval(renderTick, RENDER_INTERVAL_MS);
      segmentationTimer = setInterval(segmentationTick, SEGMENTATION_INTERVAL_MS);
    } catch (e) {
      status.textContent = "Couldn't start the camera: " + (e.message || e.name || "unknown error");
    }
  });

  // Exposed for the same kind of outside-the-app sanity check the rest of
  // this session's work gets (see colour-alarm.js's __colourAlarmTestables,
  // colorvision.js's __cvAiTestables) -- lets the compositing/effect math
  // be verified with a synthetic mask instead of a real network-fetched
  // model, which a sandboxed test runner may not be able to reach at all.
  window.__selectiveEffectsTestables = {
    computeCartoonEffect,
    computeDuotoneEffect,
    setLatestMaskData: (data) => { latestMaskData = data; },
    getRenderSize: () => ({ w: renderW, h: renderH }),
    renderTick,
    ensureOffscreenCanvases,
    resizeCanvases,
    getVideoDevices: () => videoDevices,
    getEdgeStrength: () => edgeStrength
  };
})();
