(() => {
  "use strict";
  const C = window.VP_CORE;

  // ============================================================
  // PARAMETER REGISTRY
  // Every automatable control on this page is declared once, here.
  // "range"/"color" params are continuous (recorded as keyframe
  // tracks, sampled+interpolated on playback). "toggle"/"select" are
  // discrete (recorded as timestamped events). "trigger" is a one-shot
  // discrete event with no value (e.g. Gold flash).
  // ============================================================

  const PARAMS = [
    { id: "blend", label: "True ↔ Corrected", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Correction" },
    { id: "cvdType", label: "Colour blindness type", kind: "select", options: ["none", "protan", "deutan", "tritan"], optionLabels: ["None", "Protanopia", "Deuteranopia", "Tritanopia"], default: "none", group: "Correction" },
    { id: "cvdStrength", label: "Type correction", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Correction" },
    { id: "spread", label: "Correction spread", kind: "range", min: 1, max: 40, step: 1, default: 4, group: "Correction" },
    { id: "outlinesEnabled", label: "Outlines mode", kind: "toggle", default: false, group: "Outline" },
    { id: "outlineThickness", label: "Outline thickness", kind: "range", min: 1, max: 10, step: 0.5, default: 2, unit: "px", group: "Outline" },
    { id: "outlineBlend", label: "Outline blend", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Outline" },
    { id: "outlineOpacity", label: "Outline opacity", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Outline" },
    { id: "outlineColor", label: "Outline colour", kind: "color", default: "#ffffff", group: "Outline" },
    { id: "cartoonEnabled", label: "Cartoon mode", kind: "toggle", default: false, group: "Cartoon" },
    { id: "cartoonBlend", label: "Cartoon blend", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Cartoon" },
    { id: "cartoonLevels", label: "Cartoon levels", kind: "range", min: 2, max: 24, step: 1, default: 6, group: "Cartoon" },
    { id: "cartoonEdgeThickness", label: "Cartoon edge thickness", kind: "range", min: 1, max: 10, step: 0.5, default: 2, unit: "px", group: "Cartoon" },
    { id: "cartoonEdgeStrength", label: "Cartoon edge strength", kind: "range", min: 0, max: 100, step: 1, default: 60, unit: "%", group: "Cartoon" },
    { id: "cartoonSaturation", label: "Cartoon saturation", kind: "range", min: 100, max: 300, step: 1, default: 135, unit: "%", group: "Cartoon" },
    { id: "duoColourEnabled", label: "Duo Colour", kind: "toggle", default: false, group: "Duo Colour" },
    { id: "duoColourBlend", label: "Duo Colour blend", kind: "range", min: 0, max: 100, step: 1, default: 100, unit: "%", group: "Duo Colour" },
    { id: "duoColourLo", label: "Duo Colour shadows", kind: "color", default: "#0d0d0d", group: "Duo Colour" },
    { id: "duoColourHi", label: "Duo Colour highlights", kind: "color", default: "#f2f2f2", group: "Duo Colour" },
    { id: "exposure", label: "Exposure", kind: "range", min: -100, max: 100, step: 1, default: 0, group: "Image" },
    { id: "contrast", label: "Contrast", kind: "range", min: -100, max: 100, step: 1, default: 0, group: "Image" },
    { id: "brightness", label: "Brightness", kind: "range", min: -100, max: 100, step: 1, default: 0, group: "Image" },
    { id: "saturation", label: "Saturation", kind: "range", min: -100, max: 100, step: 1, default: 0, group: "Image" },
    { id: "zoom", label: "Zoom", kind: "range", min: 100, max: 500, step: 1, default: 100, unit: "%", group: "Camera" },
    { id: "rotate180", label: "Rotate 180°", kind: "toggle", default: false, group: "Camera" },
    { id: "torch", label: "Flashlight", kind: "toggle", default: false, group: "Camera", capability: "torch" },
    { id: "goldFlash", label: "Gold flash", kind: "trigger", group: "FX" }
  ];
  const PARAM_BY_ID = {};
  PARAMS.forEach((p) => { PARAM_BY_ID[p.id] = p; });
  const CONTINUOUS_KINDS = new Set(["range", "color"]);
  const DISCRETE_KINDS = new Set(["toggle", "select", "trigger"]);

  function defaultState() {
    const s = {};
    PARAMS.forEach((p) => { if (p.kind !== "trigger") s[p.id] = p.default; });
    return s;
  }

  // ============================================================
  // RENDER STATE + PIPELINE
  // ============================================================

  const stage = document.getElementById("vpStage");
  const video = document.getElementById("vpCameraFeed");
  const screenFlashEl = document.getElementById("vpScreenFlash");
  const startBtn = document.getElementById("vpStartBtn");
  const statusEl = document.getElementById("vpStatus");
  const overlay = document.getElementById("vpOverlay");
  const app = document.getElementById("vpApp");

  let gl, program, uniforms, videoTexture;
  let currentStream = null;
  let videoTrack = null;
  let torchSupported = false;
  let zoomCaps = null; // {min,max,step} if hardware zoom supported
  let calibrationPoints = C.loadCalibrationPoints();
  let running = false;

  const liveState = defaultState(); // authoritative values actually rendered each frame
  const domRefs = {}; // paramId -> {input, valueEl, wrap}
  let suppressDomEcho = false;

  function resizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.round(stage.clientWidth * dpr);
    stage.height = Math.round(stage.clientHeight * dpr);
    if (gl) gl.viewport(0, 0, stage.width, stage.height);
  }
  window.addEventListener("resize", resizeStage);

  function initGL() {
    const ctxState = C.initGLContext(stage);
    gl = ctxState.gl; program = ctxState.program; uniforms = ctxState.uniforms; videoTexture = ctxState.videoTexture;
  }

  function uploadPoints() {
    if (!gl) return;
    C.uploadPointUniforms(gl, program, uniforms, calibrationPoints);
  }

  function renderFrame() {
    if (gl && video.readyState >= video.HAVE_CURRENT_DATA) {
      let cover = C.computeCoverUv(video.videoWidth, video.videoHeight, stage.width, stage.height);
      if (!zoomCaps) cover = C.applyDigitalZoom(cover, liveState.zoom / 100);
      const outlineRgb = C.hexToRgb01(liveState.outlineColor);
      const duoLoRgb = C.hexToRgb01(liveState.duoColourLo);
      const duoHiRgb = C.hexToRgb01(liveState.duoColourHi);

      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, liveState.blend / 100);
      gl.uniform1f(uniforms.uOutlineEnabled, liveState.outlinesEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uOutlineThickness, liveState.outlineThickness);
      gl.uniform1f(uniforms.uOutlineBlend, liveState.outlineBlend / 100);
      gl.uniform1f(uniforms.uOutlineOpacity, liveState.outlineOpacity / 100);
      gl.uniform3f(uniforms.uOutlineColor, outlineRgb[0], outlineRgb[1], outlineRgb[2]);
      gl.uniform1f(uniforms.uCartoonEnabled, liveState.cartoonEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uCartoonBlend, liveState.cartoonBlend / 100);
      gl.uniform1f(uniforms.uCartoonLevels, liveState.cartoonLevels);
      gl.uniform1f(uniforms.uCartoonEdgeThickness, liveState.cartoonEdgeThickness);
      gl.uniform1f(uniforms.uCartoonEdgeStrength, liveState.cartoonEdgeStrength / 100);
      gl.uniform1f(uniforms.uCartoonSaturation, liveState.cartoonSaturation / 100);
      gl.uniform1f(uniforms.uDuoEnabled, liveState.duoColourEnabled ? 1 : 0);
      gl.uniform1f(uniforms.uDuoBlend, liveState.duoColourBlend / 100);
      gl.uniform3f(uniforms.uDuoLo, duoLoRgb[0], duoLoRgb[1], duoLoRgb[2]);
      gl.uniform3f(uniforms.uDuoHi, duoHiRgb[0], duoHiRgb[1], duoHiRgb[2]);
      gl.uniform2f(uniforms.uTexelSize, 1 / video.videoWidth, 1 / video.videoHeight);
      gl.uniform1f(uniforms.uSpread, liveState.spread);
      gl.uniform1i(uniforms.uCvdType, C.CVD_TYPE_CODES[liveState.cvdType] || 0);
      gl.uniform1f(uniforms.uCvdStrength, liveState.cvdStrength / 100);
      gl.uniform1f(uniforms.uExposure, liveState.exposure / 100);
      gl.uniform1f(uniforms.uContrast, liveState.contrast / 100);
      gl.uniform1f(uniforms.uBrightness, liveState.brightness / 100);
      gl.uniform1f(uniforms.uSaturation, liveState.saturation / 100);
      gl.uniform1f(uniforms.uRotate180, liveState.rotate180 ? 1 : 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    tickEngines();
    requestAnimationFrame(renderFrame);
  }

  // ---- Side effects for params that touch real hardware or a one-shot FX ----

  async function applyZoomHardware(percentValue) {
    if (!zoomCaps || !videoTrack) return;
    // Our zoom param is a 100-500 percent slider (100% = 1x); the hardware
    // capability is a raw multiplier (e.g. min 1, max 8), so convert.
    const factor = percentValue / 100;
    const clamped = Math.min(zoomCaps.max, Math.max(zoomCaps.min, factor));
    try { await videoTrack.applyConstraints({ advanced: [{ zoom: clamped }] }); } catch (e) { /* ignore */ }
  }

  async function applyTorch(on) {
    if (!torchSupported || !videoTrack) return;
    try { await videoTrack.applyConstraints({ advanced: [{ torch: on }] }); } catch (e) { /* ignore */ }
  }

  function fireGoldFlash() {
    screenFlashEl.style.transition = "none";
    screenFlashEl.style.backgroundColor = "#ffcc33";
    screenFlashEl.style.opacity = "0.8";
    void screenFlashEl.offsetHeight;
    screenFlashEl.style.transition = "opacity 380ms ease-out";
    screenFlashEl.style.opacity = "0";
  }

  // Writes a value into liveState + performs any side effect + (optionally)
  // reflects it in the DOM control. This is the single place every source
  // of a param change funnels through — user input, template playback,
  // reset, or loading a template's starting state.
  function setParam(id, value, { reflectDom = true } = {}) {
    const def = PARAM_BY_ID[id];
    if (!def) return;
    if (def.kind === "trigger") {
      if (id === "goldFlash") fireGoldFlash();
      return;
    }
    liveState[id] = value;
    if (id === "zoom" && zoomCaps) applyZoomHardware(value);
    if (id === "torch") applyTorch(!!value);
    if (reflectDom) {
      const ref = domRefs[id];
      if (ref) {
        suppressDomEcho = true;
        if (def.kind === "toggle") ref.input.checked = !!value;
        else ref.input.value = value;
        if (ref.valueEl) ref.valueEl.textContent = formatParamValue(def, value);
        suppressDomEcho = false;
      }
    }
  }

  function formatParamValue(def, value) {
    if (def.kind === "toggle") return value ? "On" : "Off";
    if (def.kind === "select") return def.optionLabels[def.options.indexOf(value)] || value;
    if (def.unit) return `${value}${def.unit}`;
    return String(value);
  }

  // ============================================================
  // STUDIO CONTROL PANEL (data-driven from PARAMS)
  // ============================================================

  const studioControls = document.getElementById("vpStudioControls");

  function buildStudioControls() {
    const groups = {};
    PARAMS.forEach((p) => { (groups[p.group] = groups[p.group] || []).push(p); });
    Object.keys(groups).forEach((groupName) => {
      const section = document.createElement("div");
      section.className = "vp-group";
      const h = document.createElement("h3");
      h.textContent = groupName;
      section.appendChild(h);
      groups[groupName].forEach((def) => section.appendChild(buildControl(def)));
      studioControls.appendChild(section);
    });
  }

  function buildControl(def) {
    const wrap = document.createElement("label");
    wrap.className = "vp-ctrl";
    wrap.dataset.param = def.id;
    let input, valueEl;
    if (def.kind === "toggle") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!def.default;
      const span = document.createElement("span");
      span.textContent = def.label;
      wrap.append(span, input);
    } else if (def.kind === "trigger") {
      wrap.className = "vp-ctrl vp-ctrl-trigger";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vp-btn";
      btn.textContent = def.label;
      btn.addEventListener("click", () => onUserAction(def.id, undefined));
      wrap.appendChild(btn);
      domRefs[def.id] = { input: btn, valueEl: null, wrap };
      return wrap;
    } else if (def.kind === "select") {
      const span = document.createElement("span");
      span.textContent = def.label;
      input = document.createElement("select");
      def.options.forEach((opt, i) => {
        const o = document.createElement("option");
        o.value = opt; o.textContent = def.optionLabels[i];
        input.appendChild(o);
      });
      input.value = def.default;
      wrap.append(span, input);
    } else if (def.kind === "color") {
      const span = document.createElement("span");
      span.textContent = def.label;
      input = document.createElement("input");
      input.type = "color";
      input.value = def.default;
      wrap.append(span, input);
    } else {
      const labelRow = document.createElement("span");
      valueEl = document.createElement("span");
      valueEl.className = "vp-ctrl-value";
      valueEl.textContent = formatParamValue(def, def.default);
      labelRow.append(`${def.label}: `, valueEl);
      input = document.createElement("input");
      input.type = "range";
      input.min = def.min; input.max = def.max; input.step = def.step || 1;
      input.value = def.default;
      wrap.append(labelRow, input);
    }
    const evt = def.kind === "range" || def.kind === "color" ? "input" : "change";
    input.addEventListener(evt, () => {
      if (suppressDomEcho) return;
      let v = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "range") v = parseFloat(v);
      if (valueEl) valueEl.textContent = formatParamValue(def, v);
      onUserAction(def.id, v);
    });
    domRefs[def.id] = { input, valueEl, wrap };
    return wrap;
  }

  function onUserAction(id, value) {
    setParam(id, value, { reflectDom: false });
    if (recorder.isRecording) recorder.log(id, value);
  }

  // Snaps every param back to its full pre-recording snapshot, so
  // finishing (Restart/Discard/Save) doesn't leave Studio parked on
  // wherever the recording happened to end — and so Studio's control
  // panel never bleeds into what Live mode shows next. This is the
  // same full snapshot PlaybackInstance applies when a Template is
  // triggered, so Studio and Live always agree on what the recording
  // actually looked like.
  function restoreStartingState(startingState) {
    Object.entries(startingState).forEach(([id, v]) => setParam(id, v));
  }

  // ============================================================
  // RECORDER — captures parameter changes with time relative to
  // record-start. Continuous params become keyframe tracks; discrete
  // params become timestamped events. Uses performance.now(), not
  // wall-clock time and not chained setTimeout.
  // ============================================================

  const recorder = {
    isRecording: false,
    startPerf: 0,
    tracks: {},   // paramId -> [{t, v}]
    events: [],   // {t, param, kind, value}
    touched: new Set(),
    startingState: {},

    start() {
      this.isRecording = true;
      this.startPerf = performance.now();
      this.tracks = {};
      this.events = [];
      this.touched = new Set();
      this.startingState = { ...liveState };
      studioControls.classList.add("vp-recording");
    },
    log(id, value) {
      const t = Math.round(performance.now() - this.startPerf);
      this.touched.add(id);
      const def = PARAM_BY_ID[id];
      if (def.kind === "trigger") {
        this.events.push({ t, param: id, kind: "trigger" });
      } else if (CONTINUOUS_KINDS.has(def.kind)) {
        (this.tracks[id] = this.tracks[id] || []).push({ t, v: value });
      } else {
        this.events.push({ t, param: id, kind: "set", value });
      }
    },
    stop() {
      this.isRecording = false;
      studioControls.classList.remove("vp-recording");
      const duration = this.events.reduce((m, e) => Math.max(m, e.t), 0);
      const trackDuration = Object.values(this.tracks).reduce(
        (m, kfs) => Math.max(m, kfs.length ? kfs[kfs.length - 1].t : 0), 0
      );
      return {
        tracks: Object.entries(this.tracks).map(([param, keyframes]) => ({ param, keyframes })),
        events: this.events.slice().sort((a, b) => a.t - b.t),
        duration: Math.max(duration, trackDuration, 1),
        // Full snapshot, not just touched params: a saved Template must
        // reproduce the exact look it was authored with — ambient
        // toggles (Cartoon mode, Duo Colour) that were switched on
        // before Record was pressed and never touched again are still
        // part of that look. touchedIds tracks which params the
        // recording itself actually animates, for end-of-playback
        // "return"/"base" behaviour.
        startingState: { ...this.startingState },
        touchedIds: [...this.touched]
      };
    }
  };

  // ============================================================
  // PLAYER — evaluates a template's tracks/events at a given local
  // time and applies them via setParam. Supports multiple concurrent
  // instances (Live mode) compositing into the same liveState.
  // ============================================================

  function sampleTrack(track, t) {
    const kfs = track.keyframes;
    if (!kfs.length) return undefined;
    if (t <= kfs[0].t) return kfs[0].v;
    if (t >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].v;
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i], b = kfs[i + 1];
      if (t >= a.t && t <= b.t) {
        const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
        if (typeof a.v === "string" && a.v[0] === "#") {
          const ca = C.hexToRgb01(a.v), cb = C.hexToRgb01(b.v);
          return C.rgb01ToHex(ca.map((c, i2) => c + (cb[i2] - c) * f));
        }
        return a.v + (b.v - a.v) * f;
      }
    }
    return kfs[kfs.length - 1].v;
  }

  // A running playback of one template — either the Studio preview
  // (single instance, reflected on-screen sliders) or one Live
  // Template Instance (silent, composited into liveState only).
  class PlaybackInstance {
    constructor(template, { onEnd, reflectDom = false, chainDepth = 0 } = {}) {
      this.template = template;
      this.startPerf = performance.now();
      this.firedEvents = new Set();
      this.finished = false;
      this.onEnd = onEnd;
      this.reflectDom = reflectDom;
      this.chainDepth = chainDepth;
      this.status = "running";
      // Studio only generates Templates — it isn't a live preview feed
      // into Live mode. Triggering a Template must reproduce exactly
      // what was recorded, so snap straight to its full authored base
      // (including ambient toggles that were on throughout recording)
      // before tick() starts layering the recorded tracks/events on top.
      if (template.startingState) {
        Object.entries(template.startingState).forEach(([id, v]) => setParam(id, v, { reflectDom }));
      }
    }
    elapsed() { return performance.now() - this.startPerf; }
    tick() {
      if (this.finished) return;
      const t = this.elapsed();
      const tpl = this.template;
      for (const track of tpl.tracks) {
        const v = sampleTrack(track, Math.min(t, tpl.duration));
        if (v !== undefined) setParam(track.param, v, { reflectDom: this.reflectDom });
      }
      for (const ev of tpl.events) {
        const key = ev.t + ":" + ev.param + ":" + ev.kind;
        if (t >= ev.t && !this.firedEvents.has(key)) {
          this.firedEvents.add(key);
          setParam(ev.param, ev.kind === "trigger" ? undefined : ev.value, { reflectDom: this.reflectDom });
        }
      }
      if (t >= tpl.duration) this.end();
    }
    end() {
      if (this.finished) return;
      this.finished = true;
      this.status = "completed";
      const touched = this.template.touchedIds || Object.keys(tpl_startingState(this.template));
      switch (this.template.endBehavior) {
        case "return":
          touched.forEach((id) => setParam(id, this.template.startingState[id], { reflectDom: this.reflectDom }));
          break;
        case "base":
          touched.forEach((id) => setParam(id, PARAM_BY_ID[id].default, { reflectDom: this.reflectDom }));
          break;
        case "chain":
          if (this.template.chainTemplateId && this.chainDepth < 8) {
            const next = templateStore.get(this.template.chainTemplateId);
            if (next) {
              const inst = new PlaybackInstance(next, { onEnd: this.onEnd, reflectDom: this.reflectDom, chainDepth: this.chainDepth + 1 });
              activeInstances.push(inst);
              liveLog.push({ t: Math.round(performance.now() - liveTakeStartPerf), templateId: next.id, templateVersion: next.version, templateName: next.name, chainedFrom: this.template.id });
            }
          }
          break;
        // "hold" — leave liveState exactly as the last sampled frame left it.
        default: break;
      }
      if (this.onEnd) this.onEnd(this);
    }
  }
  function tpl_startingState(tpl) { return tpl.startingState || {}; }

  let activeInstances = [];
  function tickEngines() {
    if (studioPreview) { studioPreview.tick(); if (studioPreview.finished) studioPreview = null; }
    activeInstances = activeInstances.filter((inst) => { inst.tick(); return !inst.finished; });
  }

  // ---- Studio Play/Restart ----
  let studioPreview = null;
  function studioPlay(template) {
    studioPreview = new PlaybackInstance(template, { reflectDom: true, onEnd: () => {} });
  }
  function studioStop() { studioPreview = null; }

  // ============================================================
  // TEMPLATE STORE — immutable versions, JSON-persisted
  // ============================================================

  const templateStore = {
    all: [],
    load() {
      try {
        const raw = localStorage.getItem(C.TEMPLATES_KEY);
        this.all = raw ? JSON.parse(raw) : [];
      } catch (e) { this.all = []; }
    },
    persist() {
      try { localStorage.setItem(C.TEMPLATES_KEY, JSON.stringify(this.all)); } catch (e) {}
    },
    get(id) { return this.all.find((t) => t.id === id); },
    latestVersionFor(name) {
      const matches = this.all.filter((t) => t.name === name);
      return matches.reduce((m, t) => Math.max(m, t.version), 0);
    },
    // Every save is a brand-new immutable record — editing a Template
    // (re-recording under the same name) never mutates an existing row,
    // so Takes that reference an old version keep working identically.
    save({ name, tracks, events, duration, startingState, touchedIds, endBehavior, chainTemplateId, thumbnail }) {
      const version = this.latestVersionFor(name) + 1;
      const tpl = {
        id: "tpl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        name, version,
        createdAt: new Date().toISOString(),
        duration, startingState, touchedIds: touchedIds || Object.keys(startingState), tracks, events,
        endBehavior: endBehavior || "return",
        chainTemplateId: chainTemplateId || null,
        thumbnail: thumbnail || null,
        calibrationRef: { pointCount: calibrationPoints.length, savedAt: new Date().toISOString() }
      };
      this.all.push(tpl);
      this.persist();
      return tpl;
    },
    delete(id) {
      this.all = this.all.filter((t) => t.id !== id);
      this.persist();
    }
  };
  templateStore.load();

  // ============================================================
  // STUDIO UI WIRING
  // ============================================================

  const recordBtn = document.getElementById("vpRecordBtn");
  const stopBtn = document.getElementById("vpStopBtn");
  const playBtn = document.getElementById("vpPlayBtn");
  const restartBtn = document.getElementById("vpRestartBtn");
  const saveBtn = document.getElementById("vpSaveBtn");
  const discardBtn = document.getElementById("vpDiscardBtn");
  const nameInput = document.getElementById("vpTemplateName");
  const durationEl = document.getElementById("vpTemplateDuration");
  const endBehaviorSelect = document.getElementById("vpEndBehavior");
  const chainSelect = document.getElementById("vpChainTemplate");
  const recIndicator = document.getElementById("vpRecIndicator");
  const thumbCanvas = document.getElementById("vpThumbCanvas");
  const thumbImg = document.getElementById("vpThumbPreview");

  let draft = null; // result of recorder.stop(), pending save/discard

  function setStudioButtonsState() {
    const hasDraft = !!draft;
    recordBtn.disabled = recorder.isRecording;
    stopBtn.disabled = !recorder.isRecording;
    playBtn.disabled = !hasDraft || recorder.isRecording;
    restartBtn.disabled = !hasDraft;
    saveBtn.disabled = !hasDraft;
    discardBtn.disabled = !hasDraft;
    recIndicator.classList.toggle("hide", !recorder.isRecording);
  }

  recordBtn.addEventListener("click", () => {
    draft = null;
    studioStop();
    recorder.start();
    setStudioButtonsState();
  });
  stopBtn.addEventListener("click", () => {
    draft = recorder.stop();
    durationEl.textContent = `${(draft.duration / 1000).toFixed(2)}s`;
    captureThumbnail();
    setStudioButtonsState();
  });
  playBtn.addEventListener("click", () => {
    if (!draft) return;
    studioStop();
    studioPlay({ ...draft, name: "(preview)", endBehavior: endBehaviorSelect.value, startingState: draft.startingState });
  });
  restartBtn.addEventListener("click", () => {
    if (!draft) return;
    restoreStartingState(draft.startingState);
  });
  discardBtn.addEventListener("click", () => {
    if (draft) restoreStartingState(draft.startingState);
    draft = null;
    studioStop();
    nameInput.value = "";
    durationEl.textContent = "0.00s";
    thumbImg.classList.add("hide");
    setStudioButtonsState();
  });
  saveBtn.addEventListener("click", () => {
    if (!draft) return;
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    templateStore.save({
      name,
      tracks: draft.tracks,
      events: draft.events,
      duration: draft.duration,
      startingState: draft.startingState,
      touchedIds: draft.touchedIds,
      endBehavior: endBehaviorSelect.value,
      chainTemplateId: chainSelect.value || null,
      thumbnail: thumbImg.src && !thumbImg.classList.contains("hide") ? thumbImg.src : null
    });
    restoreStartingState(draft.startingState);
    draft = null;
    nameInput.value = "";
    durationEl.textContent = "0.00s";
    thumbImg.classList.add("hide");
    setStudioButtonsState();
    refreshTemplateLists();
  });

  function captureThumbnail() {
    try {
      thumbCanvas.width = 160; thumbCanvas.height = 90;
      const ctx = thumbCanvas.getContext("2d");
      ctx.drawImage(stage, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbImg.src = thumbCanvas.toDataURL("image/jpeg", 0.6);
      thumbImg.classList.remove("hide");
    } catch (e) { /* tainted canvas or unsupported — thumbnail is optional */ }
  }

  function refreshTemplateLists() {
    chainSelect.innerHTML = '<option value="">— none —</option>';
    templateStore.all.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id; o.textContent = `${t.name} v${t.version}`;
      chainSelect.appendChild(o);
    });
    renderTemplatePicker();
    renderTemplateManageList();
  }

  // ============================================================
  // LIVE MODE
  // ============================================================

  const liveButtonBar = document.getElementById("vpLiveButtons");
  const liveLayoutSelect = document.getElementById("vpLiveLayoutSelect");
  const templatePickerList = document.getElementById("vpTemplatePickerList");
  const templateManageList = document.getElementById("vpTemplateManageList");
  let liveLayout = loadLiveLayout();

  function loadLiveLayout() {
    try {
      const raw = localStorage.getItem(C.LIVE_LAYOUT_KEY);
      const parsed = raw ? JSON.parse(raw) : { style: "grid", templateIds: [] };
      return parsed && Array.isArray(parsed.templateIds) ? parsed : { style: "grid", templateIds: [] };
    } catch (e) { return { style: "grid", templateIds: [] }; }
  }
  function saveLiveLayout() {
    try { localStorage.setItem(C.LIVE_LAYOUT_KEY, JSON.stringify(liveLayout)); } catch (e) {}
  }

  function renderTemplatePicker() {
    templatePickerList.innerHTML = "";
    // Only the latest version of each name is offered for new selection —
    // older versions still exist immutably for historical Takes to reference.
    const latestByName = {};
    templateStore.all.forEach((t) => {
      if (!latestByName[t.name] || latestByName[t.name].version < t.version) latestByName[t.name] = t;
    });
    Object.values(latestByName).forEach((t) => {
      const row = document.createElement("label");
      row.className = "vp-picker-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = liveLayout.templateIds.includes(t.id);
      cb.addEventListener("change", () => {
        if (cb.checked) liveLayout.templateIds.push(t.id);
        else liveLayout.templateIds = liveLayout.templateIds.filter((id) => id !== t.id);
        saveLiveLayout();
        renderLiveButtons();
      });
      row.append(cb, ` ${t.name} (v${t.version}, ${(t.duration / 1000).toFixed(1)}s)`);
      templatePickerList.appendChild(row);
    });
  }

  function renderTemplateManageList() {
    templateManageList.innerHTML = "";
    templateStore.all.slice().reverse().forEach((t) => {
      const row = document.createElement("div");
      row.className = "vp-manage-row";
      const info = document.createElement("span");
      info.textContent = `${t.name} v${t.version} — ${(t.duration / 1000).toFixed(2)}s — ${t.endBehavior}`;
      const del = document.createElement("button");
      del.type = "button"; del.className = "vp-btn vp-btn-small"; del.textContent = "Delete";
      del.addEventListener("click", () => {
        templateStore.delete(t.id);
        liveLayout.templateIds = liveLayout.templateIds.filter((id) => id !== t.id);
        saveLiveLayout();
        refreshTemplateLists();
      });
      row.append(info, del);
      templateManageList.appendChild(row);
    });
  }

  function renderLiveButtons() {
    liveButtonBar.innerHTML = "";
    liveButtonBar.className = "vp-live-buttons vp-layout-" + liveLayout.style;
    liveLayout.templateIds.forEach((id, idx) => {
      const t = templateStore.get(id);
      if (!t) return;
      // A <button> can't validly contain another <button> — nesting the
      // reorder controls inside the trigger button (as this used to)
      // made the browser's parser silently restructure the DOM, which
      // desynced the actual clickable region from what was on screen
      // and needed an extra click to register. Reorder controls are a
      // sibling of the trigger button instead, inside a positioned wrap.
      const wrap = document.createElement("div");
      wrap.className = "vp-template-btn-wrap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vp-template-btn";
      btn.innerHTML = `<span class="vp-template-btn-name">${t.name}</span><span class="vp-template-btn-dur">${(t.duration / 1000).toFixed(1)}s</span>`;
      btn.addEventListener("click", () => triggerTemplate(t));
      // Reorder: press-and-hold not implemented as drag — simple move
      // left/right buttons keep this usable one-handed while filming.
      const controls = document.createElement("div");
      controls.className = "vp-template-btn-reorder";
      const left = document.createElement("button");
      left.type = "button"; left.className = "vp-reorder-btn"; left.textContent = "‹";
      left.addEventListener("click", (e) => { e.stopPropagation(); moveLiveButton(idx, -1); });
      const right = document.createElement("button");
      right.type = "button"; right.className = "vp-reorder-btn"; right.textContent = "›";
      right.addEventListener("click", (e) => { e.stopPropagation(); moveLiveButton(idx, 1); });
      controls.append(left, right);
      wrap.append(btn, controls);
      liveButtonBar.appendChild(wrap);
    });
  }
  function moveLiveButton(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= liveLayout.templateIds.length) return;
    const arr = liveLayout.templateIds;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    saveLiveLayout();
    renderLiveButtons();
  }
  liveLayoutSelect.addEventListener("change", () => {
    liveLayout.style = liveLayoutSelect.value;
    saveLiveLayout();
    renderLiveButtons();
  });

  // ---- Live performance timeline (Layer 2) + Template Instances ----
  let liveTakeStartPerf = 0;
  let liveLog = []; // [{t, templateId, templateVersion, templateName}]

  function triggerTemplate(template) {
    const inst = new PlaybackInstance(template, { reflectDom: false });
    activeInstances.push(inst);
    liveLog.push({
      t: Math.round(performance.now() - liveTakeStartPerf),
      templateId: template.id, templateVersion: template.version, templateName: template.name
    });
    renderLiveTimeline();
  }

  function renderLiveTimeline() {
    const el = document.getElementById("vpLiveTimelineLog");
    if (!el) return;
    el.innerHTML = liveLog.slice(-12).reverse().map((e) =>
      `<div>${(e.t / 1000).toFixed(3).padStart(7, "0")}s → ${e.templateName} v${e.templateVersion}${e.chainedFrom ? " (chained)" : ""}</div>`
    ).join("");
  }

  // ============================================================
  // TAKES — video capture (MediaRecorder on the canvas stream) +
  // JSON timeline metadata (Layer 1 stays inside each Template
  // Instance's own record; Layer 2 is liveLog above — never merged).
  // ============================================================

  const takesList = document.getElementById("vpTakesList");
  const startTakeBtn = document.getElementById("vpStartTakeBtn");
  const stopTakeBtn = document.getElementById("vpStopTakeBtn");
  const takeStatus = document.getElementById("vpTakeStatus");
  let takeRecorder = null;
  let takeChunks = [];
  let takeRecording = false;
  let takeStartedAt = null;
  const takesInMemory = []; // {meta, videoUrl}

  function loadTakesMeta() {
    try {
      const raw = localStorage.getItem(C.TAKES_META_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveTakesMeta(list) {
    try { localStorage.setItem(C.TAKES_META_KEY, JSON.stringify(list)); } catch (e) {}
  }

  startTakeBtn.addEventListener("click", () => {
    if (!stage.captureStream) { takeStatus.textContent = "This browser can't capture the canvas as a video stream."; return; }
    liveLog = [];
    liveTakeStartPerf = performance.now();
    takeStartedAt = new Date().toISOString();
    const canvasStream = stage.captureStream(30);
    takeChunks = [];
    // mp4 first: real MP4 output where the browser's MediaRecorder can
    // mux it (Safari always can; Chrome only on some platforms/versions).
    // Where it can't, isTypeSupported rejects these and we fall through
    // to webm — there's no client-side re-encode here, so the actual
    // container you get still depends on what the device can record to.
    const mimeCandidates = [
      "video/mp4;codecs=avc1", "video/mp4;codecs=h264", "video/mp4",
      "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"
    ];
    const mimeType = mimeCandidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
    try {
      takeRecorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      takeStatus.textContent = "Couldn't start recording: " + e.message;
      return;
    }
    takeRecorder.ondataavailable = (e) => { if (e.data && e.data.size) takeChunks.push(e.data); };
    takeRecorder.onstop = onTakeStopped;
    takeRecorder.start(250);
    takeRecording = true;
    startTakeBtn.disabled = true; stopTakeBtn.disabled = false;
    takeStatus.textContent = "Recording…";
    renderLiveTimeline();
  });

  stopTakeBtn.addEventListener("click", () => {
    if (takeRecorder && takeRecording) takeRecorder.stop();
  });

  function onTakeStopped() {
    takeRecording = false;
    startTakeBtn.disabled = false; stopTakeBtn.disabled = true;
    const videoMimeType = takeChunks[0] ? takeChunks[0].type : "video/webm";
    const blob = new Blob(takeChunks, { type: videoMimeType });
    const url = URL.createObjectURL(blob);
    const duration = Math.round(performance.now() - liveTakeStartPerf);
    const meta = {
      id: "take_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      startedAt: takeStartedAt,
      duration,
      liveLog: liveLog.slice(),
      templateInstancesUsed: [...new Set(liveLog.map((e) => `${e.templateName} v${e.templateVersion}`))],
      calibrationRef: { pointCount: calibrationPoints.length },
      videoMimeType
    };
    takesInMemory.push({ meta, videoUrl: url });
    const persisted = loadTakesMeta();
    persisted.push(meta);
    saveTakesMeta(persisted);
    takeStatus.textContent = `Take saved — ${(duration / 1000).toFixed(1)}s, ${meta.templateInstancesUsed.length} template(s) used.`;
    renderTakesList();
  }

  function deleteTake(id) {
    if (!window.confirm("Delete this take? This can't be undone.")) return;
    const idx = takesInMemory.findIndex((k) => k.meta.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(takesInMemory[idx].videoUrl);
      takesInMemory.splice(idx, 1);
    }
    saveTakesMeta(loadTakesMeta().filter((m) => m.id !== id));
    renderTakesList();
  }

  // Blob URLs backing a take's <video> only live as long as this tab
  // does — a reload drops them, which is why older takes render with
  // "video not kept across reloads" and no download option below.
  function extensionForVideoMime(type) {
    if (type && type.includes("mp4")) return "mp4";
    return "webm";
  }

  function makeTakeActions(meta, videoUrl) {
    const actions = document.createElement("div");
    actions.className = "vp-take-actions";
    if (videoUrl) {
      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button"; downloadBtn.className = "vp-btn vp-btn-small"; downloadBtn.textContent = "Download Video";
      downloadBtn.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = videoUrl; a.download = `take-${meta.id}.${extensionForVideoMime(meta.videoMimeType)}`;
        document.body.appendChild(a); a.click(); a.remove();
      });
      actions.appendChild(downloadBtn);
    }
    const exportBtn = document.createElement("button");
    exportBtn.type = "button"; exportBtn.className = "vp-btn vp-btn-small"; exportBtn.textContent = "Export JSON";
    exportBtn.addEventListener("click", () => downloadJson(meta, `take-${meta.id}.json`));
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button"; deleteBtn.className = "vp-btn vp-btn-small vp-btn-danger"; deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTake(meta.id));
    actions.append(exportBtn, deleteBtn);
    return actions;
  }

  function renderTakesList() {
    takesList.innerHTML = "";
    takesInMemory.slice().reverse().forEach(({ meta, videoUrl }) => {
      const card = document.createElement("div");
      card.className = "vp-take-card";
      const v = document.createElement("video");
      v.src = videoUrl; v.controls = true; v.playsInline = true;
      const info = document.createElement("div");
      info.className = "vp-take-info";
      info.innerHTML = `<strong>${new Date(meta.startedAt).toLocaleString()}</strong><br>${(meta.duration / 1000).toFixed(1)}s · ${meta.liveLog.length} trigger(s)<br>${meta.templateInstancesUsed.join(", ") || "no templates used"}`;
      card.append(v, info, makeTakeActions(meta, videoUrl));
      takesList.appendChild(card);
    });
    // Restore any takes metadata (video not persisted) from a prior session.
    const persistedOnly = loadTakesMeta().filter((m) => !takesInMemory.some((k) => k.meta.id === m.id));
    persistedOnly.slice().reverse().forEach((meta) => {
      const card = document.createElement("div");
      card.className = "vp-take-card vp-take-card-novideo";
      const info = document.createElement("div");
      info.className = "vp-take-info";
      info.innerHTML = `<strong>${new Date(meta.startedAt).toLocaleString()}</strong><br>${(meta.duration / 1000).toFixed(1)}s · ${meta.liveLog.length} trigger(s) · video not kept across reloads<br>${meta.templateInstancesUsed.join(", ") || "no templates used"}`;
      card.append(info, makeTakeActions(meta));
      takesList.appendChild(card);
    });
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  document.getElementById("vpExportTemplatesBtn").addEventListener("click", () => {
    downloadJson(templateStore.all, "templates.json");
  });
  document.getElementById("vpImportTemplatesInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("not an array");
        imported.forEach((t) => {
          // Regenerate IDs on import so they can never collide with (or
          // silently overwrite) an existing Template from another device.
          templateStore.all.push({ ...t, id: "tpl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) });
        });
        templateStore.persist();
        refreshTemplateLists();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ============================================================
  // TAB NAVIGATION
  // ============================================================

  document.querySelectorAll(".vp-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".vp-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".vp-view").forEach((v) => v.classList.add("hide"));
      tab.classList.add("active");
      document.getElementById("vpView" + tab.dataset.view).classList.remove("hide");
      if (tab.dataset.view === "Live") { renderTemplatePicker(); renderLiveButtons(); }
      if (tab.dataset.view === "Takes") renderTakesList();
    });
  });

  // ============================================================
  // CAMERA START
  // ============================================================

  async function startCamera() {
    statusEl.textContent = "Requesting camera…";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      currentStream = stream;
      video.srcObject = stream;
      await video.play();
      videoTrack = stream.getVideoTracks()[0];
      const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
      torchSupported = !!(caps && caps.torch);
      domRefs.torch.wrap.classList.toggle("vp-unavailable", !torchSupported);
      domRefs.torch.input.disabled = !torchSupported;
      // zoomCaps stays null (digital-zoom fallback, always available) unless
      // the device genuinely reports a hardware zoom range; the zoom slider
      // itself always stays a fixed 100-500% control either way — only
      // which mechanism setParam("zoom", ...) uses underneath changes.
      zoomCaps = (caps && caps.zoom) ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 1 } : null;
      resizeStage();
      initGL();
      calibrationPoints = C.loadCalibrationPoints();
      uploadPoints();
      running = true;
      requestAnimationFrame(renderFrame);
      overlay.classList.add("hide");
      app.classList.remove("hide");
    } catch (err) {
      statusEl.textContent = "Camera access failed: " + (err.message || err.name || "unknown error");
    }
  }
  startBtn.addEventListener("click", startCamera);

  // ============================================================
  // INIT
  // ============================================================

  buildStudioControls();
  setStudioButtonsState();
  refreshTemplateLists();
  liveLayoutSelect.value = liveLayout.style;
})();
