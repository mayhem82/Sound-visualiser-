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
  const objectPill = document.getElementById("objectPill");
  const objectPillText = document.getElementById("objectPillText");
  const sePhotoBtn = document.getElementById("sePhotoBtn");
  const seAiObjectWrap = document.getElementById("seAiObjectWrap");
  const seAiObjectInput = document.getElementById("seAiObjectInput");
  const seAiObjectApplyBtn = document.getElementById("seAiObjectApplyBtn");
  const seAiObjectStatus = document.getElementById("seAiObjectStatus");
  const seDescribeBtn = document.getElementById("seDescribeBtn");
  const seDescribeResult = document.getElementById("seDescribeResult");

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
  const seOutlineThicknessWrap = document.getElementById("seOutlineThicknessWrap");
  const seOutlineThicknessSlider = document.getElementById("seOutlineThicknessSlider");
  const seOutlineThicknessLabel = document.getElementById("seOutlineThicknessLabel");
  const seOutlineBlendWrap = document.getElementById("seOutlineBlendWrap");
  const seOutlineBlendSlider = document.getElementById("seOutlineBlendSlider");
  const seOutlineBlendLabel = document.getElementById("seOutlineBlendLabel");
  const seOutlineOpacityWrap = document.getElementById("seOutlineOpacityWrap");
  const seOutlineOpacitySlider = document.getElementById("seOutlineOpacitySlider");
  const seOutlineOpacityLabel = document.getElementById("seOutlineOpacityLabel");
  const seOutlineColorWrap = document.getElementById("seOutlineColorWrap");
  const seOutlineColorInput = document.getElementById("seOutlineColorInput");
  const seRegionSelect = document.getElementById("seRegionSelect");
  const seMaskUnsupportedHint = document.getElementById("seMaskUnsupportedHint");
  const seMaskDebug = document.getElementById("seMaskDebug");
  const seAudioTintBtn = document.getElementById("seAudioTintBtn");
  const seAudioTintStrengthWrap = document.getElementById("seAudioTintStrengthWrap");
  const seAudioTintStrengthSlider = document.getElementById("seAudioTintStrengthSlider");
  const seAudioTintStrengthLabel = document.getElementById("seAudioTintStrengthLabel");
  const seAudioTintStatus = document.getElementById("seAudioTintStatus");

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
  let objectDetector = null;    // OWL-ViT (zero-shot object detection) -- powers "AI: isolate a described object" and "Describe what the camera sees"
  let objectSnapshotCanvas = null;
  let segmentationTimer = null;
  let renderTimer = null;

  // Diagnostic counters only -- not used by any rendering logic. Whether
  // a stuck mask is "calls not being made" vs. "calls made but never
  // producing a usable result" (e.g. the model itself silently skipping
  // frames it decides are too close together) looks identical from the
  // outside, and this sandbox can't run either model against a real
  // moving camera to tell them apart. Surfacing both counts + how long
  // ago a result actually landed turns "still broken" into something
  // that can be root-caused from a screenshot instead of guessed at again.
  let personSegRequests = 0, personSegResults = 0, personSegLastResultAt = 0;
  let sceneSegRequests = 0, sceneSegResults = 0, sceneSegLastResultAt = 0;
  let objectSegRequests = 0, objectSegResults = 0, objectSegLastResultAt = 0;

  let effect = "cartoon";
  let posterizeLevels = 5;
  let edgeStrength = 1; // 1.0 = 100% = the original fixed sensitivity
  let duotoneLo = hexToRgb(seDuotoneLoInput.value);
  let duotoneHi = hexToRgb(seDuotoneHiInput.value);
  // Outlines mode, ported from Colour Vision Extreme with the same
  // defaults/ranges as its own thickness/blend/opacity/colour sliders --
  // see computeOutlineEffect() for the shared Sobel-edge algorithm.
  let outlineThickness = Number(seOutlineThicknessSlider.value);
  let outlineBlend = Number(seOutlineBlendSlider.value) / 100;
  let outlineOpacity = Number(seOutlineOpacitySlider.value) / 100;
  let outlineColor = hexToRgb(seOutlineColorInput.value);
  let region = "everyone";
  let aiObjectQuery = ""; // the phrase last submitted via "AI: isolate a described object"

  // A fixed vocabulary "Describe what the camera sees" checks the frame
  // against -- OWL-ViT is a zero-shot DETECTOR, not a caption generator:
  // it can only score/locate labels it's actually given, it can't freely
  // describe a scene in its own words. This list is deliberately broad
  // (common household/everyday objects) so a real result is likely, but
  // it's still a checklist, not understanding -- the result text says so.
  const DEFAULT_SCENE_VOCAB = [
    "person", "face", "hand", "chair", "table", "sofa", "bed", "door", "window",
    "wall", "floor", "ceiling", "sky", "tree", "plant", "car", "bicycle",
    "laptop", "computer", "phone", "television", "book", "cup", "bottle",
    "bag", "shoe", "lamp", "clock", "mirror", "picture frame", "plate",
    "keyboard", "mouse", "remote control", "pillow", "curtain", "rug", "dog", "cat"
  ];

  let currentStream = null;
  let videoDevices = [];
  let switchingCamera = false;

  // ---- Audio tint, ported from Colour Vision Extreme's own Audio colour
  // tint -- the "core" version: just Strength + the 3 default bands, their
  // hue/gain/Hz ranges fixed at CVE's own shipped defaults rather than
  // individually tunable (CVE's own sat/light push, smoothing, resolution,
  // update rate, and 3 extra fully-open bands are real settings too, just
  // not reproduced here). Unlike CVE (whole-frame mood pass), this only
  // nudges hue inside the currently selected/isolated region -- see the
  // audio-tint step inside renderTick()'s masked-compositing loop.
  const AUDIO_TINT_BANDS = [
    { hue: 262, gain: 1.0, fromHz: 20, toHz: 150 },    // violet -- bass/kick
    { hue: 189, gain: 1.0, fromHz: 150, toHz: 2000 },  // cyan -- mids
    { hue: 330, gain: 0.85, fromHz: 2000, toHz: 9000 } // pink -- treble
  ];
  let audioTintEnabled = false;
  let audioTintStrength = Number(seAudioTintStrengthSlider.value) / 100;
  let audioTintStream = null;
  let audioTintCtx = null;
  let audioTintAnalyser = null;
  let audioTintFreqData = null;
  let audioTintHue = 0;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const hasAudioTintSupport = !!AudioContextCtor;
  if (!hasAudioTintSupport) seAudioTintBtn.classList.add("hide");

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    return [parseInt(m.substring(0, 2), 16), parseInt(m.substring(2, 4), 16), parseInt(m.substring(4, 6), 16)];
  }

  // Standard RGB<->HSL round-trip, 0..1 in and out throughout (matches
  // colour-math.js's own rgb2hsl/hsl2rgb convention elsewhere in this
  // suite) -- callers here convert to/from this page's usual 0..255 bytes.
  function rgb2hsl01(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function hsl2rgb01(h, s, l) {
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

  // Same weighted-average-by-energy formula as CVE's own
  // computeAudioTintHue(): each band's share of the blended hue is its
  // live frequency-range energy times its gain, normalized across bands.
  function computeAudioTintHue() {
    if (!audioTintAnalyser || !audioTintCtx || !audioTintFreqData) return;
    const nyquist = audioTintCtx.sampleRate / 2;
    audioTintAnalyser.getByteFrequencyData(audioTintFreqData);
    const n = audioTintFreqData.length;
    let weightedHue = 0, totalEnergy = 0;
    for (const band of AUDIO_TINT_BANDS) {
      const from = Math.min(1, band.fromHz / nyquist);
      const to = Math.min(1, band.toHz / nyquist);
      const start = Math.floor(from * n);
      const end = Math.max(start + 1, Math.floor(to * n));
      let sum = 0;
      for (let i = start; i < end; i++) sum += audioTintFreqData[i];
      const rawEnergy = sum / (end - start) / 255;
      const energy = rawEnergy * band.gain;
      weightedHue += band.hue * energy;
      totalEnergy += energy;
    }
    if (totalEnergy > 0) audioTintHue = weightedHue / totalEnergy;
  }

  async function startAudioTint() {
    if (audioTintStream) return;
    try {
      audioTintStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioTintCtx = new AudioContextCtor();
      const source = audioTintCtx.createMediaStreamSource(audioTintStream);
      audioTintAnalyser = audioTintCtx.createAnalyser();
      audioTintAnalyser.fftSize = 1024; // matches CVE's own default
      audioTintAnalyser.smoothingTimeConstant = 0.7; // matches CVE's own default
      source.connect(audioTintAnalyser);
      audioTintFreqData = new Uint8Array(audioTintAnalyser.frequencyBinCount);
      seAudioTintStatus.textContent = "";
    } catch (e) {
      seAudioTintStatus.textContent = "Couldn't get microphone access: " + (e.message || e.name || "unknown error");
      audioTintEnabled = false;
      updateAudioTintUi();
    }
  }

  function stopAudioTint() {
    if (audioTintStream) { audioTintStream.getTracks().forEach((t) => t.stop()); audioTintStream = null; }
    if (audioTintCtx) { audioTintCtx.close().catch(() => {}); audioTintCtx = null; }
    audioTintAnalyser = null;
    audioTintFreqData = null;
  }

  function updateAudioTintUi() {
    seAudioTintBtn.textContent = `Audio tint (on selected object): ${audioTintEnabled ? "On" : "Off"}`;
    seAudioTintBtn.setAttribute("aria-pressed", String(audioTintEnabled));
    seAudioTintStrengthWrap.classList.toggle("hide", !audioTintEnabled);
  }

  async function toggleAudioTint() {
    audioTintEnabled = !audioTintEnabled;
    updateAudioTintUi();
    if (audioTintEnabled) await startAudioTint();
    else stopAudioTint();
  }
  seAudioTintBtn.addEventListener("click", toggleAudioTint);
  seAudioTintStrengthSlider.addEventListener("input", () => {
    audioTintStrength = Number(seAudioTintStrengthSlider.value) / 100;
    seAudioTintStrengthLabel.textContent = `${seAudioTintStrengthSlider.value}%`;
  });

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

  // Outlines mode, ported from Colour Vision Extreme's own WebGL shader
  // (cvEdgeStrength/uOutlineEnabled) as plain 2D-canvas pixel math, same
  // "port the idea, not the renderer" approach the rest of this page's
  // effect engine already takes. Same algorithm: a Sobel edge-strength
  // estimate on luminance (0.299/0.587/0.114 weights, matching CVE's own
  // cvLuminance -- not this page's other Rec.709 weights used elsewhere),
  // sampled at neighbour offsets `thickness` pixels away, scaled by
  // opacity, then that edge-coloured result is mixed with the original
  // image by `blend` (0 = untouched original, 1 = pure black-background
  // coloured line art) -- identical maths to CVE's
  // `finalColor = mix(finalColor, outlineColor, uOutlineBlend)`.
  function computeOutlineEffect(srcData) {
    const w = renderW, h = renderH;
    const src = srcData.data;
    const out = effectCtx.createImageData(w, h);
    const outD = out.data;
    const lum = new Float32Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      lum[p] = (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) / 255;
    }
    const t = Math.max(1, Math.round(outlineThickness));
    const [ocR, ocG, ocB] = outlineColor;
    for (let y = 0; y < h; y++) {
      const ym = Math.max(0, y - t), yp = Math.min(h - 1, y + t);
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const xm = Math.max(0, x - t), xp = Math.min(w - 1, x + t);
        const tl = lum[ym * w + xm], tc = lum[ym * w + x], tr = lum[ym * w + xp];
        const ml = lum[y * w + xm], mr = lum[y * w + xp];
        const bl = lum[yp * w + xm], bc = lum[yp * w + x], br = lum[yp * w + xp];
        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const edge = Math.min(1, Math.sqrt(gx * gx + gy * gy)) * outlineOpacity;
        const outR = ocR * edge, outG = ocG * edge, outB = ocB * edge;
        outD[i] = src[i] * (1 - outlineBlend) + outR * outlineBlend;
        outD[i + 1] = src[i + 1] * (1 - outlineBlend) + outG * outlineBlend;
        outD[i + 2] = src[i + 2] * (1 - outlineBlend) + outB * outlineBlend;
        outD[i + 3] = 255;
      }
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

  // Which model "family" a region belongs to -- used below to reject a
  // stale result. Each model's request is fire-and-forget against
  // whatever region was active when it was sent; if you switch to a
  // different family before it resolves (e.g. Person -> Sky, or even
  // Person -> Everyone -> Sky), the late result must not get applied
  // just because it happens to land while some other region is active.
  // Without this, a late arrival could silently paint the wrong model's
  // mask into the current region's compositing -- most confusingly when
  // it crosses model families, since DeepLab's ADE20K classes include
  // "person" too, so a late scene-model result could pass a person-shaped
  // mask into what looks like the dedicated person-model's job.
  function isPersonFamily(r) { return r === "person" || r === "background"; }
  function isSceneFamily(r) { return r === "sky" || r === "wall"; }
  function isObjectFamily(r) { return r === "ai-object"; }

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
        // The request that produced this result may have been fired
        // while a person-family region was active, but the region can
        // have moved on to something else entirely by the time it
        // resolves -- discard it rather than paint a person mask into
        // whatever's current now.
        if (!isPersonFamily(region)) return;
        maskCtx.drawImage(results.segmentationMask, 0, 0, renderW, renderH);
        latestMaskData = maskCtx.getImageData(0, 0, renderW, renderH).data;
        personSegResults++;
        personSegLastResultAt = Date.now();
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
    personSegRequests++;
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
    sceneSegLastResultAt = Date.now();
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
    sceneSegRequests++;
    sceneSegmentation.segment(video)
      .then((result) => {
        // Same stale-result guard as the person model -- by the time
        // this resolves, region may no longer even be a scene-family
        // one (Sky/Wall), and classMaskFromResult(result, region) would
        // otherwise happily look up whatever region's now current as an
        // ADE20K class name (it does include "person"), cross-
        // contaminating an unrelated model's mask into the wrong region.
        if (!isSceneFamily(region)) return;
        sceneSegResults++;
        applyClassMaskToLatest(classMaskFromResult(result, region));
      })
      .catch(() => {})
      .finally(() => { sceneSegmentationBusy = false; });
  }

  // ---- Object detector (OWL-ViT, loaded lazily) -- open-vocabulary --
  // unlike the person/scene models above, this one isn't limited to a
  // fixed class list: it scores/locates whatever short phrase you type
  // against the frame. That flexibility comes from a real (if heavier)
  // vision-language model rather than a plain classifier, loaded via
  // transformers.js (an ES module, hence the dynamic import() below
  // rather than loadScriptOnce's classic <script> tag) running entirely
  // in-browser (WebAssembly) -- same "never uploads your camera feed"
  // promise as the other two models, just a bigger one-time download.
  async function ensureObjectDetector() {
    if (objectDetector) return;
    objectPillText.textContent = "Object model: loading…";
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      if (typeof mod.pipeline !== "function") throw new Error("transformers.js pipeline unavailable after import");
      if (mod.env) mod.env.allowLocalModels = false;
      objectDetector = await mod.pipeline("zero-shot-object-detection", "Xenova/owlvit-base-patch32");
      objectPill.className = "dmx-pill connected";
      objectPillText.textContent = "Object model: ready";
    } catch (e) {
      objectPill.className = "dmx-pill error";
      objectPillText.textContent = "Object model: failed to load";
      seMaskUnsupportedHint.textContent = "Couldn't load the object model (needs an internet connection the first time) -- \"AI: isolate\" and \"Describe what the camera sees\" have nothing to work with until it loads.";
    }
  }

  function captureObjectSnapshotDataUrl() {
    if (!objectSnapshotCanvas) objectSnapshotCanvas = document.createElement("canvas");
    objectSnapshotCanvas.width = renderW;
    objectSnapshotCanvas.height = renderH;
    objectSnapshotCanvas.getContext("2d").drawImage(video, 0, 0, renderW, renderH);
    return objectSnapshotCanvas.toDataURL("image/png");
  }

  // OWL-ViT returns a list of {score, label, box} candidates for however
  // many labels you gave it -- for "isolate this one thing" only the
  // single strongest match matters.
  function pickBestDetection(detections) {
    if (!Array.isArray(detections) || detections.length === 0) return null;
    return detections.reduce((best, d) => (!best || d.score > best.score) ? d : best, null);
  }

  // A bounding box, not a silhouette -- OWL-ViT localises with a
  // rectangle, it doesn't produce a per-pixel cutout the way the person/
  // scene models above do. The mask is plain 0/255 inside/outside that
  // box at the page's own working resolution (the box coordinates are
  // already in that space, since the snapshot fed to the detector was
  // captured at exactly renderW x renderH -- no rescaling needed).
  function boxToMask(box, w, h) {
    if (!box) return null;
    const out = new Uint8ClampedArray(w * h * 4);
    const xmin = Math.max(0, Math.round(box.xmin));
    const xmax = Math.min(w, Math.round(box.xmax));
    const ymin = Math.max(0, Math.round(box.ymin));
    const ymax = Math.min(h, Math.round(box.ymax));
    for (let y = ymin; y < ymax; y++) {
      for (let x = xmin; x < xmax; x++) {
        const i = (y * w + x) * 4;
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255;
      }
    }
    return { data: out, width: w, height: h };
  }

  function applyBoxMaskToLatest(boxMask) {
    if (!boxMask) return;
    latestMaskData = boxMask.data;
    objectSegLastResultAt = Date.now();
  }

  // Same busy+watchdog shape as the other two models. This is by far the
  // heaviest of the three (a full vision-language model, not a small
  // real-time segmenter), so ticks naturally space themselves out to
  // however long a real detection call actually takes.
  let objectSegmentationBusy = false;
  let objectSegmentationBusySince = 0;
  function objectSegmentationTick() {
    if (objectSegmentationBusy && Date.now() - objectSegmentationBusySince > SEGMENTATION_WATCHDOG_MS) {
      objectSegmentationBusy = false;
    }
    if (!objectDetector || !aiObjectQuery || objectSegmentationBusy) return;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    objectSegmentationBusy = true;
    objectSegmentationBusySince = Date.now();
    objectSegRequests++;
    const dataUrl = captureObjectSnapshotDataUrl();
    const w = renderW, h = renderH;
    const query = aiObjectQuery;
    objectDetector(dataUrl, [query], { threshold: 0.1, topk: 1 })
      .then((detections) => {
        // Same stale-result guard as the other two models -- if region
        // has moved on by the time this resolves (including a "not
        // found" result, which would otherwise null out whatever mask
        // the NEW region has already set), don't touch the mask or
        // status text for a mode that isn't even showing right now.
        if (region !== "ai-object") return;
        objectSegResults++;
        const best = pickBestDetection(detections);
        if (best) {
          applyBoxMaskToLatest(boxToMask(best.box, w, h));
          seAiObjectStatus.textContent = `Found "${query}" (${Math.round(best.score * 100)}% confidence).`;
        } else {
          latestMaskData = null;
          seAiObjectStatus.textContent = `Couldn't find "${query}" in this frame -- try different wording, lighting, or make sure it's in view.`;
        }
      })
      .catch(() => {})
      .finally(() => { objectSegmentationBusy = false; });
  }

  function segmentationTick() {
    if (region === "person" || region === "background") personSegmentationTick();
    else if (region === "sky" || region === "wall") sceneSegmentationTick();
    else if (region === "ai-object") objectSegmentationTick();
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

  // Plain-language readout of the counters above -- not diagnosing
  // anything on its own, just making "is this actually stuck, and where"
  // visible instead of invisible. Runs every render tick (~10fps) so it
  // reads as roughly live.
  function updateMaskDebugDisplay() {
    const isPersonFamily = region === "person" || region === "background";
    const isSceneFamily = region === "sky" || region === "wall";
    const isObjectFamily = region === "ai-object";
    if (!isPersonFamily && !isSceneFamily && !isObjectFamily) {
      seMaskDebug.textContent = "";
      return;
    }
    const requests = isPersonFamily ? personSegRequests : isSceneFamily ? sceneSegRequests : objectSegRequests;
    const results = isPersonFamily ? personSegResults : isSceneFamily ? sceneSegResults : objectSegResults;
    const lastAt = isPersonFamily ? personSegLastResultAt : isSceneFamily ? sceneSegLastResultAt : objectSegLastResultAt;
    const ageText = lastAt ? `${((Date.now() - lastAt) / 1000).toFixed(1)}s ago` : "never yet";
    seMaskDebug.textContent = `Mask debug: last updated ${ageText} · ${results}/${requests} requests produced a usable mask`;
  }

  function renderTick() {
    updateMaskDebugDisplay();
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    naturalCtx.drawImage(video, 0, 0, renderW, renderH);
    const naturalData = naturalCtx.getImageData(0, 0, renderW, renderH);
    const effectData = effect === "cartoon" ? computeCartoonEffect(naturalData)
      : effect === "duotone" ? computeDuotoneEffect(naturalData)
      : computeOutlineEffect(naturalData);

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
    const audioTintActive = audioTintEnabled && !!audioTintAnalyser;
    if (audioTintActive) computeAudioTintHue();
    const out = outputCtx.createImageData(renderW, renderH);
    const outD = out.data;
    const nat = naturalData.data;
    const eff = effectData.data;
    const mask = latestMaskData;
    for (let i = 0; i < outD.length; i += 4) {
      const personProb = sharpenMaskValue(mask[i] / 255);
      const useEffect = region === "background" ? 1 - personProb : personProb;
      let r = nat[i] * (1 - useEffect) + eff[i] * useEffect;
      let g = nat[i + 1] * (1 - useEffect) + eff[i + 1] * useEffect;
      let b = nat[i + 2] * (1 - useEffect) + eff[i + 2] * useEffect;
      // Audio tint: a final hue nudge, scoped to how much of THIS pixel
      // is the selected/isolated region (personProb, the raw class
      // probability) -- not useEffect, which flips for "background"
      // mode -- so it's always "tint the named thing," person/sky/wall/
      // object alike, regardless of whether that's the effect-carrying
      // or the natural-carrying side of the current region. Skipped
      // below a small threshold so most of the frame (well outside the
      // mask) never pays for the HSL round-trip at all.
      if (audioTintActive && personProb > 0.01) {
        const tintAmount = personProb * audioTintStrength;
        const [h, s, l] = rgb2hsl01(r / 255, g / 255, b / 255);
        const hueDiff = ((audioTintHue - h + 540) % 360) - 180;
        const newH = (h + hueDiff * tintAmount + 360) % 360;
        const [nr, ng, nb] = hsl2rgb01(newH, s, l);
        r = nr * 255; g = ng * 255; b = nb * 255;
      }
      outD[i] = r;
      outD[i + 1] = g;
      outD[i + 2] = b;
      outD[i + 3] = 255;
    }
    outputCtx.putImageData(out, 0, 0);
  }

  seEffectSelect.addEventListener("change", () => {
    effect = seEffectSelect.value;
    sePosterizeWrap.classList.toggle("hide", effect !== "cartoon");
    seDuotoneLoWrap.classList.toggle("hide", effect !== "duotone");
    seDuotoneHiWrap.classList.toggle("hide", effect !== "duotone");
    seOutlineThicknessWrap.classList.toggle("hide", effect !== "outline");
    seOutlineBlendWrap.classList.toggle("hide", effect !== "outline");
    seOutlineOpacityWrap.classList.toggle("hide", effect !== "outline");
    seOutlineColorWrap.classList.toggle("hide", effect !== "outline");
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
  seOutlineThicknessSlider.addEventListener("input", () => {
    outlineThickness = Number(seOutlineThicknessSlider.value);
    seOutlineThicknessLabel.textContent = `${outlineThickness}px`;
  });
  seOutlineBlendSlider.addEventListener("input", () => {
    outlineBlend = Number(seOutlineBlendSlider.value) / 100;
    seOutlineBlendLabel.textContent = `${seOutlineBlendSlider.value}%`;
  });
  seOutlineOpacitySlider.addEventListener("input", () => {
    outlineOpacity = Number(seOutlineOpacitySlider.value) / 100;
    seOutlineOpacityLabel.textContent = `${seOutlineOpacitySlider.value}%`;
  });
  seOutlineColorInput.addEventListener("input", () => { outlineColor = hexToRgb(seOutlineColorInput.value); });
  seRegionSelect.addEventListener("change", () => {
    region = seRegionSelect.value;
    // A mask left over from the previous region belongs to a different
    // class entirely (e.g. "person" shaped, picked while switching to
    // "sky") -- drop it rather than briefly compositing with the wrong
    // region's mask until the newly-selected model's first result lands.
    latestMaskData = null;
    seAiObjectWrap.classList.toggle("hide", region !== "ai-object");
    if (region === "person" || region === "background") ensurePersonSegmentation();
    else if (region === "sky" || region === "wall") ensureSceneSegmentation();
    else if (region === "ai-object") ensureObjectDetector();
  });

  seAiObjectApplyBtn.addEventListener("click", async () => {
    const q = seAiObjectInput.value.trim();
    if (!q) {
      seAiObjectStatus.textContent = "Type something to isolate first.";
      return;
    }
    aiObjectQuery = q;
    latestMaskData = null;
    seAiObjectStatus.textContent = `Looking for "${q}"…`;
    await ensureObjectDetector();
    if (!objectDetector) {
      seAiObjectStatus.textContent = "Object model isn't loaded -- see the pill above.";
    }
  });

  seDescribeBtn.addEventListener("click", async () => {
    seDescribeResult.textContent = "Looking…";
    await ensureObjectDetector();
    if (!objectDetector) {
      seDescribeResult.textContent = "Object model isn't loaded -- see the pill above.";
      return;
    }
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      seDescribeResult.textContent = "Camera isn't ready yet.";
      return;
    }
    try {
      const dataUrl = captureObjectSnapshotDataUrl();
      const detections = await objectDetector(dataUrl, DEFAULT_SCENE_VOCAB, { threshold: 0.15, topk: 8 });
      if (!detections || detections.length === 0) {
        seDescribeResult.textContent = "Nothing from the checked word list was recognised confidently in this frame.";
        return;
      }
      const sorted = detections.slice().sort((a, b) => b.score - a.score);
      const list = sorted.map((d) => `${d.label} (${Math.round(d.score * 100)}%)`).join(", ");
      seDescribeResult.textContent = `Detected: ${list}. (Matched against a fixed list of common object words, not a free-form description.)`;
    } catch (e) {
      seDescribeResult.textContent = "Couldn't run the scene check: " + (e.message || e.name || "unknown error");
    }
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
    computeOutlineEffect,
    setEffect: (e) => { effect = e; },
    getEffect: () => effect,
    rgb2hsl01,
    hsl2rgb01,
    computeAudioTintHue,
    getAudioTintHue: () => audioTintHue,
    getAudioTintBands: () => AUDIO_TINT_BANDS.map((b) => ({ ...b })),
    setAudioTintEnabled: (v) => { audioTintEnabled = v; },
    getAudioTintEnabled: () => audioTintEnabled,
    setAudioTintStrength: (v) => { audioTintStrength = v; },
    setAudioTintAnalyser: (obj) => { audioTintAnalyser = obj; },
    setAudioTintCtx: (obj) => { audioTintCtx = obj; },
    setAudioTintFreqData: (arr) => { audioTintFreqData = arr; },
    setOutlineSettings: (s) => {
      if (s.thickness !== undefined) outlineThickness = s.thickness;
      if (s.blend !== undefined) outlineBlend = s.blend;
      if (s.opacity !== undefined) outlineOpacity = s.opacity;
      if (s.color !== undefined) outlineColor = s.color;
    },
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
    setObjectDetector: (obj) => { objectDetector = obj; },
    setRegion: (r) => { region = r; },
    getRegion: () => region,
    setAiObjectQuery: (q) => { aiObjectQuery = q; },
    getAiObjectQuery: () => aiObjectQuery,
    takeSelectivePhoto,
    boxToMask,
    pickBestDetection,
    getSegmentationDebugCounters: () => ({
      personSegRequests, personSegResults, personSegLastResultAt,
      sceneSegRequests, sceneSegResults, sceneSegLastResultAt,
      objectSegRequests, objectSegResults, objectSegLastResultAt
    }),
    updateMaskDebugDisplay,
    getDefaultSceneVocab: () => DEFAULT_SCENE_VOCAB.slice()
  };
})();
