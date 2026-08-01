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
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");
  const pane1 = document.getElementById("pane1"); // "Original"
  const pane2 = document.getElementById("pane2"); // "Modified" — also the single-stream fallback pane
  const video1 = document.getElementById("video1");
  const video2 = document.getElementById("video2");
  const badge1 = document.getElementById("badge1");
  const badge2 = document.getElementById("badge2");
  const hud = document.getElementById("hud");
  const splitToggleBtn = document.getElementById("splitToggleBtn");
  const photoBtn = document.getElementById("photoBtn");
  const recordBtn = document.getElementById("recordBtn");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const recordingIndicatorTime = document.getElementById("recordingIndicatorTime");

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

  // ---- Single-room pairing, up to two tracks ----
  // The broadcaster (colorvision.js / restore.js) sends its corrected
  // canvas feed and, alongside it, a second "original" feed straight from
  // the camera — same orientation handling, no colour correction — so this
  // page can show both at once for comparison. Which incoming WebRTC track
  // is which is carried as plain metadata on the "offer" signaling message
  // (correctedStreamId / originalStreamId, matched against the MediaStream
  // id WebRTC preserves end-to-end) rather than guessed from arrival order,
  // since track event ordering isn't guaranteed. Older/other broadcasters
  // that only ever send one stream still work — it lands in the "Modified"
  // pane and the "Original" pane just stays hidden, single full screen.
  function connectRoom(room) {
    const deviceId = makeDeviceId();
    let clients = [];
    let pc = null;
    let heartbeatTimer = null;
    let torn = false;
    let pendingIds = null;
    let dual = false;

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

    function setBadges(text, ok) {
      if (dual) {
        badge1.textContent = `Original — ${text}`;
        badge2.textContent = `Modified — ${text}`;
      } else {
        badge1.textContent = "";
        badge2.textContent = text;
      }
      badge1.classList.toggle("hide", !dual);
      badge2.classList.remove("hide");
      badge1.classList.toggle("ok", !!ok);
      badge2.classList.toggle("ok", !!ok);
    }

    async function handleOffer(msg) {
      // Ignore duplicate delivery of the same offer — it arrives once per
      // connected broker (up to 3x), and would otherwise tear down and
      // restart a negotiation that's already in progress/connected.
      if (pc && ["new", "connecting", "connected"].includes(pc.connectionState)) return;

      pendingIds = { corrected: msg.correctedStreamId || null, original: msg.originalStreamId || null };
      dual = !!(pendingIds.corrected && pendingIds.original);
      applySplitVisibility(dual);

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.addEventListener("track", (e) => {
        const streamId = e.streams[0] && e.streams[0].id;
        let target = video2;
        if (pendingIds && streamId === pendingIds.original) {
          target = video1;
        } else if (pendingIds && streamId === pendingIds.corrected) {
          target = video2;
        } else if (dual) {
          // Metadata didn't match (shouldn't normally happen) — fall back
          // to arrival order: whichever pane is still empty gets it next.
          target = video1.srcObject ? video2 : video1;
        }
        target.srcObject = e.streams[0];
      });

      pc.addEventListener("connectionstatechange", () => {
        if (!pc || torn) return;
        if (pc.connectionState === "connected") {
          setBadges("connected", true);
          stopHeartbeat();
        } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          setBadges("connection lost", false);
        }
      });

      try {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        publish({ type: "answer", to: msg.from, sdp: pc.localDescription.sdp }, { qos: 1 });
        setBadges("connecting…", false);
      } catch (err) {
        setBadges(err.message || err.name || "couldn't connect", false);
      }
    }

    function handleMessage(raw) {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || msg.from === deviceId) return; // ignore self-echo (multi-broker + own traffic)
      if (msg.type === "offer" && msg.to === deviceId) handleOffer(msg);
    }

    setBadges("connecting to relay…", false);

    // Resolves once this room has reached a relay and is waiting to be
    // paired — not once the video itself is flowing, which can take a bit
    // longer. That's enough to know the room code was valid and there's a
    // real path forward, so the join screen can hand off to the on-video
    // status badges instead of blocking further.
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
              setBadges("waiting for other device…", false);
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
          setBadges("couldn't reach a relay", false);
          rejectReady(new Error("Couldn't reach a relay — check your internet connection and try again."));
        }, 9000);
      }).catch((err) => {
        if (torn) return;
        setBadges(err.message || "couldn't load pairing library", false);
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
        video1.srcObject = null;
        video2.srcObject = null;
      }
    };
  }

  let activeRoom = null;
  let splitAllowed = false;
  let splitOn = true;

  function applySplitVisibility(dual) {
    splitAllowed = dual;
    splitToggleBtn.classList.toggle("hide", !dual);
    const showSplit = dual && splitOn;
    stage.classList.toggle("split", showSplit);
    pane1.classList.toggle("hide", !showSplit);
  }

  splitToggleBtn.addEventListener("click", () => {
    splitOn = !splitOn;
    splitToggleBtn.setAttribute("aria-pressed", String(splitOn));
    splitToggleBtn.textContent = splitOn ? "Split view" : "Modified only";
    applySplitVisibility(splitAllowed);
  });

  function connect() {
    const room = roomInput.value.trim().toUpperCase();
    if (room.length < 4) {
      setStatus("Enter the room code shown on the other device.");
      return;
    }

    if (activeRoom) activeRoom.teardown();
    splitOn = true;
    splitToggleBtn.setAttribute("aria-pressed", "true");
    splitToggleBtn.textContent = "Split view";
    applySplitVisibility(false);

    connectBtn.disabled = true;
    setStatus("Connecting…");

    activeRoom = connectRoom(room);
    activeRoom.ready.then(() => {
      overlay.classList.add("hide");
      setStatus("");
      hud.classList.remove("hide");
      startCompositeLoop();
    }).catch((err) => {
      // Couldn't even reach a relay — nothing worth watching, so hand
      // control back instead of leaving a black screen with no way to
      // retry short of reloading the page.
      activeRoom = null;
      applySplitVisibility(false);
      setStatus((err && err.message) || "Couldn't connect. Check your internet connection and try again.");
      connectBtn.disabled = false;
    });
  }

  connectBtn.addEventListener("click", connect);
  roomInput.addEventListener("keypress", (e) => { if (e.key === "Enter") connect(); });

  // ---- Photo + video capture of whatever's currently on screen ----
  // Draws whichever panes are actually visible into an offscreen canvas,
  // positioned and scaled to match their real on-screen layout (read
  // straight from getBoundingClientRect, so it stays correct through
  // split/stacked/single-pane and portrait/landscape without duplicating
  // the CSS grid logic in JS) — then that canvas is what gets
  // photographed or recorded, same captureStream()+MediaRecorder pattern
  // as the broadcaster side (colorvision.js / restore.js).
  const captureCanvas = document.createElement("canvas");
  const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: false });
  let compositeRafId = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingMimeType = "";
  let isRecording = false;
  let recordingStartedAt = 0;
  let recordingTimerId = null;

  function resizeCaptureCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    captureCanvas.width = Math.round(window.innerWidth * dpr);
    captureCanvas.height = Math.round(window.innerHeight * dpr);
  }
  resizeCaptureCanvas();
  window.addEventListener("resize", resizeCaptureCanvas);

  function drawComposite() {
    const dpr = captureCanvas.width / window.innerWidth;
    captureCtx.fillStyle = "#000";
    captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
    [pane1, pane2].forEach((paneEl) => {
      if (paneEl.classList.contains("hide")) return;
      const videoEl = paneEl.querySelector("video");
      if (!videoEl || !videoEl.videoWidth) return;
      const rect = paneEl.getBoundingClientRect();
      const dx = rect.left * dpr, dy = rect.top * dpr, dw = rect.width * dpr, dh = rect.height * dpr;
      // Reproduce the pane's CSS "object-fit: contain" so the capture
      // matches what's actually visible instead of stretching to fill it.
      const vAspect = videoEl.videoWidth / videoEl.videoHeight;
      const rAspect = dw / dh;
      let drawW, drawH, offX, offY;
      if (vAspect > rAspect) {
        drawW = dw; drawH = dw / vAspect; offX = 0; offY = (dh - drawH) / 2;
      } else {
        drawH = dh; drawW = dh * vAspect; offY = 0; offX = (dw - drawW) / 2;
      }
      captureCtx.drawImage(videoEl, dx + offX, dy + offY, drawW, drawH);
    });
  }

  function compositeLoop() {
    drawComposite();
    compositeRafId = requestAnimationFrame(compositeLoop);
  }

  function startCompositeLoop() {
    if (compositeRafId) return;
    compositeLoop();
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

  function timestampForFilename() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  function takePhoto() {
    drawComposite();
    captureCanvas.toBlob((blob) => {
      if (!blob) { setStatus("Couldn't capture a photo — try again."); return; }
      downloadBlob(blob, `colour-vision-viewer-photo-${timestampForFilename()}.png`);
    }, "image/png");
  }

  function pickRecordingMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    return candidates.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  }

  function updateRecordingLabel() {
    const secs = Math.floor((Date.now() - recordingStartedAt) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    recordBtn.textContent = `⏹ ${mm}:${ss}`;
    recordingIndicatorTime.textContent = `${mm}:${ss}`;
  }

  function startRecording() {
    if (isRecording) return;
    recordingMimeType = pickRecordingMimeType();
    if (!recordingMimeType) {
      setStatus("Video recording isn't supported in this browser.");
      return;
    }
    let stream;
    try {
      stream = captureCanvas.captureStream(30);
    } catch (err) {
      setStatus("Couldn't start recording: " + (err.message || err.name || "unknown error"));
      return;
    }
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: recordingMimeType });
    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      const ext = recordingMimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(recordedChunks, { type: recordingMimeType });
      recordedChunks = [];
      if (blob.size > 0) {
        downloadBlob(blob, `colour-vision-viewer-video-${timestampForFilename()}.${ext}`);
      } else {
        setStatus("Recording produced no data — try again.");
      }
    });
    mediaRecorder.start();
    isRecording = true;
    recordingStartedAt = Date.now();
    recordBtn.classList.add("recording");
    recordBtn.setAttribute("aria-pressed", "true");
    recordingIndicator.classList.remove("hide");
    updateRecordingLabel();
    recordingTimerId = setInterval(updateRecordingLabel, 500);
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.classList.remove("recording");
    recordBtn.setAttribute("aria-pressed", "false");
    recordBtn.textContent = "⏺ Record";
    recordingIndicator.classList.add("hide");
    if (recordingTimerId) { clearInterval(recordingTimerId); recordingTimerId = null; }
  }

  photoBtn.addEventListener("click", takePhoto);
  recordBtn.addEventListener("click", () => {
    if (isRecording) stopRecording();
    else startRecording();
  });

  // A "Start live sharing" link on the broadcaster side can embed the room
  // code as ?room=CODE so opening it is enough — no typing needed at all.
  const prefilledRoom = new URLSearchParams(location.search).get("room");
  if (prefilledRoom) {
    roomInput.value = prefilledRoom.trim().toUpperCase();
    connect();
  }
})();
