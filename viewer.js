(() => {
  "use strict";

  // Same public STUN server used on the broadcasting side (colorvision.js /
  // restore.js) — needed for NAT traversal even on the same wifi network in
  // many router configurations. No TURN relay is configured, so very
  // restrictive networks (symmetric NAT, some corporate firewalls) can
  // still block the connection; that's a real limitation of a fully
  // serverless P2P setup.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  // The offer/answer handshake itself doesn't ride WebRTC (there's no
  // connection yet to carry it) — it rides a few public MQTT-over-websocket
  // brokers instead, addressed by a random per-device ID so unrelated
  // traffic on other rooms is ignored. This is what lets pairing be "type
  // in a 5-character code" instead of "paste a multi-KB SDP blob between
  // two devices with no clipboard sync" — same pattern as the live-sharing
  // feature in this author's darts scorer app.
  const LIVE_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt",
    "wss://test.mosquitto.org:8081/mqtt",
  ];

  const remoteVideo = document.getElementById("remoteVideo");
  const overlay = document.getElementById("overlay");
  const roomInput = document.getElementById("roomInput");
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");
  const connectionBadge = document.getElementById("connectionBadge");

  const deviceId = makeDeviceId();
  let pc = null;
  let clients = [];
  let heartbeatTimer = null;
  let room = null;

  function makeDeviceId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function signalTopic(r) {
    return `sound-visualiser-pair/${r}/signal`;
  }

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function loadMqttLib() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the live-pairing library — check your internet connection."));
      document.head.appendChild(s);
    });
  }

  function publish(fields, opts) {
    opts = opts || {};
    const msg = Object.assign({ v: 1, from: deviceId, to: null, ts: Date.now() }, fields);
    const payload = JSON.stringify(msg);
    clients.forEach((c) => {
      if (c.connected) c.publish(signalTopic(room), payload, { retain: !!opts.retain, qos: opts.qos != null ? opts.qos : 0 });
    });
  }

  // Waiting for ICE gathering to finish before sending the answer means
  // every candidate is already embedded in the SDP — no separate ICE
  // candidate exchange needed over the relay.
  function waitForIceGatheringComplete(peer) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        peer.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
      function check() {
        if (peer.iceGatheringState === "complete") finish();
      }
      peer.addEventListener("icegatheringstatechange", check);
      setTimeout(finish, 3500);
    });
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    publish({ type: "viewer-here" });
    heartbeatTimer = setInterval(() => publish({ type: "viewer-here" }), 3000);
  }

  async function handleOffer(msg) {
    // Ignore duplicate delivery of the same offer — it arrives once per
    // connected broker (up to 3x), and would otherwise tear down and
    // restart a negotiation that's already in progress/connected.
    if (pc && ["new", "connecting", "connected"].includes(pc.connectionState)) return;

    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.addEventListener("track", (e) => {
      remoteVideo.srcObject = e.streams[0];
    });

    pc.addEventListener("connectionstatechange", () => {
      if (!pc) return;
      if (pc.connectionState === "connected") {
        setStatus("");
        overlay.classList.add("hide");
        connectionBadge.textContent = "● Connected";
        connectionBadge.classList.remove("hide");
        stopHeartbeat();
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        connectionBadge.classList.add("hide");
        overlay.classList.remove("hide");
        setStatus("Connection lost. Reload this page to pair again.");
      }
    });

    try {
      await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc);
      publish({ type: "answer", to: msg.from, sdp: pc.localDescription.sdp }, { qos: 1 });
      setStatus("Connecting…");
    } catch (err) {
      setStatus("Couldn't connect: " + (err.message || err.name || "unknown error"));
    }
  }

  function handleMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.from === deviceId) return; // ignore self-echo (multi-broker + own traffic)
    if (msg.type === "offer" && msg.to === deviceId) handleOffer(msg);
  }

  async function connect() {
    const code = roomInput.value.trim().toUpperCase();
    if (code.length < 4) {
      setStatus("Enter the room code shown on the other device.");
      return;
    }
    room = code;
    connectBtn.disabled = true;
    setStatus("Connecting to relay…");

    try {
      await loadMqttLib();
    } catch (err) {
      setStatus(err.message || "Couldn't load the live-pairing library.");
      connectBtn.disabled = false;
      return;
    }

    let resolved = false;
    const topic = signalTopic(room);
    clients = LIVE_BROKERS.map((url) => {
      const client = window.mqtt.connect(url, { connectTimeout: 9000, reconnectPeriod: 5000 });
      client.on("connect", () => {
        client.subscribe(topic, { qos: 1 });
        if (!resolved) {
          resolved = true;
          setStatus("Waiting for the other device…");
          startHeartbeat();
        }
      });
      client.on("message", (t, payload) => {
        if (t === topic) handleMessage(payload.toString());
      });
      return client;
    });

    setTimeout(() => {
      if (!resolved) {
        setStatus("Couldn't reach a relay — check your internet connection and try again.");
        connectBtn.disabled = false;
      }
    }, 9000);
  }

  connectBtn.addEventListener("click", connect);
  roomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") connect();
  });

  // A "Start live sharing" link on the broadcaster side can embed the room
  // code as ?room=CODE so opening it is enough — no typing needed at all.
  const prefilledRoom = new URLSearchParams(location.search).get("room");
  if (prefilledRoom) {
    roomInput.value = prefilledRoom.toUpperCase();
    connect();
  }
})();
