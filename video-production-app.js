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
    { id: "goldFlash", label: "Gold flash", kind: "trigger", group: "FX" },
    { id: "fadeToBlack", label: "Fade to black", kind: "trigger", group: "FX" },
    { id: "micVolume", label: "Mic volume", kind: "range", min: 0, max: 200, step: 5, default: 100, unit: "%", group: "Audio", capability: "mic" }
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
  const fadeOverlayEl = document.getElementById("vpFadeOverlay");
  const startBtn = document.getElementById("vpStartBtn");
  const statusEl = document.getElementById("vpStatus");
  const overlay = document.getElementById("vpOverlay");
  const app = document.getElementById("vpApp");

  let gl, program, uniforms, videoTexture;
  let currentStream = null;
  let videoTrack = null;
  let torchSupported = false;
  let zoomCaps = null; // {min,max,step} if hardware zoom supported
  let micStream = null;
  let audioCtx = null;
  let micGainNode = null;
  let micDestNode = null; // .stream carries the (gain-adjusted) mic audio track fed into Take recordings
  let micAvailable = false;
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

  // A two-phase fade (in, hold at full black, out) needs its timing to
  // survive being fired again mid-animation — a CSS animation restarted
  // by re-adding its class handles that more reliably than a chained
  // setTimeout would, and keeps this on the same declarative-timing
  // approach as the recorder (see file-header note in video-production.js).
  function fireFadeToBlack() {
    fadeOverlayEl.classList.remove("vp-fade-playing");
    void fadeOverlayEl.offsetHeight;
    fadeOverlayEl.classList.add("vp-fade-playing");
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
      if (id === "fadeToBlack") fireFadeToBlack();
      return;
    }
    liveState[id] = value;
    if (id === "zoom" && zoomCaps) applyZoomHardware(value);
    if (id === "torch") applyTorch(!!value);
    if (id === "micVolume" && micGainNode) micGainNode.gain.value = value / 100;
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
    if (recorder.isRecording) {
      recorder.log(id, value);
      // Overdub: a running preview would otherwise keep driving this
      // same param from the old recording every frame, fighting
      // whatever the user is live-dragging it to right now.
      if (studioPreview) studioPreview.excludeParam(id);
    }
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
  // A group's own toggle — e.g. Duo Colour's blend slider does nothing
  // while Duo Colour itself is off — is the only ambient state a
  // Template is allowed to force open on trigger. Restoring the
  // Template's FULL old snapshot (everything, not just this) used to
  // fight whatever Live's current baseline had deliberately set for
  // completely unrelated params, so a Template built on one baseline
  // would visibly snap unrelated sliders back to how they looked at
  // record time the moment it fired. This map is intentionally an
  // explicit allowlist, not derived from PARAMS' `group` field
  // generically — Camera's group mixes an unrelated toggle (torch)
  // with a range slider (zoom) that isn't gated by it at all, so
  // "any toggle in the same group" doesn't hold everywhere.
  const GROUP_GATE_PARAM = { Cartoon: "cartoonEnabled", "Duo Colour": "duoColourEnabled", Outline: "outlinesEnabled" };

  class PlaybackInstance {
    constructor(template, { onEnd, reflectDom = false, chainDepth = 0, reversed = false, speed = 1 } = {}) {
      this.template = template;
      this.startPerf = performance.now();
      this.firedEvents = new Set();
      this.finished = false;
      this.onEnd = onEnd;
      this.reflectDom = reflectDom;
      this.chainDepth = chainDepth;
      this.reversed = reversed;
      this.speed = Number.isFinite(speed) && speed > 0 ? speed : 1;
      this.status = "running";
      this.forcedGateIds = [];
      this.preForceGateValues = {};
      // Punched in during Studio overdub: a param the user grabs live
      // while this instance is playing back stops being driven by it,
      // ceding control to whatever's touching the slider right now
      // instead of the two fighting over it every frame.
      this.excludeParams = new Set();

      // A Template with no tracks or events IS its startingState —
      // "Save Static Look" has nothing else to give it a visible
      // effect at all, so it gets the full snapshot, on purpose: that
      // snapshot is the whole point of triggering it, not incidental
      // baggage to avoid fighting the current baseline with. Anything
      // that actually animates params instead restores only the
      // minimum needed for those touched params to be visible — the
      // enabling toggle for whichever gated group(s) it touches —
      // leaving everything else exactly as Live's current baseline has it.
      const isStaticLook = template.tracks.length === 0 && template.events.length === 0;
      if (isStaticLook) {
        Object.keys(template.startingState || {}).forEach((id) => {
          try {
            this.preForceGateValues[id] = liveState[id];
            setParam(id, template.startingState[id], { reflectDom });
            this.forcedGateIds.push(id);
          } catch (e) { console.error(`Template "${template.name}": couldn't set ${id}`, e); }
        });
      } else {
        const touchedIds = new Set(template.touchedIds || Object.keys(template.startingState || {}));
        const touchedGroups = new Set();
        PARAMS.forEach((p) => { if (touchedIds.has(p.id)) touchedGroups.add(p.group); });
        touchedGroups.forEach((group) => {
          const gateId = GROUP_GATE_PARAM[group];
          if (!gateId || touchedIds.has(gateId) || !template.startingState || !(gateId in template.startingState)) return;
          // One bad/legacy entry must not stop the rest from applying
          // or abort playback outright — that would silently swallow
          // the whole trigger before it ever reaches triggerTemplate's log.
          try {
            this.preForceGateValues[gateId] = liveState[gateId];
            setParam(gateId, template.startingState[gateId], { reflectDom });
            this.forcedGateIds.push(gateId);
          } catch (e) { console.error(`Template "${template.name}": couldn't set ${gateId}`, e); }
        });
      }
      // Reverse playback starts from wherever the forward recording
      // ENDED, not where it began — snap every animated (continuous)
      // param to its own last keyframe so the transition visibly runs
      // backward from that end look instead of starting forward first.
      // Discrete toggle/select events aren't reversible the same way
      // (there's no "previous value" recorded to undo to), so those
      // still fire on their original forward schedule either way.
      if (reversed) {
        template.tracks.forEach((track) => {
          const kfs = track.keyframes;
          if (!kfs.length) return;
          try { setParam(track.param, kfs[kfs.length - 1].v, { reflectDom }); } catch (e) { console.error(`Template "${template.name}": couldn't set ${track.param}`, e); }
        });
      }
    }
    // Scaling elapsed real time by speed, rather than touching tick()'s
    // sampling/comparison logic at all, is what makes speed act like
    // video playback rate: 2x runs through the Template's own timeline
    // (and reaches its duration/end) in half the real time; 0.5x takes
    // twice as long. Reverse and duration overrides both keep working
    // unchanged since they only ever see this already-scaled value.
    elapsed() { return (performance.now() - this.startPerf) * this.speed; }
    excludeParam(id) { this.excludeParams.add(id); }
    tick() {
      if (this.finished) return;
      const t = this.elapsed();
      const tpl = this.template;
      const sampleT = this.reversed ? Math.max(0, tpl.duration - Math.min(t, tpl.duration)) : Math.min(t, tpl.duration);
      for (const track of tpl.tracks) {
        if (this.excludeParams.has(track.param)) continue;
        const v = sampleTrack(track, sampleT);
        if (v !== undefined) setParam(track.param, v, { reflectDom: this.reflectDom });
      }
      for (const ev of tpl.events) {
        if (this.excludeParams.has(ev.param)) continue;
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
          // Forced-open gates return to whatever Live's baseline had
          // BEFORE this instance forced them on — not this Template's
          // own old snapshot value, which is what just forced them
          // open in the first place and would leave them stuck on.
          this.forcedGateIds.forEach((id) => setParam(id, this.preForceGateValues[id], { reflectDom: this.reflectDom }));
          break;
        case "base":
          touched.forEach((id) => setParam(id, PARAM_BY_ID[id].default, { reflectDom: this.reflectDom }));
          this.forcedGateIds.forEach((id) => setParam(id, PARAM_BY_ID[id].default, { reflectDom: this.reflectDom }));
          break;
        case "chain":
          if (this.template.chainTemplateId && this.chainDepth < 8) {
            const next = templateStore.get(this.template.chainTemplateId);
            if (next) {
              const inst = new PlaybackInstance(next, { onEnd: this.onEnd, reflectDom: this.reflectDom, chainDepth: this.chainDepth + 1 });
              activeInstances.push(inst);
              liveLog.push({ t: Math.round(performance.now() - liveTakeStartPerf), duration: next.duration, templateId: next.id, templateVersion: next.version, templateName: next.name, chainedFrom: this.template.id });
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
    tickScheduledCues();
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
  const overdubBtn = document.getElementById("vpOverdubBtn");
  const stopBtn = document.getElementById("vpStopBtn");
  const playBtn = document.getElementById("vpPlayBtn");
  const restartBtn = document.getElementById("vpRestartBtn");
  const saveBtn = document.getElementById("vpSaveBtn");
  const discardBtn = document.getElementById("vpDiscardBtn");
  const saveStaticBtn = document.getElementById("vpSaveStaticBtn");
  const nameInput = document.getElementById("vpTemplateName");
  const durationEl = document.getElementById("vpTemplateDuration");
  const recIndicator = document.getElementById("vpRecIndicator");
  const thumbCanvas = document.getElementById("vpThumbCanvas");
  const thumbImg = document.getElementById("vpThumbPreview");

  let draft = null; // result of recorder.stop(), pending save/discard
  let isOverdubbing = false;
  let overdubBaseDraft = null;

  function setStudioButtonsState() {
    const hasDraft = !!draft;
    const recording = recorder.isRecording;
    recordBtn.disabled = recording;
    overdubBtn.disabled = recording;
    stopBtn.disabled = !recording;
    // Overdub keeps the pre-existing draft around (as the base being
    // played back) while it records, so hasDraft alone doesn't mean
    // it's safe to Play/Restart/Save/Discard mid-session — all four
    // need Stop pressed first, same as plain recording already required.
    playBtn.disabled = !hasDraft || recording;
    restartBtn.disabled = !hasDraft || recording;
    saveBtn.disabled = !hasDraft || recording;
    discardBtn.disabled = !hasDraft || recording;
    recIndicator.classList.toggle("hide", !recording);
  }

  recordBtn.addEventListener("click", () => {
    draft = null;
    isOverdubbing = false;
    overdubBaseDraft = null;
    studioStop();
    recorder.start();
    setStudioButtonsState();
  });
  // Plays the currently loaded draft back (or starts from a blank base
  // if there isn't one) while recording at the same time — grabbing a
  // slider mid-playback punches that param into recording from that
  // instant on, the same feel as overdubbing a track in a DAW. Params
  // never touched this pass keep the base's own automation untouched.
  overdubBtn.addEventListener("click", () => {
    overdubBaseDraft = draft || { tracks: [], events: [], duration: 1, startingState: { ...liveState }, touchedIds: [] };
    isOverdubbing = true;
    restoreStartingState(overdubBaseDraft.startingState);
    recorder.start();
    studioPlay(overdubBaseDraft);
    setStudioButtonsState();
  });
  stopBtn.addEventListener("click", () => {
    const recorded = recorder.stop();
    draft = isOverdubbing ? mergeOverdubDraft(overdubBaseDraft, recorded) : recorded;
    isOverdubbing = false;
    overdubBaseDraft = null;
    studioStop();
    durationEl.textContent = `${(draft.duration / 1000).toFixed(2)}s`;
    captureThumbnail();
    setStudioButtonsState();
  });

  // Splices a punch-in recording onto its base: for each param the new
  // pass actually touched, keep the base's keyframes/events up to the
  // moment it was first touched, then switch to whatever was just
  // played from there. Anything untouched this pass carries over from
  // the base exactly as it was — that's the whole point of overdubbing
  // instead of just re-recording everything from scratch.
  function mergeOverdubDraft(base, overdub) {
    const mergedTracksByParam = {};
    (base.tracks || []).forEach((t) => { mergedTracksByParam[t.param] = t.keyframes.slice(); });
    (overdub.tracks || []).forEach((t) => {
      const firstT = t.keyframes.length ? t.keyframes[0].t : 0;
      const oldKfs = (mergedTracksByParam[t.param] || []).filter((kf) => kf.t < firstT);
      mergedTracksByParam[t.param] = oldKfs.concat(t.keyframes);
    });
    const tracks = Object.entries(mergedTracksByParam).map(([param, keyframes]) => ({ param, keyframes }));

    const firstNewEventTByParam = {};
    (overdub.events || []).forEach((e) => {
      if (!(e.param in firstNewEventTByParam) || e.t < firstNewEventTByParam[e.param]) firstNewEventTByParam[e.param] = e.t;
    });
    const oldEventsKept = (base.events || []).filter((e) => !(e.param in firstNewEventTByParam) || e.t < firstNewEventTByParam[e.param]);
    const events = oldEventsKept.concat(overdub.events || []).sort((a, b) => a.t - b.t);

    return {
      tracks,
      events,
      duration: Math.max(base.duration || 1, overdub.duration || 1),
      startingState: base.startingState,
      touchedIds: [...new Set([...(base.touchedIds || []), ...(overdub.touchedIds || [])])]
    };
  }
  playBtn.addEventListener("click", () => {
    if (!draft) return;
    studioStop();
    // End behaviour is now a per-cue choice made in Live, not a
    // property of the Template itself — Studio's preview just needs
    // to land somewhere sane when it finishes, so it always returns.
    studioPlay({ ...draft, name: "(preview)", endBehavior: "return", startingState: draft.startingState });
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
      // End behaviour/chain-to are chosen per cue in Live now, not
      // fixed on the Template at save time — this is just the
      // fallback for anything that fires it without an override
      // (a Live button press, or an older cue with none set).
      endBehavior: "return",
      chainTemplateId: null,
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

  // A Template with no motion at all — just the sliders exactly as
  // they are right now, no Record/Stop needed. Its own stored duration
  // is a nominal placeholder; how long it actually holds is set per
  // placement on the Live cue sheet's timeline (Length field), not
  // fixed here — a static look means "this is a look," not "this is
  // a look for X seconds."
  saveStaticBtn.addEventListener("click", () => {
    if (recorder.isRecording) return;
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    captureThumbnail();
    templateStore.save({
      name,
      tracks: [],
      events: [],
      duration: 1000,
      startingState: { ...liveState },
      touchedIds: [],
      endBehavior: "return",
      chainTemplateId: null,
      thumbnail: thumbImg.src && !thumbImg.classList.contains("hide") ? thumbImg.src : null
    });
    nameInput.value = "";
    thumbImg.classList.add("hide");
    setStudioButtonsState();
    refreshTemplateLists();
  });

  // Puts a saved Template's base look back into Studio so it can be
  // re-recorded from that exact starting point — the same underlying
  // move Restart already does mid-session, just entered from the
  // Saved Templates list instead of from a just-stopped recording.
  // Saving under the unchanged, pre-filled name creates a new version
  // (templateStore.save's existing versioning), the old one untouched.
  function loadTemplateIntoStudio(t) {
    if (recorder.isRecording) return;
    studioStop();
    restoreStartingState(t.startingState);
    nameInput.value = t.name;
    // The whole point of loading a Template back in is to be able to
    // Play it, not just look at its starting sliders — draft is what
    // Play/Restart/Save/Discard all gate on, so without this, every
    // one of those stayed disabled and Record was the only way forward,
    // even though nothing here needed re-recording from scratch.
    draft = {
      tracks: t.tracks,
      events: t.events,
      duration: t.duration,
      startingState: t.startingState,
      touchedIds: t.touchedIds || []
    };
    durationEl.textContent = `${(t.duration / 1000).toFixed(2)}s`;
    if (t.thumbnail) { thumbImg.src = t.thumbnail; thumbImg.classList.remove("hide"); }
    else { thumbImg.classList.add("hide"); }
    setStudioButtonsState();
  }

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
    renderTemplatePicker();
    renderTemplateManageList();
    renderCueSheet();
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
      const actions = document.createElement("div");
      actions.className = "vp-manage-row-actions";
      const reconfigure = document.createElement("button");
      reconfigure.type = "button"; reconfigure.className = "vp-btn vp-btn-small"; reconfigure.textContent = "Reconfigure";
      reconfigure.addEventListener("click", () => loadTemplateIntoStudio(t));
      const del = document.createElement("button");
      del.type = "button"; del.className = "vp-btn vp-btn-small"; del.textContent = "Delete";
      del.addEventListener("click", () => {
        templateStore.delete(t.id);
        liveLayout.templateIds = liveLayout.templateIds.filter((id) => id !== t.id);
        saveLiveLayout();
        refreshTemplateLists();
      });
      actions.append(reconfigure, del);
      row.append(info, actions);
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

  // ============================================================
  // CUE SHEET — schedule a Template to auto-fire at a specific time
  // into a Take, instead of relying on pressing its button at exactly
  // the right instant. The ruler is a click-to-place ("directly onto
  // the timeline") alternative to typing a time by hand, and both
  // feed the same scheduledCues list, checked every frame in
  // tickScheduledCues() below against how far the current Take has run.
  // ============================================================

  const cueTemplateSelect = document.getElementById("vpCueTemplateSelect");
  const cueTimeInput = document.getElementById("vpCueTimeInput");
  const cueLengthInput = document.getElementById("vpCueLengthInput");
  const cueSpeedInput = document.getElementById("vpCueSpeedInput");
  const cueReverseCheckbox = document.getElementById("vpCueReverseCheckbox");
  const cueEndBehaviorSelect = document.getElementById("vpCueEndBehaviorSelect");
  const cueChainSelect = document.getElementById("vpCueChainSelect");
  const cueUseNowBtn = document.getElementById("vpCueUseNowBtn");
  const cueAddBtn = document.getElementById("vpCueAddBtn");
  const cueNowReadout = document.getElementById("vpCueNowReadout");
  const cueRuler = document.getElementById("vpCueRuler");
  const cuePlayhead = document.getElementById("vpCuePlayhead");
  const cueListEl = document.getElementById("vpCueList");

  let scheduledCues = loadScheduledCues(); // [{id, t (ms), templateId}]
  let firedCueIds = new Set();
  let cueRulerRenderedSpanMs = 30000;

  function loadScheduledCues() {
    try {
      const raw = localStorage.getItem(C.SCHEDULED_CUES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function saveScheduledCues() {
    try { localStorage.setItem(C.SCHEDULED_CUES_KEY, JSON.stringify(scheduledCues)); } catch (e) {}
  }

  // How far out the ruler needs to draw: past the furthest placed cue,
  // and past however long the current Take has already run — rounded
  // to a stable step so the scale doesn't jitter every frame.
  // A cue's own Length field overrides the template's stored
  // duration for that one placement — the whole point for a static
  // (no-motion) Template, whose stored duration is just a nominal
  // placeholder, but works the same way for an animated one too
  // (holds/truncates at whatever length is set here instead).
  function cueEffectiveDurationMs(cue, template) {
    const base = Number.isFinite(cue.durationMs) && cue.durationMs > 0 ? cue.durationMs : (template ? template.duration : 0);
    // Length is in the Template's own timeline units; speed scales how
    // fast real time moves through that timeline (2x finishes in half
    // the real time), so the actual wall-clock span this cue occupies
    // on the ruler is the length divided by speed, not the raw length.
    const speed = Number.isFinite(cue.speed) && cue.speed > 0 ? cue.speed : 1;
    return base / speed;
  }

  function cueRulerSpanMs() {
    const runningMs = takeRecording ? performance.now() - liveTakeStartPerf : 0;
    // The furthest point that needs to fit is where a cue's own
    // transition ENDS, not just where it starts — otherwise a long
    // template placed near the current scale's edge gets its tail
    // clipped off the ruler.
    const furthestCueEndMs = scheduledCues.reduce((m, c) => {
      const t = templateStore.get(c.templateId);
      return Math.max(m, c.t + cueEffectiveDurationMs(c, t));
    }, 0);
    const needed = Math.max(30000, runningMs + 5000, furthestCueEndMs + 5000);
    return Math.ceil(needed / 30000) * 30000;
  }

  function renderCueTemplateOptions() {
    const prev = cueTemplateSelect.value;
    cueTemplateSelect.innerHTML = "";
    templateStore.all.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id; o.textContent = `${t.name} v${t.version}`;
      cueTemplateSelect.appendChild(o);
    });
    if (prev && templateStore.get(prev)) cueTemplateSelect.value = prev;
  }

  function renderCueChainOptions() {
    const prev = cueChainSelect.value;
    cueChainSelect.innerHTML = '<option value="">— none —</option>';
    templateStore.all.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id; o.textContent = `${t.name} v${t.version}`;
      cueChainSelect.appendChild(o);
    });
    if (prev && templateStore.get(prev)) cueChainSelect.value = prev;
  }

  const CUE_LONG_PRESS_MS = 400;

  function renderCueRuler() {
    cueRulerRenderedSpanMs = cueRulerSpanMs();
    const spanMs = cueRulerRenderedSpanMs;
    cueRuler.querySelectorAll(".vp-cue-tick, .vp-cue-tick-label, .vp-cue-marker-wrap").forEach((el) => el.remove());
    const stepS = spanMs > 90000 ? 20 : spanMs > 45000 ? 10 : 5;
    for (let s = 0; s * 1000 <= spanMs; s += stepS) {
      const pct = (s * 1000 / spanMs) * 100;
      const tick = document.createElement("div");
      tick.className = "vp-cue-tick";
      tick.style.left = pct + "%";
      const label = document.createElement("div");
      label.className = "vp-cue-tick-label";
      label.style.left = pct + "%";
      label.textContent = s + "s";
      cueRuler.append(tick, label);
    }
    scheduledCues.forEach((cue) => {
      const t = templateStore.get(cue.templateId);
      const durMs = cueEffectiveDurationMs(cue, t);
      // Rendered as a span from start to end, not a single point, so
      // the cue's full duration — when it starts AND when it ends — is
      // visible on the ruler, not just the instant it fires.
      const startPct = Math.min(100, (cue.t / spanMs) * 100);
      const endPct = Math.min(100, ((cue.t + durMs) / spanMs) * 100);
      const wrap = document.createElement("div");
      wrap.className = "vp-cue-marker-wrap";
      wrap.style.left = startPct + "%";
      wrap.style.width = Math.max(0.4, endPct - startPct) + "%";
      const marker = document.createElement("div");
      marker.className = "vp-cue-marker" + (cue.reversed ? " vp-cue-marker-reversed" : "");
      marker.title = `${(cue.t / 1000).toFixed(1)}s – ${((cue.t + durMs) / 1000).toFixed(1)}s — ${t ? t.name : "missing template"}${cue.reversed ? " (reversed)" : ""} (tap to remove, hold and drag to move)`;
      const label = document.createElement("div");
      label.className = "vp-cue-marker-label";
      label.textContent = (cue.reversed ? "↺ " : "") + (t ? t.name : "?");
      wrap.append(marker, label);
      // Swallow the click the browser fires after any tap/drag so it
      // never bubbles to the ruler's own click-to-place handler below.
      wrap.addEventListener("click", (e) => e.stopPropagation());
      attachCueDragHandlers(wrap, cue);
      cueRuler.appendChild(wrap);
    });
  }

  // Tap (no meaningful hold, no drag) still removes a cue, same as
  // before. Holding past CUE_LONG_PRESS_MS switches to dragging it
  // along the ruler instead — repositioning it live as the pointer
  // moves, committed to scheduledCues only once the drag ends.
  function attachCueDragHandlers(wrap, cue) {
    wrap.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const pointerId = e.pointerId;
      let dragging = false;
      const longPressTimer = setTimeout(() => {
        dragging = true;
        wrap.classList.add("vp-cue-marker-dragging");
        try { wrap.setPointerCapture(pointerId); } catch (err) { /* not critical */ }
      }, CUE_LONG_PRESS_MS);

      const onMove = (ev) => {
        if (!dragging) return;
        const rect = cueRuler.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        cue.t = Math.round(frac * cueRulerRenderedSpanMs);
        const t = templateStore.get(cue.templateId);
        const durMs = cueEffectiveDurationMs(cue, t);
        const startPct = Math.min(100, (cue.t / cueRulerRenderedSpanMs) * 100);
        const endPct = Math.min(100, ((cue.t + durMs) / cueRulerRenderedSpanMs) * 100);
        wrap.style.left = startPct + "%";
        wrap.style.width = Math.max(0.4, endPct - startPct) + "%";
      };
      const onUp = () => {
        clearTimeout(longPressTimer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        wrap.classList.remove("vp-cue-marker-dragging");
        if (dragging) {
          saveScheduledCues();
          renderCueRuler();
          renderCueList();
        } else {
          removeCue(cue.id);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    });
  }

  // Click-to-place: tapping the ruler sets the time field to that
  // point on the scale, so placing a cue is "point at where on the
  // timeline" rather than guessing a number blind.
  cueRuler.addEventListener("click", (e) => {
    const rect = cueRuler.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    cueTimeInput.value = (frac * cueRulerRenderedSpanMs / 1000).toFixed(1);
  });

  function renderCueList() {
    cueListEl.innerHTML = "";
    scheduledCues.slice().sort((a, b) => a.t - b.t).forEach((cue) => {
      const t = templateStore.get(cue.templateId);
      const row = document.createElement("div");
      row.className = "vp-cue-row";
      const label = document.createElement("span");
      const behaviorNote = cue.endBehavior ? ` · ${cue.endBehavior}${cue.endBehavior === "chain" && cue.chainTemplateId ? ` → ${(templateStore.get(cue.chainTemplateId) || {}).name || "?"}` : ""}` : "";
      const lengthNote = Number.isFinite(cue.durationMs) && cue.durationMs > 0 ? ` · ${(cue.durationMs / 1000).toFixed(1)}s length` : "";
      const speedNote = Number.isFinite(cue.speed) && cue.speed > 0 && cue.speed !== 1 ? ` · ${cue.speed}x speed` : "";
      label.textContent = `${(cue.t / 1000).toFixed(1)}s → ${t ? `${t.name} v${t.version}` : "missing template"}${cue.reversed ? " (reversed)" : ""}${lengthNote}${speedNote}${behaviorNote}`;
      const actions = document.createElement("div");
      actions.className = "vp-cue-row-actions";
      if (t) {
        // The literal "add the same one but in reverse" ask: one tap
        // schedules a mirrored copy of this exact cue, flipped in
        // direction, right after this one's own transition finishes —
        // a boomerang without re-picking the template and time by hand.
        const reverseCopyBtn = document.createElement("button");
        reverseCopyBtn.type = "button"; reverseCopyBtn.className = "vp-btn vp-btn-small"; reverseCopyBtn.textContent = "⇄ Reverse copy";
        reverseCopyBtn.addEventListener("click", () => addReverseCopy(cue));
        actions.appendChild(reverseCopyBtn);
      }
      const del = document.createElement("button");
      del.type = "button"; del.className = "vp-btn vp-btn-small vp-btn-danger"; del.textContent = "Remove";
      del.addEventListener("click", () => removeCue(cue.id));
      actions.appendChild(del);
      row.append(label, actions);
      cueListEl.appendChild(row);
    });
  }

  function addReverseCopy(cue) {
    const t = templateStore.get(cue.templateId);
    if (!t) return;
    const copy = {
      id: "cue_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      t: cue.t + cueEffectiveDurationMs(cue, t),
      templateId: cue.templateId,
      reversed: !cue.reversed
    };
    if (cue.endBehavior) copy.endBehavior = cue.endBehavior;
    if (cue.chainTemplateId) copy.chainTemplateId = cue.chainTemplateId;
    if (Number.isFinite(cue.durationMs) && cue.durationMs > 0) copy.durationMs = cue.durationMs;
    if (Number.isFinite(cue.speed) && cue.speed > 0 && cue.speed !== 1) copy.speed = cue.speed;
    scheduledCues.push(copy);
    saveScheduledCues();
    renderCueRuler();
    renderCueList();
  }

  function removeCue(id) {
    scheduledCues = scheduledCues.filter((c) => c.id !== id);
    saveScheduledCues();
    renderCueRuler();
    renderCueList();
  }

  function renderCueSheet() {
    renderCueTemplateOptions();
    renderCueChainOptions();
    renderCueRuler();
    renderCueList();
  }

  cueUseNowBtn.addEventListener("click", () => {
    const seconds = takeRecording ? (performance.now() - liveTakeStartPerf) / 1000 : 0;
    cueTimeInput.value = seconds.toFixed(1);
  });

  cueAddBtn.addEventListener("click", () => {
    const templateId = cueTemplateSelect.value;
    const seconds = parseFloat(cueTimeInput.value);
    if (!templateId || !Number.isFinite(seconds) || seconds < 0) return;
    const cue = {
      id: "cue_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      t: Math.round(seconds * 1000),
      templateId,
      reversed: cueReverseCheckbox.checked
    };
    // End behaviour/chain-to live here, per cue, instead of being
    // fixed on the Template — "Template default" (blank) leaves the
    // Template's own saved fallback alone.
    if (cueEndBehaviorSelect.value) cue.endBehavior = cueEndBehaviorSelect.value;
    if (cueEndBehaviorSelect.value === "chain" && cueChainSelect.value) cue.chainTemplateId = cueChainSelect.value;
    // Length overrides the Template's own stored duration for this one
    // placement — left blank, it just uses the Template's duration.
    const lengthSeconds = parseFloat(cueLengthInput.value);
    if (Number.isFinite(lengthSeconds) && lengthSeconds > 0) cue.durationMs = Math.round(lengthSeconds * 1000);
    const speedValue = parseFloat(cueSpeedInput.value);
    if (Number.isFinite(speedValue) && speedValue > 0 && speedValue !== 1) cue.speed = speedValue;
    scheduledCues.push(cue);
    saveScheduledCues();
    renderCueRuler();
    renderCueList();
  });

  // Checked every frame from tickEngines(): advances the playhead,
  // grows the ruler if a long Take outruns its current scale, and
  // fires each cue exactly once per Take when its time arrives.
  function tickScheduledCues() {
    if (!takeRecording) {
      cueNowReadout.textContent = "Not recording — cues fire once you press Start Take.";
      cuePlayhead.classList.add("hide");
      return;
    }
    const elapsedMs = performance.now() - liveTakeStartPerf;
    cueNowReadout.textContent = `Recording — currently at ${(elapsedMs / 1000).toFixed(1)}s`;
    if (elapsedMs + 5000 > cueRulerRenderedSpanMs) renderCueRuler();
    cuePlayhead.classList.remove("hide");
    cuePlayhead.style.left = Math.min(100, (elapsedMs / cueRulerRenderedSpanMs) * 100) + "%";
    scheduledCues.forEach((cue) => {
      if (firedCueIds.has(cue.id) || elapsedMs < cue.t) return;
      firedCueIds.add(cue.id);
      const t = templateStore.get(cue.templateId);
      if (t) {
        triggerTemplate(t, { reversed: !!cue.reversed, endBehavior: cue.endBehavior, chainTemplateId: cue.chainTemplateId, durationMs: cue.durationMs, speed: cue.speed });
      } else {
        // Cue points at a template that no longer exists — this used
        // to fire silently into nothing, indistinguishable from the
        // cue simply never being checked at all.
        console.error("Cue at", cue.t, "ms references a missing template:", cue.templateId);
        takeStatus.textContent = `A scheduled cue at ${(cue.t / 1000).toFixed(1)}s points at a template that no longer exists.`;
      }
    });
  }

  // ---- Live performance timeline (Layer 2) + Template Instances ----
  let liveTakeStartPerf = 0;
  let liveLog = []; // [{t, templateId, templateVersion, templateName}]

  function triggerTemplate(template, { reversed = false, endBehavior, chainTemplateId, durationMs, speed = 1 } = {}) {
    // End behaviour/chain-to/length are set per cue in Live, not
    // baked into the Template — override only the fields actually
    // specified, falling back to whatever the Template itself was
    // saved with (a Live button press, or a cue with no override, or
    // an older saved cue from before this existed).
    const hasDurationOverride = Number.isFinite(durationMs) && durationMs > 0;
    const effectiveTemplate = (endBehavior !== undefined || chainTemplateId !== undefined || hasDurationOverride)
      ? {
          ...template,
          endBehavior: endBehavior !== undefined ? endBehavior : template.endBehavior,
          chainTemplateId: chainTemplateId !== undefined ? chainTemplateId : template.chainTemplateId,
          duration: hasDurationOverride ? durationMs : template.duration
        }
      : template;
    // A construction failure here used to abort silently before ever
    // reaching the log push below — button press, nothing happens, no
    // timeline entry, no visible error. Surface it instead.
    try {
      const inst = new PlaybackInstance(effectiveTemplate, { reflectDom: false, reversed, speed });
      activeInstances.push(inst);
    } catch (e) {
      console.error(`Couldn't trigger template "${template.name}"`, e);
      takeStatus.textContent = `Couldn't play "${template.name}": ${e.message}`;
    }
    liveLog.push({
      t: Math.round(performance.now() - liveTakeStartPerf),
      duration: effectiveTemplate.duration / speed,
      templateId: template.id, templateVersion: template.version, templateName: template.name,
      reversed
    });
    renderLiveTimeline();
  }

  function fmtCueSeconds(ms) { return (ms / 1000).toFixed(3).padStart(7, "0"); }

  function renderLiveTimeline() {
    const el = document.getElementById("vpLiveTimelineLog");
    if (!el) return;
    el.innerHTML = liveLog.slice(-12).reverse().map((e) => {
      const endMs = e.t + (e.duration || 0);
      return `<div>${fmtCueSeconds(e.t)}s → ${fmtCueSeconds(endMs)}s   ${e.templateName} v${e.templateVersion}${e.reversed ? " (reversed)" : ""}${e.chainedFrom ? " (chained)" : ""}</div>`;
    }).join("");
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
    firedCueIds = new Set();
    renderCueRuler();
    takeStartedAt = new Date().toISOString();
    const canvasStream = stage.captureStream(30);
    const takeTracks = [...canvasStream.getVideoTracks()];
    if (micAvailable && micDestNode) takeTracks.push(...micDestNode.stream.getAudioTracks());
    const recordStream = new MediaStream(takeTracks);
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
      takeRecorder = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined);
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
      videoMimeType,
      hasAudio: micAvailable
    };
    takesInMemory.push({ meta, videoUrl: url });
    const persisted = loadTakesMeta();
    persisted.push(meta);
    saveTakesMeta(persisted);
    takeStatus.textContent = `Take saved — ${(duration / 1000).toFixed(1)}s, ${meta.templateInstancesUsed.length} template(s) used, ${meta.hasAudio ? "with audio" : "no audio (mic unavailable)"}.`;
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
      info.innerHTML = `<strong>${new Date(meta.startedAt).toLocaleString()}</strong><br>${(meta.duration / 1000).toFixed(1)}s · ${meta.liveLog.length} trigger(s) · ${meta.hasAudio ? "with audio" : "silent"}<br>${meta.templateInstancesUsed.join(", ") || "no templates used"}`;
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
      if (tab.dataset.view === "Live") { renderTemplatePicker(); renderLiveButtons(); renderCueSheet(); }
      if (tab.dataset.view === "Takes") renderTakesList();
    });
  });

  // ---- Fullscreen ----
  // Lives in the tab bar itself (a sibling of Studio/Live/Takes, not
  // inside either view), so switching tabs never hides or resets it —
  // one toggle that works the same in both modes.
  const fullscreenBtn = document.getElementById("vpFullscreenBtn");
  async function toggleFullscreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { try { await exit.call(document); } catch (e) { console.error("Exit fullscreen failed", e); } }
    } else {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (!req) {
        alert("This browser doesn't support the Fullscreen API at all.");
        return;
      }
      // A rejection here (permission denied, blocked by browser policy,
      // an iframe without the fullscreen permission delegated, etc.)
      // used to fail completely silently — press the button, nothing
      // happens, no clue why. alert() isn't pretty, but it's the only
      // way to see the actual reason on a phone with no devtools open.
      try {
        await req.call(document.documentElement);
      } catch (e) {
        console.error("Fullscreen request failed", e);
        alert("Fullscreen didn't start: " + (e.name || "") + (e.message ? " — " + e.message : ""));
      }
    }
  }
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  // The browser's own exit gestures (Esc, swipe-down, back) bypass the
  // click handler above, so this is what actually keeps the button's
  // pressed state — and whether the app's own controls are hidden —
  // honest regardless of how fullscreen was entered or left.
  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fullscreenBtn.classList.toggle("active", active);
      fullscreenBtn.setAttribute("aria-pressed", String(active));
      document.body.classList.toggle("vp-fullscreen-active", active);
    });
  });

  // ============================================================
  // CAMERA START
  // ============================================================

  // Mic capture is requested separately from the camera (never in the same
  // getUserMedia call) so denying the mic prompt — or a device with no mic —
  // never breaks camera setup. The gain node is never connected to
  // audioCtx.destination, so recording-time volume changes are silent on
  // this device's speakers; only the MediaStreamAudioDestinationNode's
  // track (used by startTakeBtn) carries the adjusted audio.
  async function startMic() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => {});
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micGainNode = audioCtx.createGain();
      micGainNode.gain.value = liveState.micVolume / 100;
      micDestNode = audioCtx.createMediaStreamDestination();
      micSource.connect(micGainNode).connect(micDestNode);
      micAvailable = true;
    } catch (e) {
      micAvailable = false;
    }
    domRefs.micVolume.wrap.classList.toggle("vp-unavailable", !micAvailable);
    domRefs.micVolume.input.disabled = !micAvailable;
  }

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
      startMic();
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* PWA installability is a nice-to-have, not load-blocking */ });
  }
})();
