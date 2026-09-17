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
  const SEGMENTATION_INTERVAL_MS = 200; // how often a fresh mask is requested -- both models share this tick, but each has its own overlap guard (see personSegmentationTick/sceneSegmentationTick), so the much heavier scene model naturally throttles itself to however long a real segment() call takes rather than actually firing every 200ms
  const RENDER_INTERVAL_MS = 100;   // ~10fps -- real per-pixel JS work on every tick, not free

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const seSupportHint = document.getElementById("seSupportHint");

  const seMain = document.getElementById("seMain");
  const seStatus = document.getElementById("seStatus");
  const modelPill = document.getElementById("modelPill");
  const modelPillText = document.getElementById("modelPillText");
  const scenePill = document.getElementById("scenePill");
  const scenePillText = document.getElementById("scenePillText");
  const sePhotoBtn = document.getElementById("sePhotoBtn");

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
  let naturalCanvas, naturalCtx, effectCanvas, effectCtx, maskCanvas, maskCtx, sceneMaskSourceCanvas;
  let latestMaskData = null; // Uint8ClampedArray at render resolution -- red channel is the current region's class probability, 0..255
  let segmentation = null;      // MediaPipe Selfie Segmentation -- powers "Person only"/"Background only"
  let sceneSegmentation = null; // DeepLab (ADE20K) -- powers "Sky only"/"Wall only"
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

  // ---- Segmentation (two real models, both loaded lazily) ----
  // Only fetched once the user actually picks a region that needs it --
  // "Segmentation should preferentially execute locally" and "occurs only
  // when requested," not on every page load regardless of whether it's
  // used. "Person only"/"Background only" use MediaPipe Selfie
  // Segmentation (person-vs-everything-else). "Sky only"/"Wall only" use
  // a second, separate model -- DeepLab trained on ADE20K -- a general
  // scene semantic segmenter that labels a frame into everyday classes
  // (sky, wall, floor, tree, ...), since a person-detector has no concept
  // of those at all. Each model is independent: only the one the current
  // region actually needs gets fetched and ticked.

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

  async function ensurePersonSegmentation() {
    if (segmentation) return;
    modelPillText.textContent = "Person model: loading…";
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
      modelPillText.textContent = "Person model: ready";
    } catch (e) {
      modelPill.className = "dmx-pill error";
      modelPillText.textContent = "Person model: failed to load";
      seMaskUnsupportedHint.textContent = "Couldn't load the person model (needs an internet connection the first time) -- \"Everyone\" still works with no mask needed, but Background-only/Person-only have nothing to select with.";
    }
  }

  // Guards against overlapping send() calls -- MediaPipe processes each
  // frame asynchronously, and on a slower device a single frame can take
  // longer than SEGMENTATION_INTERVAL_MS to finish. Firing another send()
  // before that happens backs up its internal pipeline, which then keeps
  // grinding through a growing backlog of stale frames instead of ever
  // catching up to the live camera -- looking exactly like "the mask
  // doesn't update when I move," since it's really just lagging further
  // and further behind. Waiting for each call to actually resolve (or
  // fail) before the next is allowed keeps it always working from
  // whatever the truly current frame is once it's ready.
  //
  // That guard alone isn't enough, though: in real-world use (not this
  // simple busy-flag test) a send() call can apparently just never settle
  // at all -- neither resolving nor rejecting -- under real device load,
  // which is a known rough edge of driving this model with a plain timer
  // instead of MediaPipe's own frame-scheduling helper. Once that happens
  // once, segmentationBusy would stay stuck true forever and no further
  // mask would ever be requested again -- the mask freezes at wherever it
  // last was (visible as a person-shaped hole of natural video trailing
  // at the old position as you actually move). The watchdog below forces
  // the guard back open after a generous timeout so one stuck call can't
  // permanently kill mask updates for the rest of the session.
  const SEGMENTATION_WATCHDOG_MS = 1500;
  let segmentationBusy = false;
  let segmentationBusySince = 0;
  function personSegmentationTick() {
    if (segmentationBusy && Date.now() - segmentationBusySince > SEGMENTATION_WATCHDOG_MS) {
      segmentationBusy = false;
    }
    if (!segmentation || segmentationBusy) return;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    segmentationBusy = true;
    segmentationBusySince = Date.now();
    segmentation.send({ image: video })
      .catch(() => {})
      .finally(() => { segmentationBusy = false; });
  }

  async function ensureSceneSegmentation() {
    if (sceneSegmentation) return;
    scenePillText.textContent = "Scene model: loading…";
    try {
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js");
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/@tensorflow-models/deeplab/dist/deeplab.min.js");
      if (!window.deeplab || typeof window.deeplab.load !== "function") throw new Error("deeplab unavailable after script load");
      // quantizationBytes: 2 is this model's smaller/faster download tier --
      // still a real semantic-segmentation network, just a lighter one.
      sceneSegmentation = await window.deeplab.load({ base: "ade20k", quantizationBytes: 2 });
      scenePill.className = "dmx-pill connected";
      scenePillText.textContent = "Scene model: ready";
    } catch (e) {
      scenePill.className = "dmx-pill error";
      scenePillText.textContent = "Scene model: failed to load";
      seMaskUnsupportedHint.textContent = "Couldn't load the scene model (needs an internet connection the first time) -- \"Sky only\"/\"Wall only\" have nothing to select with until it loads.";
    }
  }

  // DeepLab's result is a flat, per-pixel colour-coded label image (each
  // class gets a fixed RGB colour from its legend) rather than a single
  // probability channel. To get the same "binary mask, then let
  // sharpenMaskValue/upscaling do the antialiasing" shape the rest of
  // this page already relies on, this just picks out the one class the
  // user asked for and turns it into a plain 0/255 mask at the model's
  // own (smaller) output resolution -- the caller upscales it the same
  // way the person model's mask already gets upscaled.
  function classMaskFromResult(result, className) {
    if (!result || !result.legend || !result.segmentationMap) return null;
    const { legend, width, height, segmentationMap } = result;
    let target = legend[className];
    if (!target) {
      // ADE20K legend keys are sometimes "name;synonym;synonym" --
      // fall back to matching just the first name if an exact key miss.
      const key = Object.keys(legend).find((k) => k.toLowerCase().split(";")[0] === className);
      target = key ? legend[key] : null;
    }
    if (!target) return null;
    const [tr, tg, tb] = target;
    const out = new Uint8ClampedArray(width * height * 4);
    for (let p = 0, i = 0; p < width * height; p++, i += 4) {
      const v = (segmentationMap[i] === tr && segmentationMap[i + 1] === tg && segmentationMap[i + 2] === tb) ? 255 : 0;
      out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
    }
    return { data: out, width, height };
  }

  function applyClassMaskToLatest(classMask) {
    if (!classMask || !maskCtx) return;
    if (!sceneMaskSourceCanvas) sceneMaskSourceCanvas = document.createElement("canvas");
    sceneMaskSourceCanvas.width = classMask.width;
    sceneMaskSourceCanvas.height = classMask.height;
    sceneMaskSourceCanvas.getContext("2d").putImageData(
      new ImageData(classMask.data, classMask.width, classMask.height), 0, 0
    );
    maskCtx.drawImage(sceneMaskSourceCanvas, 0, 0, renderW, renderH);
    latestMaskData = maskCtx.getImageData(0, 0, renderW, renderH).data;
  }

  // Same overlap guard as the person model, above -- DeepLab is a much
  // heavier network, so a single call taking longer than one tick is the
  // normal case here, not the exception. Same watchdog too, for the same
  // "a call that never settles must not freeze the mask forever" reason.
  let sceneSegmentationBusy = false;
  let sceneSegmentationBusySince = 0;
  function sceneSegmentationTick() {
    if (sceneSegmentationBusy && Date.now() - sceneSegmentationBusySince > SEGMENTATION_WATCHDOG_MS) {
      sceneSegmentationBusy = false;
    }
    if (!sceneSegmentation || sceneSegmentationBusy) return;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    sceneSegmentationBusy = true;
    sceneSegmentationBusySince = Date.now();
    sceneSegmentation.segment(video)
      .then((result) => applyClassMaskToLatest(classMaskFromResult(result, region)))
      .catch(() => {})
      .finally(() => { sceneSegmentationBusy = false; });
  }

  function segmentationTick() {
    if (region === "person" || region === "background") personSegmentationTick();
    else if (region === "sky" || region === "wall") sceneSegmentationTick();
  }

  // The segmentation model's own mask is typically produced at a lower
  // internal resolution than this page's 480px working canvas, so
  // drawImage()'s upscale smooths a naturally crisp silhouette into a
  // wide, soft gradient at the boundary -- especially around hair or,
  // here, a headset, where the model itself is already less certain.
  // That soft band is exactly what shows up as a pale "halo" or "ghost"
  // hanging around the real edge instead of a tight cutout. Steepening
  // the 0..1 probability around its midpoint narrows that transition
  // back down to a thin antialiased edge without going fully
  // hard-thresholded/jagged: anything already fairly confident (roughly
  // outside the middle third) snaps all the way to 0 or 1, only genuinely
  // ambiguous pixels near dead centre still blend.
  const MASK_SHARPNESS = 3;
  function sharpenMaskValue(p) {
    return Math.max(0, Math.min(1, 0.5 + (p - 0.5) * MASK_SHARPNESS));
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
      const personProb = sharpenMaskValue(mask[i] / 255);
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
    // A mask left over from the previous region belongs to a different
    // class entirely (e.g. "person" shaped, picked while switching to
    // "sky") -- drop it rather than briefly compositing with the wrong
    // region's mask until the newly-selected model's first result lands.
    latestMaskData = null;
    if (region === "person" || region === "background") ensurePersonSegmentation();
    else if (region === "sky" || region === "wall") ensureSceneSegmentation();
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

  // ---- Photo capture -- downloads exactly what's on screen (the
  // composited output canvas: effect + mask already baked in), the same
  // "capture the actual displayed canvas, not a re-render" approach
  // colorvision.js's own takePhoto() uses. This page's canvas is plain
  // 2D (no WebGL preserveDrawingBuffer concern), so toBlob() just works.
  function timestampForFilename() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function takeSelectivePhoto() {
    outputCanvas.toBlob((blob) => {
      if (!blob) {
        seStatus.textContent = "Couldn't capture a photo -- try again.";
        return;
      }
      downloadBlob(blob, `selective-effects-photo-${timestampForFilename()}.png`);
    }, "image/png");
  }

  sePhotoBtn.addEventListener("click", takeSelectivePhoto);

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
    sharpenMaskValue,
    classMaskFromResult,
    setLatestMaskData: (data) => { latestMaskData = data; },
    getLatestMaskData: () => latestMaskData,
    getRenderSize: () => ({ w: renderW, h: renderH }),
    renderTick,
    ensureOffscreenCanvases,
    resizeCanvases,
    getVideoDevices: () => videoDevices,
    getEdgeStrength: () => edgeStrength,
    segmentationTick,
    setSegmentation: (obj) => { segmentation = obj; },
    setSceneSegmentation: (obj) => { sceneSegmentation = obj; },
    setRegion: (r) => { region = r; },
    getRegion: () => region,
    takeSelectivePhoto
  };
})();
