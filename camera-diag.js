(() => {
  "use strict";

  const checkBtn = document.getElementById("checkBtn");
  const status = document.getElementById("status");
  const deviceList = document.getElementById("deviceList");
  const selectA = document.getElementById("selectA");
  const selectB = document.getElementById("selectB");
  const tryBothBtn = document.getElementById("tryBothBtn");
  const concurrencyStatus = document.getElementById("concurrencyStatus");
  const videoA = document.getElementById("videoA");
  const videoB = document.getElementById("videoB");

  let videoDevices = [];
  let streamA = null;
  let streamB = null;

  function setStatus(el, msg) {
    el.textContent = msg;
  }

  // enumerateDevices() only returns real, non-blank labels once permission
  // has been granted at least once -- so this briefly opens the camera
  // purely to unlock labels, then immediately releases it. Nothing here
  // needs a live stream to answer "what cameras exist".
  async function checkCameras() {
    setStatus(status, "Requesting camera permission…");
    deviceList.innerHTML = "";
    let permissionStream = null;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      setStatus(status, "Camera permission failed: " + (err.message || err.name || "unknown error"));
      return;
    }
    permissionStream.getTracks().forEach((t) => t.stop());

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      setStatus(status, `Found ${videoDevices.length} video input device${videoDevices.length === 1 ? "" : "s"}.`);
      videoDevices.forEach((d, i) => {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = d.label || `Camera ${i + 1} (no label)`;
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = `deviceId: ${d.deviceId.slice(0, 24)}… · groupId: ${d.groupId ? d.groupId.slice(0, 24) + "…" : "(none)"}`;
        li.appendChild(label);
        li.appendChild(meta);
        deviceList.appendChild(li);
      });
      populateSelects();
    } catch (err) {
      setStatus(status, "enumerateDevices() failed: " + (err.message || err.name || "unknown error"));
    }
  }

  function populateSelects() {
    [selectA, selectB].forEach((sel) => {
      sel.innerHTML = "";
      videoDevices.forEach((d, i) => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `Camera ${i + 1}`;
        sel.appendChild(opt);
      });
    });
    // Default to two different devices when there are at least two, so the
    // concurrency test is meaningful on first click rather than testing a
    // device against itself.
    if (videoDevices.length > 1) selectB.selectedIndex = 1;
  }

  function stopStream(stream) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  // The actual concurrency test: request both streams back-to-back WITHOUT
  // stopping the first one in between. If the phone's camera stack only
  // allows one active capture session at a time (a real, common limitation
  // on Android especially, even across two different rear lenses), the
  // second call fails here -- and that failure, with its real name/message,
  // is exactly what this page exists to surface honestly.
  async function tryBoth() {
    stopStream(streamA);
    stopStream(streamB);
    streamA = null;
    streamB = null;
    videoA.srcObject = null;
    videoB.srcObject = null;

    const idA = selectA.value;
    const idB = selectB.value;
    if (!idA || !idB) {
      setStatus(concurrencyStatus, "Pick a camera for both A and B first.");
      return;
    }

    setStatus(concurrencyStatus, "Opening Camera A…");
    try {
      streamA = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: idA } }, audio: false });
      videoA.srcObject = streamA;
      await videoA.play();
    } catch (err) {
      setStatus(concurrencyStatus, "Camera A failed to open: " + (err.name || "Error") + " — " + (err.message || "unknown error"));
      return;
    }

    setStatus(concurrencyStatus, "Camera A open. Opening Camera B without closing A…");
    try {
      streamB = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: idB } }, audio: false });
      videoB.srcObject = streamB;
      await videoB.play();
    } catch (err) {
      setStatus(
        concurrencyStatus,
        "Camera B failed to open while A was still active: " + (err.name || "Error") + " — " +
        (err.message || "unknown error") +
        ". This device/browser can't run two camera streams at once."
      );
      return;
    }

    setStatus(concurrencyStatus, "Both cameras opened and are streaming at the same time — concurrent capture works on this device.");
  }

  checkBtn.addEventListener("click", checkCameras);
  tryBothBtn.addEventListener("click", tryBoth);
})();
