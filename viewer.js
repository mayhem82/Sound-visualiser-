(() => {
  "use strict";

  // Same public STUN server used on the broadcasting side (colorvision.js) —
  // needed for NAT traversal even on the same wifi network in many router
  // configurations. No TURN relay is configured, so very restrictive
  // networks (symmetric NAT, some corporate firewalls) can still block the
  // connection; that's a real limitation of a fully serverless P2P setup.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  const remoteVideo = document.getElementById("remoteVideo");
  const overlay = document.getElementById("overlay");
  const offerInput = document.getElementById("offerInput");
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");
  const replyBlock = document.getElementById("replyBlock");
  const answerOutput = document.getElementById("answerOutput");
  const copyAnswerBtn = document.getElementById("copyAnswerBtn");
  const connectionBadge = document.getElementById("connectionBadge");

  let pc = null;

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  // Connection codes are just the SDP session description, base64-encoded
  // as a single opaque blob so copy/paste UIs (which often mangle
  // newlines) can't corrupt it.
  function encodeSignal(desc) {
    return btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));
  }

  function decodeSignal(code) {
    return JSON.parse(atob(code.trim()));
  }

  // Waiting for ICE gathering to finish before generating the shareable
  // code means every candidate is already embedded in the SDP — a single
  // copy/paste round trip is enough, no separate candidate exchange needed.
  function waitForIceGatheringComplete(peer) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      function check() {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      }
      peer.addEventListener("icegatheringstatechange", check);
    });
  }

  async function connect() {
    const raw = offerInput.value.trim();
    if (!raw) {
      setStatus("Paste a connection code first.");
      return;
    }
    let offer;
    try {
      offer = decodeSignal(raw);
    } catch (e) {
      setStatus("That doesn't look like a valid connection code.");
      return;
    }

    connectBtn.disabled = true;
    setStatus("Connecting…");

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
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        connectionBadge.classList.add("hide");
        overlay.classList.remove("hide");
        setStatus("Connection lost. Reload this page to pair again.");
      }
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc);
      answerOutput.value = encodeSignal(pc.localDescription);
      replyBlock.classList.remove("hide");
      setStatus("Copy the reply code below back to the other device to finish connecting.");
    } catch (err) {
      setStatus("Couldn't connect: " + (err.message || err.name || "unknown error"));
      connectBtn.disabled = false;
    }
  }

  connectBtn.addEventListener("click", connect);

  copyAnswerBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(answerOutput.value);
      copyAnswerBtn.textContent = "Copied!";
      setTimeout(() => { copyAnswerBtn.textContent = "Copy reply code"; }, 1500);
    } catch (e) {
      answerOutput.select();
      setStatus("Couldn't copy automatically — the code is selected, copy it manually.");
    }
  });
})();
