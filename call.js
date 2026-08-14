(() => {
  "use strict";

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
  const localVideo = document.getElementById("localVideo");
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
  let pc = null;
  let clients = [];
  let deviceId = null;
  let room = null;
  let heartbeatTimer = null;
  let remotePeerId = null;
  let torn = true; // true whenever no call is active/in-progress

  async function ensureLocalStream() {
    if (localStream) return localStream;
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    return localStream;
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
    localStream.getTracks().forEach((t) => conn.addTrack(t, localStream));
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
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    localVideo.srcObject = null;
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
    setStatus(message || "Call ended.");
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
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const off = !track.enabled;
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
  }
})();
