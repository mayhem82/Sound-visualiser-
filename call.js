(() => {
  "use strict";

  // video-production.js's WebGL correction/style pipeline (the exact same
  // engine that backs its Cartoon mode), loaded on this page purely for
  // this export — see the <script> comment in call.html.
  const C = window.VP_CORE;

  // Same public STUN server used everywhere else in this suite's WebRTC
  // pairing (restore.js / colorvision.js / viewer.js) — needed for NAT
  // traversal even on the same wifi network in many router configurations.
  // No TURN relay is configured, so very restrictive networks (symmetric
  // NAT, some corporate firewalls) can still block the connection
  // outright; that's the real limitation of a fully serverless P2P setup,
  // and the deliberate cheap-first tradeoff for this page — see the
  // in-page hint text.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  // Own topic namespace, distinct from "sound-visualiser-pair" (the
  // one-way broadcast/tablet-viewer feature) even though the signaling
  // mechanism itself is copied from there — a call room and a broadcast
  // room are a different kind of thing, and giving them separate
  // namespaces means a stray retained message from one can never be
  // misread as the other on the shared public relays.
  const LIVE_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt",
    "wss://test.mosquitto.org:8081/mqtt",
  ];

  function signalTopic(room) {
    return `sound-visualiser-call/${room}/signal`;
  }

  function makeRoomCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function makeDeviceId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function loadMqttLib() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the pairing library — check your internet connection."));
      document.head.appendChild(s);
    });
  }

  // Waiting for ICE gathering to finish before sending the offer/answer
  // means every candidate is already embedded in the SDP — no separate
  // trickle-ICE exchange needed over the relay.
  function waitForIceGatheringComplete(pc) {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
      function check() { if (pc.iceGatheringState === "complete") finish(); }
      pc.addEventListener("icegatheringstatechange", check);
      setTimeout(finish, 3500);
    });
  }

  const remoteVideo = document.getElementById("remoteVideo");
  const cameraFeed = document.getElementById("cameraFeed"); // raw camera, hidden — see call.html
  const cameraFeed2 = document.getElementById("cameraFeed2"); // second camera, dual-camera mode only
  const localCanvas = document.getElementById("localCanvas"); // styled output — self-view + what's actually sent
  const styleSelect = document.getElementById("styleSelect");
  const callStatus = document.getElementById("callStatus");
  const overlay = document.getElementById("overlay");
  const startCallBtn = document.getElementById("startCallBtn");
  const joinCallBtn = document.getElementById("joinCallBtn");
  const roomInput = document.getElementById("roomInput");
  const statusEl = document.getElementById("status");
  const shareCodeBlock = document.getElementById("shareCodeBlock");
  const shareRoomCode = document.getElementById("shareRoomCode");
  const shareLinkText = document.getElementById("shareLinkText");
  const callHud = document.getElementById("callHud");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomValueEl = document.getElementById("zoomValue");
  const switchCameraBtn = document.getElementById("switchCameraBtn");
  const dualCameraBtn = document.getElementById("dualCameraBtn");
  const swapCamerasBtn = document.getElementById("swapCamerasBtn");
  const muteBtn = document.getElementById("muteBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const hangupBtn = document.getElementById("hangupBtn");

  function setStatus(msg) { statusEl.textContent = msg || ""; }
  function setCallStatus(msg) { callStatus.textContent = msg || ""; }

  let localStream = null;
  let canvasStream = null; // captured from localCanvas — this is what's actually sent as the outgoing video track
  let cameraBlurOn = false; // see renderLocalFrame() — heavy outline blur, not a black frame
  let pc = null;
  let clients = [];
  let deviceId = null;
  let room = null;
  let heartbeatTimer = null;
  let remotePeerId = null;
  let torn = true; // true whenever no call is active/in-progress

  // ---- Camera capability/switching — ported from Video Production's
  // video-production-app.js (same variable roles, same functions), the
  // proven implementation this suite already has for exactly this. ----
  let videoTrack = null; // primary camera's track — the one Zoom/Switch camera act on
  let torchSupported = false; // unused on this page (no torch control), kept only because probeTrackCapabilities returns it
  let zoomCaps = null; // {min,max,step} if hardware zoom supported; digital-crop fallback otherwise
  let zoomPercent = 100;
  let videoDevices = [];
  let currentDeviceIndex = -1;
  let switchingCamera = false;

  // ---- Dual camera (picture-in-picture) — same technique as Video
  // Production: a second concurrent stream, drawn as a small inset inside
  // localCanvas via a second texture + a viewport-restricted draw call. ----
  let videoTexture2 = null;
  let secondaryStream = null;
  let secondaryVideoTrack = null;
  let dualCameraActive = false;
  let dualCameraBusy = false;

  // ---- Audio Colour Tint — ported from Colour Vision Extreme, fixed to
  // three bands (bass/mid/treble, same violet/cyan/pink language Sound
  // Nebula's particle swarms use) rather than exposing the full band/
  // strength editor: this page is "pick a style," not a tuning surface,
  // same reasoning as Cartoon/Outline/Duo's own fixed defaults. Analyses
  // localStream's own microphone track — no second getUserMedia() call —
  // since audio is already being captured for the call itself. ----
  const AUDIO_TINT_BANDS = [
    { hue: 280, fromHz: 20, toHz: 150 },   // bass -> violet
    { hue: 180, fromHz: 150, toHz: 2000 }, // mid -> cyan
    { hue: 320, fromHz: 2000, toHz: 8000 } // treble -> pink
  ];
  let audioTintCtx = null;
  let audioTintAnalyser = null;
  let audioTintFreqData = null;
  let audioTintIntervalId = null;
  let audioTintHue = 0;
  let audioTintLevel = 0;

  // ---- Video style pipeline ----
  // Runs continuously once a call starts, independent of connection state:
  // it's what the self-view shows and what canvasStream captures, so the
  // chosen style is visible before the other side even joins.
  let gl, program, uniforms, videoTexture;
  let renderRafId = null;

  function resizeLocalCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = localCanvas.getBoundingClientRect();
    localCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    localCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (gl) gl.viewport(0, 0, localCanvas.width, localCanvas.height);
  }

  function initLocalRenderPipeline() {
    if (gl) return; // already set up — startCall/joinCall can both call this once localStream exists
    const ctxState = C.initGLContext(localCanvas);
    gl = ctxState.gl; program = ctxState.program; uniforms = ctxState.uniforms; videoTexture = ctxState.videoTexture;
    C.uploadPointUniforms(gl, program, uniforms, []); // no calibrated colour points on this page — every style here is fixed-parameter
    resizeLocalCanvas();
    window.addEventListener("resize", resizeLocalCanvas);
    renderLocalFrame();
    canvasStream = localCanvas.captureStream(30);
  }

  // Duo Colour's default two-tone palette — same values Video Production's
  // own duoColourLo/duoColourHi default to, for consistency.
  const DUO_LO = C.hexToRgb01("#0d0d0d");
  const DUO_HI = C.hexToRgb01("#f2f2f2");

  function renderLocalFrame() {
    if (gl && cameraFeed.readyState >= cameraFeed.HAVE_CURRENT_DATA) {
      let cover = C.computeCoverUv(cameraFeed.videoWidth, cameraFeed.videoHeight, localCanvas.width, localCanvas.height);
      if (!zoomCaps) cover = C.applyDigitalZoom(cover, zoomPercent / 100);
      // cameraBlurOn overrides the style picker entirely rather than
      // stopping the track: the edge-detection sampling radius (normally
      // ~2px, for crisp Outline-style edges) scaled x10 spreads the Sobel
      // sample points so far apart that the result reads as a heavy
      // blur/shape silhouette instead of a line drawing — obscures who/
      // what's on camera while still sending a live, moving picture,
      // rather than cutting to a flat black frame.
      // Every style transforms the image — there's deliberately no
      // "Normal"/raw option (see the field-label hint in call.html), so
      // the unprocessed camera feed is never what's actually sent.
      const style = cameraBlurOn ? "blur" : styleSelect.value;
      const outlineOn = style === "blur" || style === "outline";
      const cartoonOn = style === "cartoon";
      const duoOn = style === "duo";
      const audioTintOn = style === "audiotint";
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cameraFeed);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, 1);
      gl.uniform1f(uniforms.uOutlineEnabled, outlineOn ? 1 : 0);
      gl.uniform1f(uniforms.uOutlineThickness, style === "blur" ? 20 : 2);
      gl.uniform1f(uniforms.uOutlineBlend, 1);
      gl.uniform1f(uniforms.uOutlineOpacity, 1);
      gl.uniform3f(uniforms.uOutlineColor, 1, 1, 1);
      // Same Cartoon mode defaults as Video Production's own — posterize +
      // edge lines + a saturation boost. Not exposed as sliders here: this
      // page is "pick a style before you call," not a full studio.
      gl.uniform1f(uniforms.uCartoonEnabled, cartoonOn ? 1 : 0);
      gl.uniform1f(uniforms.uCartoonBlend, 1);
      gl.uniform1f(uniforms.uCartoonLevels, 6);
      gl.uniform1f(uniforms.uCartoonEdgeThickness, 2);
      gl.uniform1f(uniforms.uCartoonEdgeStrength, 0.6);
      gl.uniform1f(uniforms.uCartoonSaturation, 1.35);
      gl.uniform1f(uniforms.uDuoEnabled, duoOn ? 1 : 0);
      gl.uniform1f(uniforms.uDuoBlend, 1);
      gl.uniform3f(uniforms.uDuoLo, DUO_LO[0], DUO_LO[1], DUO_LO[2]);
      gl.uniform3f(uniforms.uDuoHi, DUO_HI[0], DUO_HI[1], DUO_HI[2]);
      // Fixed strengths (0.5 hue pull, a small +10% saturation push on
      // louder audio, no lightness push) — same "no sliders" philosophy
      // as Cartoon/Outline/Duo above.
      gl.uniform1f(uniforms.uAudioTintEnabled, audioTintOn ? 1 : 0);
      gl.uniform1f(uniforms.uAudioTintHue, audioTintHue);
      gl.uniform1f(uniforms.uAudioTintStrength, 0.5);
      gl.uniform1f(uniforms.uAudioTintSatStrength, 0.1);
      gl.uniform1f(uniforms.uAudioTintLightStrength, 0);
      gl.uniform1f(uniforms.uAudioTintLevel, audioTintLevel);
      gl.uniform2f(uniforms.uTexelSize, 1 / cameraFeed.videoWidth, 1 / cameraFeed.videoHeight);
      gl.uniform1f(uniforms.uSpread, 4);
      gl.uniform1i(uniforms.uCvdType, 0);
      gl.uniform1f(uniforms.uCvdStrength, 0);
      gl.uniform1f(uniforms.uExposure, 0);
      gl.uniform1f(uniforms.uContrast, 0);
      gl.uniform1f(uniforms.uBrightness, 0);
      gl.uniform1f(uniforms.uSaturation, 0);
      gl.uniform1f(uniforms.uRotate180, 0);
      gl.uniform2f(uniforms.uUvScale, cover.sx, cover.sy);
      gl.uniform2f(uniforms.uUvOffset, cover.ox, cover.oy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Dual camera inset — same technique as Video Production: reuses
      // every uniform already set above (same style applied to both
      // feeds), only rebinding the texture, restating its own aspect-fit
      // UVs/texel size, and restricting gl.viewport() to a corner rect,
      // which is what actually places and scales it. No zoom applied to
      // the inset — keeps it a stable, un-zoomed framing of the second
      // feed. Drawn last so it always sits on top; every uniform touched
      // here gets fully overwritten at the top of next frame's main pass,
      // so nothing needs restoring except the viewport itself.
      if (dualCameraActive && secondaryVideoTrack && cameraFeed2.readyState >= cameraFeed2.HAVE_CURRENT_DATA) {
        const marginPx = Math.round(localCanvas.width * 0.03);
        const insetW = Math.round(localCanvas.width * 0.34);
        const insetH = Math.round(insetW * ((cameraFeed2.videoHeight / cameraFeed2.videoWidth) || 9 / 16));
        const insetX = localCanvas.width - insetW - marginPx;
        const insetY = marginPx; // gl.viewport's Y origin is the bottom of the canvas
        const cover2 = C.computeCoverUv(cameraFeed2.videoWidth, cameraFeed2.videoHeight, insetW, insetH);
        gl.viewport(insetX, insetY, insetW, insetH);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture2);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cameraFeed2);
        gl.uniform1i(uniforms.uTex, 0);
        gl.uniform2f(uniforms.uTexelSize, 1 / cameraFeed2.videoWidth, 1 / cameraFeed2.videoHeight);
        gl.uniform2f(uniforms.uUvScale, cover2.sx, cover2.sy);
        gl.uniform2f(uniforms.uUvOffset, cover2.ox, cover2.oy);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.viewport(0, 0, localCanvas.width, localCanvas.height);
      }
    }
    renderRafId = requestAnimationFrame(renderLocalFrame);
  }

  function stopLocalRenderPipeline() {
    if (renderRafId) { cancelAnimationFrame(renderRafId); renderRafId = null; }
    window.removeEventListener("resize", resizeLocalCanvas);
    // videoTexture2 belongs to this same (now-discarded) gl context —
    // resetting it here too, not just videoTexture, matters because
    // enableDualCamera() only recreates it when falsy; leaving a stale
    // reference around would make it skip recreating a texture that
    // actually belongs to a destroyed context.
    gl = program = uniforms = videoTexture = videoTexture2 = undefined;
    canvasStream = null;
  }

  // ---- Camera capabilities (zoom/torch) + device enumeration — ported
  // directly from video-production-app.js's own functions of the same
  // names/shapes. ----
  function probeTrackCapabilities(track) {
    const caps = track && track.getCapabilities ? track.getCapabilities() : {};
    return {
      torch: !!(caps && caps.torch),
      zoom: (caps && caps.zoom) ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 1 } : null
    };
  }

  function applyPrimaryCapabilities(track) {
    const caps = probeTrackCapabilities(track);
    torchSupported = caps.torch;
    zoomCaps = caps.zoom;
  }

  async function applyZoomHardware(percentValue) {
    if (!zoomCaps || !videoTrack) return;
    const factor = percentValue / 100;
    const clamped = Math.min(zoomCaps.max, Math.max(zoomCaps.min, factor));
    try { await videoTrack.applyConstraints({ advanced: [{ zoom: clamped }] }); } catch (e) { /* ignore */ }
  }

  async function refreshVideoDevices() {
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      const hasMultiple = videoDevices.length > 1;
      switchCameraBtn.classList.toggle("hide", !hasMultiple || dualCameraActive);
      dualCameraBtn.classList.toggle("hide", !hasMultiple);
      const activeId = videoTrack && videoTrack.getSettings ? videoTrack.getSettings().deviceId : null;
      currentDeviceIndex = activeId ? videoDevices.findIndex((d) => d.deviceId === activeId) : -1;
      if (currentDeviceIndex === -1) currentDeviceIndex = 0;
    } catch (err) {
      switchCameraBtn.classList.add("hide");
      dualCameraBtn.classList.add("hide");
    }
  }

  // Tracks the in-flight request itself, not just the eventual localStream
  // — now that a preview can start on page load (see the bottom of this
  // file) as well as from Start/Join, a quick click during that initial
  // request would otherwise race a second concurrent getUserMedia() call
  // (localStream stays unset until the first one resolves), risking a
  // second permission prompt and an orphaned, never-stopped camera handle.
  let localStreamPromise = null;
  function ensureLocalStream() {
    if (localStreamPromise) return localStreamPromise;
    localStreamPromise = (async () => {
      // Requested as two separate getUserMedia() calls, not one combined
      // {video:true, audio:true} — every other page in this suite that
      // uses both (Sound Nebula's camera background + separate mic
      // analysis, Video Production's camera-only stream) keeps them
      // separate too, never combined. On some Android/Chrome camera
      // stacks, a combined audio+video capture session is held more
      // exclusively than a video-only one, which was blocking Dual
      // camera from opening a second, genuinely different physical
      // camera — even though the exact same second-camera request works
      // fine on Video Production's video-only primary stream. Video
      // first, audio second: matches which one every other page treats
      // as the primary resource.
      const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      let audioOnlyStream;
      try {
        audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (err) {
        // A call genuinely needs audio, but failing this separately from
        // video (mic permission denied/no mic hardware) shouldn't nuke a
        // camera stream that already succeeded — surface it and continue
        // video-only rather than hard-failing the whole preview.
        setStatus("Microphone unavailable: " + (err.message || err.name || "unknown error") + " — continuing video-only.");
        audioOnlyStream = null;
      }
      localStream = new MediaStream([
        ...videoOnlyStream.getVideoTracks(),
        ...(audioOnlyStream ? audioOnlyStream.getAudioTracks() : [])
      ]);
      cameraFeed.srcObject = localStream;
      await cameraFeed.play();
      videoTrack = localStream.getVideoTracks()[0];
      applyPrimaryCapabilities(videoTrack);
      initLocalRenderPipeline();
      await refreshVideoDevices();
      // Camera/mic controls are reachable through every stage from here on
      // — framing yourself before Start/Join, waiting for the other
      // device, and the call itself — not just once actually connected.
      callHud.classList.remove("hide");
      if (styleSelect.value === "audiotint") startAudioTint();
      return localStream;
    })().catch((err) => {
      localStreamPromise = null; // failed — a later call should be allowed to retry, not stay stuck rejected forever
      throw err;
    });
    return localStreamPromise;
  }

  function publish(fields, opts) {
    opts = opts || {};
    if (!room) return;
    const msg = Object.assign({ v: 1, from: deviceId, to: null, ts: Date.now() }, fields);
    const payload = JSON.stringify(msg);
    const topic = signalTopic(room);
    clients.forEach((c) => {
      if (c.connected) c.publish(topic, payload, { retain: !!opts.retain, qos: opts.qos != null ? opts.qos : 0 });
    });
  }

  function connectSignaling(roomCode, onMessage) {
    return loadMqttLib().then(() => new Promise((resolve, reject) => {
      let resolved = false;
      const topic = signalTopic(roomCode);
      clients = LIVE_BROKERS.map((url) => {
        let client;
        try { client = window.mqtt.connect(url, { connectTimeout: 9000, reconnectPeriod: 5000 }); }
        catch (e) { return null; }
        client.on("connect", () => {
          client.subscribe(topic, { qos: 1 });
          if (!resolved) { resolved = true; resolve(); }
        });
        client.on("message", (t, payload) => { if (t === topic) onMessage(payload.toString()); });
        return client;
      }).filter(Boolean);
      setTimeout(() => { if (!resolved) reject(new Error("Couldn't reach a relay — check your internet connection and try again.")); }, 9000);
    }));
  }

  function makePeerConnection() {
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    // The styled canvas output (Normal or Cartoon), not the raw camera —
    // localCanvas is what canvasStream captures, so whichever style is
    // showing in the self-view is exactly what goes out. Audio still comes
    // straight from the microphone; only video is routed through the
    // style pipeline.
    const outgoingStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...localStream.getAudioTracks()
    ]);
    outgoingStream.getTracks().forEach((t) => conn.addTrack(t, outgoingStream));
    conn.addEventListener("track", (e) => {
      remoteVideo.srcObject = e.streams[0];
      // Unmuted autoplay (there's real audio to hear here) is more likely
      // to be blocked by browser autoplay policy than the muted local
      // preview is — if so, surface it instead of silently sitting on a
      // connected-but-silent call, and let a single tap anywhere retry it.
      remoteVideo.play().catch(() => {
        setCallStatus("Tap anywhere to start audio/video.");
        const retry = () => {
          remoteVideo.play().then(() => {
            setCallStatus("");
            document.removeEventListener("click", retry);
          }).catch(() => {});
        };
        document.addEventListener("click", retry);
      });
    });
    conn.addEventListener("connectionstatechange", () => {
      if (torn) return;
      if (conn.connectionState === "connected") {
        setCallStatus("");
        shareCodeBlock.classList.add("hide");
        overlay.classList.add("hide");
        // callHud is already visible from the moment the camera preview
        // started (see ensureLocalStream()) — nothing to show here.
        stopHeartbeat();
      } else if (conn.connectionState === "connecting") {
        setCallStatus("Connecting…");
      } else if (["disconnected", "failed", "closed"].includes(conn.connectionState)) {
        if (!torn) setCallStatus("Connection lost.");
      }
    });
    return conn;
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  // ---- Host role: generate a room, wait for a guest, send the offer ----

  async function startCall() {
    startCallBtn.disabled = true;
    joinCallBtn.disabled = true;
    setStatus("");
    try {
      await ensureLocalStream();
    } catch (err) {
      setStatus("Couldn't access camera/microphone: " + (err.message || err.name || "unknown error"));
      startCallBtn.disabled = false;
      joinCallBtn.disabled = false;
      return;
    }

    torn = false;
    deviceId = makeDeviceId();
    room = makeRoomCode();
    setCallStatus("Connecting to relay…");

    try {
      await connectSignaling(room, handleHostSignal);
    } catch (err) {
      endCall(err.message || "Couldn't start the call.");
      return;
    }

    shareRoomCode.textContent = room;
    const link = new URL("call.html", location.href);
    link.searchParams.set("room", room);
    shareLinkText.textContent = link.toString();
    shareCodeBlock.classList.remove("hide");
    setCallStatus("Waiting for the other device to join…");
  }

  async function handleHostSignal(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.from === deviceId) return;
    if (msg.type === "peer-here" && !pc) {
      remotePeerId = msg.from;
      try {
        pc = makePeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(pc);
        publish({ type: "offer", to: remotePeerId, sdp: pc.localDescription.sdp }, { qos: 1 });
        setCallStatus("Connecting…");
      } catch (err) {
        endCall("Couldn't connect: " + (err.message || err.name || "unknown error"));
      }
    } else if (msg.type === "answer" && msg.to === deviceId && pc) {
      if (pc.signalingState !== "have-local-offer") return; // dedupe: multiple relays / stale
      try { await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp }); } catch (e) {}
    }
  }

  // ---- Guest role: join an existing room by code, answer the offer ----

  async function joinCall() {
    const code = roomInput.value.trim().toUpperCase();
    if (code.length < 4) {
      setStatus("Enter the room code shown on the other device.");
      return;
    }
    startCallBtn.disabled = true;
    joinCallBtn.disabled = true;
    setStatus("");
    try {
      await ensureLocalStream();
    } catch (err) {
      setStatus("Couldn't access camera/microphone: " + (err.message || err.name || "unknown error"));
      startCallBtn.disabled = false;
      joinCallBtn.disabled = false;
      return;
    }

    torn = false;
    deviceId = makeDeviceId();
    room = code;
    setCallStatus("Connecting to relay…");

    try {
      await connectSignaling(room, handleGuestSignal);
    } catch (err) {
      endCall(err.message || "Couldn't join the call.");
      return;
    }

    setCallStatus("Waiting for the other device…");
    publish({ type: "peer-here" });
    heartbeatTimer = setInterval(() => publish({ type: "peer-here" }), 3000);
  }

  async function handleGuestSignal(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.from === deviceId) return;
    if (msg.type === "offer" && msg.to === deviceId) {
      if (pc && ["new", "connecting", "connected"].includes(pc.connectionState)) return; // dedupe
      remotePeerId = msg.from;
      try {
        pc = makePeerConnection();
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        publish({ type: "answer", to: remotePeerId, sdp: pc.localDescription.sdp }, { qos: 1 });
        setCallStatus("Connecting…");
        stopHeartbeat();
      } catch (err) {
        endCall("Couldn't connect: " + (err.message || err.name || "unknown error"));
      }
    }
  }

  // ---- Shared teardown + in-call controls ----

  function endCall(message) {
    torn = true;
    stopHeartbeat();
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    clients.forEach((c) => { try { c.end(true); } catch (e) {} });
    clients = [];
    disableDualCamera();
    stopAudioTint();
    stopLocalRenderPipeline();
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    localStreamPromise = null; // otherwise a later ensureLocalStream() would hand back the now-stopped stream
    videoTrack = null;
    zoomCaps = null;
    zoomPercent = 100;
    zoomValueEl.textContent = "100%";
    videoDevices = [];
    currentDeviceIndex = -1;
    cameraFeed.srcObject = null;
    remoteVideo.srcObject = null;
    room = null;
    remotePeerId = null;
    shareCodeBlock.classList.add("hide");
    callHud.classList.add("hide");
    switchCameraBtn.classList.add("hide");
    dualCameraBtn.classList.add("hide");
    setCallStatus("");
    overlay.classList.remove("hide");
    startCallBtn.disabled = false;
    joinCallBtn.disabled = false;
    muteBtn.classList.remove("active"); muteBtn.setAttribute("aria-pressed", "false"); muteBtn.textContent = "\u{1F3A4} Mute";
    cameraBlurOn = false;
    cameraBtn.classList.remove("active"); cameraBtn.setAttribute("aria-pressed", "false"); cameraBtn.textContent = "\u{1F32B}️ Blur camera";
    setStatus(message || "Call ended.");
    // Back to the lobby view, not a dark box — same reasoning as the
    // page-load preview at the bottom of this file.
    ensureLocalStream().catch(() => {});
  }

  // ---- Zoom ----

  function setZoom(percent) {
    zoomPercent = Math.min(500, Math.max(100, percent));
    zoomValueEl.textContent = Math.round(zoomPercent) + "%";
    applyZoomHardware(zoomPercent); // no-op if the device only supports digital zoom — renderLocalFrame() covers that case
  }
  zoomOutBtn.addEventListener("click", () => setZoom(zoomPercent - 20));
  zoomInBtn.addEventListener("click", () => setZoom(zoomPercent + 20));

  // ---- Switch camera — ported from video-production-app.js's function of
  // the same name/shape, adapted for localStream being a single stream
  // shared with the call's outgoing audio: only its video track gets
  // swapped (removeTrack/addTrack in place), audio and canvasStream (the
  // actual outgoing video, decoupled from which physical camera feeds it)
  // are both untouched — so switching cameras mid-call needs no
  // renegotiation at all, unlike Video Production's own version. ----

  function replacePrimaryVideoTrack(newTrack) {
    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop(); }
    localStream.addTrack(newTrack);
    videoTrack = newTrack;
    cameraFeed.srcObject = localStream;
    return cameraFeed.play();
  }

  async function switchCamera() {
    if (videoDevices.length <= 1 || switchingCamera || dualCameraActive) return;
    switchingCamera = true;
    switchCameraBtn.disabled = true;
    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    // The old track is released inside replacePrimaryVideoTrack() only
    // once the new one has already been granted (see below) — many
    // phones, especially Android, refuse a second concurrent camera open,
    // so requesting first and swapping second avoids a dark gap if the
    // request itself fails.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false
      });
      await replacePrimaryVideoTrack(stream.getVideoTracks()[0]);
      applyPrimaryCapabilities(videoTrack);
      currentDeviceIndex = nextIndex;
      await refreshVideoDevices();
    } catch (err) {
      console.error("Couldn't switch camera", err);
      // Try to recover some feed rather than leave the screen dark, same
      // fallback Video Production's own switchCamera() uses.
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        await replacePrimaryVideoTrack(fallback.getVideoTracks()[0]);
        applyPrimaryCapabilities(videoTrack);
        await refreshVideoDevices();
      } catch (err2) {
        alert("Camera lost — reload the page to reconnect.");
      }
    } finally {
      switchingCamera = false;
      switchCameraBtn.disabled = false;
    }
  }
  switchCameraBtn.addEventListener("click", switchCamera);
  if ("mediaDevices" in navigator && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", () => { if (localStream) refreshVideoDevices(); });
  }

  // ---- Dual camera (picture-in-picture) — ported from
  // video-production-app.js's functions of the same names/shapes. ----

  function pickSecondaryDevice() {
    if (videoDevices.length < 2) return null;
    const others = videoDevices.filter((_, i) => i !== currentDeviceIndex);
    const primaryLabel = (videoDevices[currentDeviceIndex] && videoDevices[currentDeviceIndex].label) || "";
    const wantsFront = /back|environment|rear/i.test(primaryLabel);
    const wantsBack = /front|user|selfie/i.test(primaryLabel);
    if (wantsFront) {
      const front = others.find((d) => /front|user|selfie/i.test(d.label));
      if (front) return front;
    }
    if (wantsBack) {
      const back = others.find((d) => /back|environment|rear/i.test(d.label));
      if (back) return back;
    }
    return others[0] || null;
  }

  async function enableDualCamera() {
    if (dualCameraActive || dualCameraBusy) return;
    const device = pickSecondaryDevice();
    if (!device) {
      alert("Only one camera available — nothing to add as a second feed.");
      return;
    }
    dualCameraBusy = true;
    dualCameraBtn.disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } },
        audio: false
      });
      secondaryStream = stream;
      cameraFeed2.srcObject = stream;
      await cameraFeed2.play();
      secondaryVideoTrack = stream.getVideoTracks()[0];
      if (!videoTexture2) videoTexture2 = C.createVideoTexture(gl);
      dualCameraActive = true;
      dualCameraBtn.classList.add("active");
      dualCameraBtn.textContent = "\u{1F4F9} Dual camera: On";
      swapCamerasBtn.classList.remove("hide");
      await refreshVideoDevices(); // also hides Switch camera while dual mode holds a second device
    } catch (err) {
      alert("Couldn't open a second camera: " + (err.message || err.name || "unknown error") +
        ". This device or browser may not support two camera streams at once.");
    } finally {
      dualCameraBusy = false;
      dualCameraBtn.disabled = false;
    }
  }

  function disableDualCamera() {
    if (secondaryStream) { secondaryStream.getTracks().forEach((t) => t.stop()); secondaryStream = null; }
    secondaryVideoTrack = null;
    cameraFeed2.srcObject = null;
    dualCameraActive = false;
    dualCameraBtn.classList.remove("active");
    dualCameraBtn.textContent = "\u{1F4F9} Dual camera";
    swapCamerasBtn.classList.add("hide");
    if (localStream) refreshVideoDevices(); // brings Switch camera back now only one device is held
  }

  dualCameraBtn.addEventListener("click", () => {
    if (dualCameraActive) disableDualCamera(); else enableDualCamera();
  });

  async function swapCameras() {
    if (!dualCameraActive || dualCameraBusy) return;
    dualCameraBusy = true;
    swapCamerasBtn.disabled = true;
    try {
      // Neither camera is reopened — both streams stay exactly as they
      // are, only which stream object holds which already-live video
      // track gets exchanged (localStream's audio track is untouched,
      // never part of this swap).
      const oldPrimaryTrack = localStream.getVideoTracks()[0];
      const oldSecondaryTrack = secondaryVideoTrack;
      localStream.removeTrack(oldPrimaryTrack);
      localStream.addTrack(oldSecondaryTrack);
      secondaryStream.removeTrack(oldSecondaryTrack);
      secondaryStream.addTrack(oldPrimaryTrack);
      cameraFeed.srcObject = localStream;
      cameraFeed2.srcObject = secondaryStream;
      await Promise.all([cameraFeed.play(), cameraFeed2.play()]);
      videoTrack = oldSecondaryTrack;
      secondaryVideoTrack = oldPrimaryTrack;
      applyPrimaryCapabilities(videoTrack);
      await refreshVideoDevices();
    } finally {
      dualCameraBusy = false;
      swapCamerasBtn.disabled = false;
    }
  }
  swapCamerasBtn.addEventListener("click", swapCameras);

  // ---- Audio Colour Tint ----

  function computeAudioTintHue() {
    if (!audioTintAnalyser || !audioTintCtx) return;
    const nyquist = audioTintCtx.sampleRate / 2;
    audioTintAnalyser.getByteFrequencyData(audioTintFreqData);
    const n = audioTintFreqData.length;
    let weightedHue = 0, totalEnergy = 0;
    AUDIO_TINT_BANDS.forEach((band) => {
      const from = Math.min(1, band.fromHz / nyquist);
      const to = Math.min(1, band.toHz / nyquist);
      const start = Math.floor(from * n);
      const end = Math.max(start + 1, Math.floor(to * n));
      let sum = 0;
      for (let i = start; i < end; i++) sum += audioTintFreqData[i];
      const energy = (sum / (end - start) / 255);
      weightedHue += band.hue * energy;
      totalEnergy += energy;
    });
    if (totalEnergy > 0) audioTintHue = weightedHue / totalEnergy;
    audioTintLevel = Math.min(1, totalEnergy / AUDIO_TINT_BANDS.length);
  }

  function startAudioTint() {
    if (audioTintAnalyser || !localStream) return; // already running, or no mic to analyse yet
    try {
      audioTintCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioTintCtx.createMediaStreamSource(localStream);
      audioTintAnalyser = audioTintCtx.createAnalyser();
      audioTintAnalyser.fftSize = 1024;
      audioTintAnalyser.smoothingTimeConstant = 0.8;
      source.connect(audioTintAnalyser);
      audioTintFreqData = new Uint8Array(audioTintAnalyser.frequencyBinCount);
      audioTintIntervalId = setInterval(computeAudioTintHue, 100);
    } catch (e) {
      // No AudioContext, or analysis failed to set up — audioTintOn just
      // stays visually a no-op (uAudioTintHue/Level default to 0) rather
      // than breaking the call.
    }
  }

  function stopAudioTint() {
    if (audioTintIntervalId) { clearInterval(audioTintIntervalId); audioTintIntervalId = null; }
    if (audioTintCtx) { try { audioTintCtx.close(); } catch (e) {} audioTintCtx = null; }
    audioTintAnalyser = null;
    audioTintFreqData = null;
    audioTintHue = 0;
    audioTintLevel = 0;
  }

  styleSelect.addEventListener("change", () => {
    if (styleSelect.value === "audiotint" && localStream) startAudioTint();
    else stopAudioTint();
  });

  muteBtn.addEventListener("click", () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const muted = !track.enabled;
    muteBtn.classList.toggle("active", muted);
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.textContent = muted ? "\u{1F507} Unmute" : "\u{1F3A4} Mute";
  });

  cameraBtn.addEventListener("click", () => {
    if (!canvasStream) return;
    // Doesn't stop or disable the outgoing track — see renderLocalFrame()
    // for why: this switches what it's actually showing (a heavy outline
    // blur) rather than cutting it to black, so the other side still sees
    // a live, moving picture, just an obscured one.
    cameraBlurOn = !cameraBlurOn;
    cameraBtn.classList.toggle("active", cameraBlurOn);
    cameraBtn.setAttribute("aria-pressed", String(cameraBlurOn));
    cameraBtn.textContent = cameraBlurOn ? "\u{1F4F7} Unblur" : "\u{1F32B}️ Blur camera";
  });

  hangupBtn.addEventListener("click", () => endCall("Call ended."));
  window.addEventListener("beforeunload", () => { if (!torn) endCall(); });

  // ---- Fullscreen, split screen ----
  // Same requestFullscreen()/exitFullscreen() pattern Video Production's
  // own fullscreen button uses. body.call-split-active (toggled below)
  // is what actually switches #stage from the small-corner-inset layout
  // to an equal-size split — see call.css.
  async function toggleFullscreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { try { await exit.call(document); } catch (e) {} }
    } else {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (!req) { alert("This browser doesn't support the Fullscreen API."); return; }
      try { await req.call(document.documentElement); }
      catch (e) { alert("Fullscreen didn't start: " + (e.name || "") + (e.message ? " — " + e.message : "")); }
    }
  }
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  // The browser's own exit gestures (Esc, swipe-down, back) bypass the
  // click handler above, so this is what actually keeps the split layout
  // and the button's pressed state honest regardless of how fullscreen
  // was entered or left.
  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fullscreenBtn.classList.toggle("active", active);
      fullscreenBtn.setAttribute("aria-pressed", String(active));
      document.body.classList.toggle("call-split-active", active);
      // The split layout changes localCanvas's on-screen size immediately
      // (corner inset -> half the screen) — resample its bounding rect
      // right away rather than waiting on a window resize event that may
      // not fire (or may lag the CSS class change) on every browser.
      resizeLocalCanvas();
    });
  });

  startCallBtn.addEventListener("click", startCall);
  joinCallBtn.addEventListener("click", joinCall);
  roomInput.addEventListener("keypress", (e) => { if (e.key === "Enter") joinCall(); });

  // A room link from the host (?room=CODE) prefills and auto-joins, same
  // convention as viewer.html's own ?room= handling.
  const prefilledRoom = new URLSearchParams(location.search).get("room");
  if (prefilledRoom) {
    roomInput.value = prefilledRoom.trim().toUpperCase();
    joinCall();
  } else {
    // A live self-view before committing to a call at all — like a video
    // app's "lobby": lets the chosen style actually be judged against your
    // own face before Start/Join, not just guessed at from the dropdown
    // label. Silent on failure here; the same error surfaces properly
    // (with a status message) the moment Start/Join is actually clicked.
    ensureLocalStream().catch(() => {});
  }
})();
