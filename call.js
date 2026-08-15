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
  const muteBtn = document.getElementById("muteBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const hangupBtn = document.getElementById("hangupBtn");

  function setStatus(msg) { statusEl.textContent = msg || ""; }
  function setCallStatus(msg) { callStatus.textContent = msg || ""; }

  let localStream = null;
  let canvasStream = null; // captured from localCanvas — this is what's actually sent as the outgoing video track
  let pc = null;
  let clients = [];
  let deviceId = null;
  let room = null;
  let heartbeatTimer = null;
  let remotePeerId = null;
  let torn = true; // true whenever no call is active/in-progress

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
    C.uploadPointUniforms(gl, program, uniforms, []); // no calibrated colour points on this page — Normal/Cartoon only
    resizeLocalCanvas();
    window.addEventListener("resize", resizeLocalCanvas);
    renderLocalFrame();
    canvasStream = localCanvas.captureStream(30);
  }

  function renderLocalFrame() {
    if (gl && cameraFeed.readyState >= cameraFeed.HAVE_CURRENT_DATA) {
      const cover = C.computeCoverUv(cameraFeed.videoWidth, cameraFeed.videoHeight, localCanvas.width, localCanvas.height);
      const cartoonOn = styleSelect.value === "cartoon";
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cameraFeed);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uBlend, 1);
      gl.uniform1f(uniforms.uOutlineEnabled, 0);
      gl.uniform1f(uniforms.uOutlineThickness, 2);
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
      gl.uniform1f(uniforms.uDuoEnabled, 0);
      gl.uniform1f(uniforms.uDuoBlend, 0);
      gl.uniform3f(uniforms.uDuoLo, 0, 0, 0);
      gl.uniform3f(uniforms.uDuoHi, 1, 1, 1);
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
    }
    renderRafId = requestAnimationFrame(renderLocalFrame);
  }

  function stopLocalRenderPipeline() {
    if (renderRafId) { cancelAnimationFrame(renderRafId); renderRafId = null; }
    window.removeEventListener("resize", resizeLocalCanvas);
    gl = program = uniforms = videoTexture = undefined;
    canvasStream = null;
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
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraFeed.srcObject = localStream;
      await cameraFeed.play();
      initLocalRenderPipeline();
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
        callHud.classList.remove("hide");
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
    stopLocalRenderPipeline();
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    localStreamPromise = null; // otherwise a later ensureLocalStream() would hand back the now-stopped stream
    cameraFeed.srcObject = null;
    remoteVideo.srcObject = null;
    room = null;
    remotePeerId = null;
    shareCodeBlock.classList.add("hide");
    callHud.classList.add("hide");
    setCallStatus("");
    overlay.classList.remove("hide");
    startCallBtn.disabled = false;
    joinCallBtn.disabled = false;
    muteBtn.classList.remove("active"); muteBtn.setAttribute("aria-pressed", "false"); muteBtn.textContent = "\u{1F3A4} Mute";
    cameraBtn.classList.remove("active"); cameraBtn.setAttribute("aria-pressed", "false"); cameraBtn.textContent = "\u{1F4F8} Camera off";
    localCanvas.classList.remove("camera-off");
    setStatus(message || "Call ended.");
    // Back to the lobby view, not a dark box — same reasoning as the
    // page-load preview at the bottom of this file.
    ensureLocalStream().catch(() => {});
  }

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
    // Toggles the *outgoing* (canvas-captured) track, not the raw camera
    // track — the camera itself keeps running so the local self-view
    // preview stays live (dimmed via .camera-off, see call.css) even
    // while the other side sees nothing.
    const track = canvasStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const off = !track.enabled;
    localCanvas.classList.toggle("camera-off", off);
    cameraBtn.classList.toggle("active", off);
    cameraBtn.setAttribute("aria-pressed", String(off));
    cameraBtn.textContent = off ? "\u{1F4F7} Camera on" : "\u{1F4F8} Camera off";
  });

  hangupBtn.addEventListener("click", () => endCall("Call ended."));
  window.addEventListener("beforeunload", () => { if (!torn) endCall(); });

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
