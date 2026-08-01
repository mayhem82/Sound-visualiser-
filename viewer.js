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

  const overlay = document.getElementById("overlay");
  const stage = document.getElementById("stage");
  const roomInput = document.getElementById("roomInput");
  const roomInput2 = document.getElementById("roomInput2");
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");
  const pane1 = document.getElementById("pane1");
  const pane2 = document.getElementById("pane2");
  const video1 = document.getElementById("video1");
  const video2 = document.getElementById("video2");
  const badge1 = document.getElementById("badge1");
  const badge2 = document.getElementById("badge2");

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

  // One independent pairing session per pane — its own device ID, MQTT
  // connections and RTCPeerConnection — so watching two devices at once
  // (split screen) is just two of these running side by side, same as this
  // author's darts scorer app watching two dartboards at once.
  function connectPane(room, videoEl, badgeEl) {
    const deviceId = makeDeviceId();
    let clients = [];
    let pc = null;
    let heartbeatTimer = null;
    let torn = false;

    function setBadge(text, ok) {
      badgeEl.textContent = text || "";
      badgeEl.classList.toggle("hide", !text);
      badgeEl.classList.toggle("ok", !!ok);
    }

    function publish(fields, opts) {
      opts = opts || {};
      const msg = Object.assign({ v: 1, from: deviceId, to: null, ts: Date.now() }, fields);
      const payload = JSON.stringify(msg);
      const topic = signalTopic(room);
      clients.forEach((c) => {
        if (c.connected) c.publish(topic, payload, { retain: !!opts.retain, qos: opts.qos != null ? opts.qos : 0 });
      });
    }

    function stopHeartbeat() {
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
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
        videoEl.srcObject = e.streams[0];
      });

      pc.addEventListener("connectionstatechange", () => {
        if (!pc || torn) return;
        if (pc.connectionState === "connected") {
          setBadge(`● Room ${room}`, true);
          stopHeartbeat();
        } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          setBadge(`Room ${room} — connection lost`, false);
        }
      });

      try {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        publish({ type: "answer", to: msg.from, sdp: pc.localDescription.sdp }, { qos: 1 });
        setBadge(`Room ${room} — connecting…`, false);
      } catch (err) {
        setBadge(`Room ${room} — ` + (err.message || err.name || "couldn't connect"), false);
      }
    }

    function handleMessage(raw) {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || msg.from === deviceId) return; // ignore self-echo (multi-broker + own traffic)
      if (msg.type === "offer" && msg.to === deviceId) handleOffer(msg);
    }

    setBadge(`Room ${room} — connecting to relay…`, false);

    // Resolves once this pane has reached a relay and is waiting to be
    // paired — not once the video itself is flowing, which can take a bit
    // longer. That's enough to know the room code was valid and there's a
    // real path forward, so the join screen can hand off to this pane's
    // own on-video status badge instead of blocking further.
    const ready = new Promise((resolveReady, rejectReady) => {
      loadMqttLib().then(() => {
        if (torn) { rejectReady(new Error("cancelled")); return; }
        let resolved = false;
        const topic = signalTopic(room);
        clients = LIVE_BROKERS.map((url) => {
          const client = window.mqtt.connect(url, { connectTimeout: 9000, reconnectPeriod: 5000 });
          client.on("connect", () => {
            client.subscribe(topic, { qos: 1 });
            if (!resolved) {
              resolved = true;
              setBadge(`Room ${room} — waiting for other device…`, false);
              startHeartbeat();
              resolveReady();
            }
          });
          client.on("message", (t, payload) => {
            if (t === topic) handleMessage(payload.toString());
          });
          return client;
        });

        setTimeout(() => {
          if (resolved || torn) return;
          setBadge(`Room ${room} — couldn't reach a relay`, false);
          rejectReady(new Error("Couldn't reach a relay — check your internet connection and try again."));
        }, 9000);
      }).catch((err) => {
        if (torn) return;
        setBadge(err.message || `Room ${room} — couldn't load pairing library`, false);
        rejectReady(err);
      });
    });

    return {
      ready,
      teardown() {
        torn = true;
        stopHeartbeat();
        if (pc) { pc.close(); pc = null; }
        clients.forEach((c) => { try { c.end(true); } catch (e) {} });
        clients = [];
        videoEl.srcObject = null;
      }
    };
  }

  let teardownFns = [];

  function connect() {
    const codes = [roomInput.value.trim().toUpperCase(), roomInput2.value.trim().toUpperCase()]
      .filter((c) => c.length >= 4);
    if (!codes.length) {
      setStatus("Enter the room code shown on the other device.");
      return;
    }

    teardownFns.forEach((fn) => fn());
    teardownFns = [];

    connectBtn.disabled = true;
    setStatus("Connecting…");

    const dual = codes.length > 1;
    stage.classList.toggle("split", dual);
    pane2.classList.toggle("hide", !dual);

    const panes = [connectPane(codes[0], video1, badge1)];
    if (dual) panes.push(connectPane(codes[1], video2, badge2));
    teardownFns = panes.map((p) => p.teardown);

    Promise.allSettled(panes.map((p) => p.ready)).then((results) => {
      const anyReached = results.some((r) => r.status === "fulfilled");
      if (anyReached) {
        overlay.classList.add("hide");
        setStatus("");
      } else {
        // No pane could even reach a relay — nothing worth watching, so
        // hand control back instead of leaving a black screen with no way
        // to retry short of reloading the page.
        teardownFns.forEach((fn) => fn());
        teardownFns = [];
        stage.classList.remove("split");
        pane2.classList.add("hide");
        badge1.classList.add("hide");
        badge2.classList.add("hide");
        const firstError = results.find((r) => r.status === "rejected");
        setStatus((firstError && firstError.reason && firstError.reason.message) ||
          "Couldn't connect. Check your internet connection and try again.");
        connectBtn.disabled = false;
      }
    });
  }

  connectBtn.addEventListener("click", connect);
  roomInput.addEventListener("keypress", (e) => { if (e.key === "Enter") connect(); });
  roomInput2.addEventListener("keypress", (e) => { if (e.key === "Enter") connect(); });

  // A "Start live sharing" link on the broadcaster side can embed the room
  // code as ?room=CODE so opening it is enough — no typing needed at all.
  // Two comma-separated codes (?room=CODE1,CODE2) prefill both fields and
  // connect straight to split screen, same convention as the darts
  // scorer's dual-board live view.
  const prefilledRooms = (new URLSearchParams(location.search).get("room") || "")
    .split(",").map((r) => r.trim().toUpperCase()).filter((r) => r.length >= 4).slice(0, 2);
  if (prefilledRooms.length) {
    roomInput.value = prefilledRooms[0];
    if (prefilledRooms[1]) roomInput2.value = prefilledRooms[1];
    connect();
  }
})();
