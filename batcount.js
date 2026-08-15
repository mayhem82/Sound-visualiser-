(() => {
  "use strict";

  // Flying Fox Count — a counting aid for bat colony emergence/return
  // counts at sunset/sunrise. Self-contained: no shared engine with the
  // colour-correction pages, since all it needs is grayscale + Sobel edge
  // detection + connected-component labelling on a small offscreen canvas,
  // not the full WebGL correction pipeline.
  //
  // The manual tally (tap +1 per bat you see) is the count that's actually
  // trusted. Blob auto-detection just highlights likely bat-shaped edges
  // frame by frame as a spotting aid against a dark sky — it WILL miss
  // overlapping/distant bats and WILL false-positive on insects, birds, and
  // wind-shaken leaves. This is not a validated automated counter.

  const LOG_KEY = "batcountSessions_v1";
  const MAX_LOG_ENTRIES = 200;
  const ANALYSIS_MAX_DIM = 320; // longest side of the downscaled analysis buffer
  const DETECT_INTERVAL_MS = 200; // ~5Hz — plenty for a human-paced tally aid

  const cameraFeed = document.getElementById("cameraFeed");
  const outlineCanvas = document.getElementById("outlineCanvas");
  const outlineCtx = outlineCanvas.getContext("2d");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const overlayCtx = overlayCanvas.getContext("2d");
  const cameraStatus = document.getElementById("cameraStatus");

  const overlay = document.getElementById("overlay");
  const sessionTypeSelect = document.getElementById("sessionTypeSelect");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  const logSection = document.getElementById("logSection");
  const logList = document.getElementById("logList");
  const exportLogBtn = document.getElementById("exportLogBtn");
  const clearLogBtn = document.getElementById("clearLogBtn");

  const tallyBlock = document.getElementById("tallyBlock");
  const tallyLabel = document.getElementById("tallyLabel");
  const tallyCount = document.getElementById("tallyCount");
  const tallyPlusBtn = document.getElementById("tallyPlusBtn");
  const tallyMinusBtn = document.getElementById("tallyMinusBtn");
  const detectedReadout = document.getElementById("detectedReadout");

  const hud = document.getElementById("hud");
  const outlineModeBtn = document.getElementById("outlineModeBtn");
  const detectToggleBtn = document.getElementById("detectToggleBtn");
  const sensitivitySlider = document.getElementById("sensitivitySlider");
  const sensitivityLabel = document.getElementById("sensitivityLabel");
  const minSizeSlider = document.getElementById("minSizeSlider");
  const minSizeLabel = document.getElementById("minSizeLabel");
  const maxSizeSlider = document.getElementById("maxSizeSlider");
  const maxSizeLabel = document.getElementById("maxSizeLabel");
  const minMovementSlider = document.getElementById("minMovementSlider");
  const minMovementLabel = document.getElementById("minMovementLabel");
  const trackedReadout = document.getElementById("trackedReadout");
  const switchCameraBtn = document.getElementById("switchCameraBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const endSessionBtn = document.getElementById("endSessionBtn");

  let stream = null;
  let videoTrack = null;
  let videoDevices = [];
  let currentDeviceIndex = -1;
  let sessionStartedAt = null;
  let sessionType = "sunset";
  let tally = 0;
  let paused = false;
  let outlineModeEnabled = true;
  let detectEnabled = true;
  let detectTimerId = null;

  // Frame-to-frame blob tracking — a blob only gets circled/counted once
  // it's been seen moving in a direction across ticks, the way bats
  // crossing the sky do, not a static edge (tree texture, a wire
  // junction, a lens speck) that never moves.
  let trackedBlobs = [];
  let nextTrackId = 1;
  let autoTrackedApprox = 0;

  // Analysis buffers, (re)allocated once native video dimensions are known.
  let analysisW = 0, analysisH = 0;
  let analysisCanvas = null, analysisCtx = null;
  let grayBuf = null, magBuf = null, maskBuf = null, visitedBuf = null, stackX = null, stackY = null;
  let outlineImageData = null;

  // Outline mode's own edge cutoff — fixed, independent of the Edge
  // sensitivity slider (which only tunes what counts as a *blob* for
  // counting). Keeps the visual outline view stable while sensitivity is
  // being tuned for detection accuracy.
  const OUTLINE_DISPLAY_CUTOFF = 24;
  const OUTLINE_DISPLAY_GAIN = 1.4;

  function setStatus(msg) { statusEl.textContent = msg || ""; }
  function setCameraStatus(msg) {
    cameraStatus.textContent = msg || "";
    cameraStatus.classList.toggle("hide", !msg);
  }

  // ---- Session log (localStorage) ----

  function loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; }
  }

  function saveLog(entries) {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)));
  }

  function renderLog() {
    const entries = loadLog();
    logList.innerHTML = "";
    if (!entries.length) {
      const p = document.createElement("p");
      p.id = "logEmptyHint";
      p.textContent = "No sessions saved yet.";
      logList.appendChild(p);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "log-entry";
      const meta = document.createElement("span");
      meta.className = "log-entry-meta";
      const d = new Date(entry.date);
      const dateStr = isNaN(d) ? entry.date : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      const label = entry.sessionType === "sunrise" ? "Sunrise return" : "Sunset emergence";
      meta.textContent = `${dateStr} · ${label}`;
      const count = document.createElement("span");
      count.className = "log-entry-count";
      count.textContent = String(entry.tally);
      const del = document.createElement("button");
      del.className = "log-entry-delete";
      del.type = "button";
      del.setAttribute("aria-label", "Delete this session");
      del.textContent = "×";
      del.addEventListener("click", () => {
        saveLog(loadLog().filter((e) => e.id !== entry.id));
        renderLog();
      });
      row.appendChild(meta);
      row.appendChild(count);
      row.appendChild(del);
      logList.appendChild(row);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  exportLogBtn.addEventListener("click", () => {
    const entries = loadLog();
    if (!entries.length) return;
    const rows = ["date,session,tally,duration_minutes,auto_tracked_approx"];
    entries.forEach((e) => {
      rows.push([e.date, e.sessionType, e.tally, e.durationMinutes, e.autoTrackedApprox != null ? e.autoTrackedApprox : ""].join(","));
    });
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), `flying-fox-counts-${new Date().toISOString().slice(0, 10)}.csv`);
  });

  clearLogBtn.addEventListener("click", () => {
    if (!confirm("Clear all saved session counts? This can't be undone.")) return;
    saveLog([]);
    renderLog();
  });

  // ---- Camera ----

  async function refreshVideoDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      switchCameraBtn.classList.toggle("hide", videoDevices.length < 2);
      const activeId = videoTrack && videoTrack.getSettings ? videoTrack.getSettings().deviceId : null;
      currentDeviceIndex = activeId ? videoDevices.findIndex((d) => d.deviceId === activeId) : -1;
      if (currentDeviceIndex === -1) currentDeviceIndex = 0;
    } catch (e) {
      switchCameraBtn.classList.add("hide");
    }
  }

  function stopStream() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    videoTrack = null;
  }

  async function startStream(constraintsVideo) {
    stopStream();
    stream = await navigator.mediaDevices.getUserMedia({ video: constraintsVideo, audio: false });
    cameraFeed.srcObject = stream;
    await cameraFeed.play();
    videoTrack = stream.getVideoTracks()[0];
    await refreshVideoDevices();
  }

  async function switchCamera() {
    if (videoDevices.length < 2) return;
    switchCameraBtn.disabled = true;
    try {
      const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
      await startStream({ deviceId: { exact: videoDevices[nextIndex].deviceId } });
      currentDeviceIndex = nextIndex;
      setupAnalysisBuffers();
    } catch (e) {
      setCameraStatus("Couldn't switch camera: " + (e.message || e.name || "unknown error"));
    } finally {
      switchCameraBtn.disabled = false;
    }
  }
  switchCameraBtn.addEventListener("click", switchCamera);

  // ---- Analysis buffers ----

  function setupAnalysisBuffers() {
    const nativeW = cameraFeed.videoWidth, nativeH = cameraFeed.videoHeight;
    if (!nativeW || !nativeH) return;
    const scale = ANALYSIS_MAX_DIM / Math.max(nativeW, nativeH);
    analysisW = Math.max(1, Math.round(nativeW * scale));
    analysisH = Math.max(1, Math.round(nativeH * scale));
    analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = analysisW;
    analysisCanvas.height = analysisH;
    analysisCtx = analysisCanvas.getContext("2d", { willReadFrequently: true });
    outlineCanvas.width = analysisW;
    outlineCanvas.height = analysisH;
    // overlayCanvas mirrors analysisW/H as its own internal pixel buffer,
    // then uses the same object-fit:cover CSS as the video/outline
    // elements — so a point drawn at analysis-space (x,y) lands in the
    // exact same on-screen spot as that pixel in the video, with no
    // separate coordinate mapping.
    overlayCanvas.width = analysisW;
    overlayCanvas.height = analysisH;
    grayBuf = new Float32Array(analysisW * analysisH);
    magBuf = new Float32Array(analysisW * analysisH);
    maskBuf = new Uint8Array(analysisW * analysisH);
    visitedBuf = new Uint8Array(analysisW * analysisH);
    stackX = new Int32Array(analysisW * analysisH);
    stackY = new Int32Array(analysisW * analysisH);
    outlineImageData = outlineCtx.createImageData(analysisW, analysisH);
    trackedBlobs = []; // old positions are in the previous resolution's coordinate space — invalid now
  }

  // ---- Edge detection, outline render, and blob labelling ----

  // Sobel gradient magnitude at every pixel, into magBuf — shared by both
  // the outline-mode display and the blob-detection threshold below, so
  // it's computed once per tick regardless of which (or both) are on.
  function computeEdgeMagnitude() {
    const w = analysisW, h = analysisH;
    const imageData = analysisCtx.getImageData(0, 0, w, h);
    const src = imageData.data;
    for (let i = 0, p = 0; p < grayBuf.length; i += 4, p++) {
      grayBuf[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }
    magBuf.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = -grayBuf[i - w - 1] - 2 * grayBuf[i - 1] - grayBuf[i + w - 1]
                 +  grayBuf[i - w + 1] + 2 * grayBuf[i + 1] + grayBuf[i + w + 1];
        const gy = -grayBuf[i - w - 1] - 2 * grayBuf[i - w] - grayBuf[i - w + 1]
                 +  grayBuf[i + w - 1] + 2 * grayBuf[i + w] + grayBuf[i + w + 1];
        magBuf[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }
  }

  function thresholdMask(threshold) {
    for (let i = 0; i < maskBuf.length; i++) maskBuf[i] = magBuf[i] > threshold ? 1 : 0;
  }

  // The actual visible "bats standing out against the dark" view — bright
  // edge-lines on black, same effect as Outlines mode elsewhere in this
  // suite, built straight from the same magBuf the blob detector reads.
  function renderOutlineCanvas() {
    const data = outlineImageData.data;
    for (let p = 0, i = 0; p < magBuf.length; p++, i += 4) {
      let v = magBuf[p] - OUTLINE_DISPLAY_CUTOFF;
      v = v > 0 ? Math.min(255, v * OUTLINE_DISPLAY_GAIN) : 0;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
    outlineCtx.putImageData(outlineImageData, 0, 0);
  }

  // 4-connected flood fill, iterative (typed-array stack, not recursion).
  // Rejects blobs shaped like a wire (very elongated bounding box) — a
  // cheap first-pass filter, not a validated bat/non-bat classifier.
  function findBlobs(minArea, maxArea) {
    const w = analysisW, h = analysisH;
    visitedBuf.fill(0);
    const blobs = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!maskBuf[idx] || visitedBuf[idx]) continue;
        let sp = 0;
        stackX[sp] = x; stackY[sp] = y; sp++;
        visitedBuf[idx] = 1;
        let minX = x, maxX = x, minY = y, maxY = y, area = 0, sumX = 0, sumY = 0;
        while (sp > 0) {
          sp--;
          const cx = stackX[sp], cy = stackY[sp];
          area++; sumX += cx; sumY += cy;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          if (cx > 0) { const ni = cy * w + (cx - 1); if (maskBuf[ni] && !visitedBuf[ni]) { visitedBuf[ni] = 1; stackX[sp] = cx - 1; stackY[sp] = cy; sp++; } }
          if (cx < w - 1) { const ni = cy * w + (cx + 1); if (maskBuf[ni] && !visitedBuf[ni]) { visitedBuf[ni] = 1; stackX[sp] = cx + 1; stackY[sp] = cy; sp++; } }
          if (cy > 0) { const ni = (cy - 1) * w + cx; if (maskBuf[ni] && !visitedBuf[ni]) { visitedBuf[ni] = 1; stackX[sp] = cx; stackY[sp] = cy - 1; sp++; } }
          if (cy < h - 1) { const ni = (cy + 1) * w + cx; if (maskBuf[ni] && !visitedBuf[ni]) { visitedBuf[ni] = 1; stackX[sp] = cx; stackY[sp] = cy + 1; sp++; } }
        }
        if (area < minArea || area > maxArea) continue;
        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
        if (aspect > 6) continue; // long thin line — almost certainly a wire, not a blob
        blobs.push({ cx: sumX / area, cy: sumY / area, r: Math.max(bw, bh) / 2 + 2 });
      }
    }
    return blobs;
  }

  // Matches this tick's raw blob candidates against last tick's tracked
  // positions (nearest-centroid, within a distance tolerant of normal
  // flight speed between ticks) to build a velocity per blob, then keeps
  // only the ones that have actually moved — filtering out anything
  // sitting still between ticks, which a real bat crossing the sky never
  // does. Simple nearest-neighbour matching, not a validated tracker: it
  // can mismatch when blobs cross paths or cluster tightly.
  function updateTracks(candidates, minMovement) {
    const maxMatchDist = Math.max(analysisW, analysisH) * 0.18;
    const used = new Array(candidates.length).fill(false);

    trackedBlobs.forEach((t) => { t.matchedThisTick = false; });
    trackedBlobs.forEach((t) => {
      let bestIdx = -1, bestDist = maxMatchDist;
      candidates.forEach((c, idx) => {
        if (used[idx]) return;
        const d = Math.hypot(c.cx - t.cx, c.cy - t.cy);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      if (bestIdx !== -1) {
        const c = candidates[bestIdx];
        t.vx = c.cx - t.cx;
        t.vy = c.cy - t.cy;
        t.cx = c.cx; t.cy = c.cy; t.r = c.r;
        t.missedTicks = 0;
        t.matchedThisTick = true;
        used[bestIdx] = true;
      } else {
        t.missedTicks++;
      }
    });
    candidates.forEach((c, idx) => {
      if (used[idx]) return;
      trackedBlobs.push({ id: nextTrackId++, cx: c.cx, cy: c.cy, r: c.r, vx: 0, vy: 0, missedTicks: 0, matchedThisTick: true, everQualified: false });
    });
    // Lost blobs (left frame, occluded, or detection dropped out) get a
    // couple of ticks' grace before their track is dropped, so a brief
    // missed frame doesn't reset the velocity a real bat had built up.
    trackedBlobs = trackedBlobs.filter((t) => t.missedTicks <= 2);

    const moving = trackedBlobs.filter((t) => t.matchedThisTick && Math.hypot(t.vx, t.vy) >= minMovement);
    moving.forEach((t) => {
      if (!t.everQualified) { t.everQualified = true; autoTrackedApprox++; }
    });
    return moving;
  }

  function runDetection() {
    if (!analysisCtx || paused || cameraFeed.readyState < 2) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      return;
    }
    if (!outlineModeEnabled && !detectEnabled) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      return;
    }

    analysisCtx.drawImage(cameraFeed, 0, 0, analysisW, analysisH);
    computeEdgeMagnitude();

    if (outlineModeEnabled) renderOutlineCanvas();

    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (detectEnabled) {
      const sensitivity = Number(sensitivitySlider.value);
      const threshold = 300 - (sensitivity / 100) * 285; // 100%→~15 (loose), 0%→300 (strict)
      thresholdMask(threshold);
      const minArea = Number(minSizeSlider.value);
      const maxArea = Number(maxSizeSlider.value);
      const candidates = findBlobs(minArea, maxArea);
      const minMovement = Number(minMovementSlider.value);
      const moving = updateTracks(candidates, minMovement);

      overlayCtx.strokeStyle = "#7dd3fc";
      overlayCtx.lineWidth = 2;
      moving.forEach((t) => {
        overlayCtx.beginPath();
        overlayCtx.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
        overlayCtx.stroke();
        // A short trailing line showing the direction it's moving in —
        // the whole point being tracked at all, not just circled.
        overlayCtx.beginPath();
        overlayCtx.moveTo(t.cx - t.vx * 3, t.cy - t.vy * 3);
        overlayCtx.lineTo(t.cx, t.cy);
        overlayCtx.stroke();
      });
      detectedReadout.textContent = `Detected this frame: ${moving.length}`;
      trackedReadout.textContent = `Auto-tracked (approx): ${autoTrackedApprox}`;
    } else {
      detectedReadout.textContent = "Detected this frame: off";
    }
  }

  function startDetectionLoop() {
    stopDetectionLoop();
    detectTimerId = setInterval(runDetection, DETECT_INTERVAL_MS);
  }
  function stopDetectionLoop() {
    if (detectTimerId) clearInterval(detectTimerId);
    detectTimerId = null;
  }

  // ---- HUD wiring ----

  sensitivitySlider.addEventListener("input", () => { sensitivityLabel.textContent = sensitivitySlider.value + "%"; });
  minSizeSlider.addEventListener("input", () => { minSizeLabel.textContent = minSizeSlider.value + "px"; });
  maxSizeSlider.addEventListener("input", () => { maxSizeLabel.textContent = maxSizeSlider.value + "px"; });
  minMovementSlider.addEventListener("input", () => { minMovementLabel.textContent = minMovementSlider.value + "px"; });

  outlineModeBtn.addEventListener("click", () => {
    outlineModeEnabled = !outlineModeEnabled;
    outlineModeBtn.setAttribute("aria-pressed", String(outlineModeEnabled));
    outlineModeBtn.textContent = "Outline mode: " + (outlineModeEnabled ? "On" : "Off");
    outlineModeBtn.classList.toggle("active", outlineModeEnabled);
    outlineCanvas.classList.toggle("hide", !outlineModeEnabled);
  });

  detectToggleBtn.addEventListener("click", () => {
    detectEnabled = !detectEnabled;
    detectToggleBtn.setAttribute("aria-pressed", String(detectEnabled));
    detectToggleBtn.textContent = "Blob highlight: " + (detectEnabled ? "On" : "Off");
    detectToggleBtn.classList.toggle("active", detectEnabled);
    if (!detectEnabled) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      detectedReadout.textContent = "Detected this frame: off";
      // Tracks built up while highlighting was on go stale the moment
      // ticks stop updating them — start clean on re-enable rather than
      // matching fresh blobs against frozen old positions.
      trackedBlobs = [];
    }
  });

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    if (paused) cameraFeed.pause(); else cameraFeed.play().catch(() => {});
  });

  function setTally(n) {
    tally = Math.max(0, n);
    tallyCount.textContent = String(tally);
  }
  tallyPlusBtn.addEventListener("click", () => setTally(tally + 1));
  tallyMinusBtn.addEventListener("click", () => setTally(tally - 1));

  // ---- Session start/end ----

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    setStatus("Requesting camera…");
    try {
      await startStream({ facingMode: { ideal: "environment" } });
      setupAnalysisBuffers();
      sessionType = sessionTypeSelect.value;
      sessionStartedAt = Date.now();
      setTally(0);
      autoTrackedApprox = 0;
      tallyLabel.textContent = sessionType === "sunrise" ? "Sunrise return" : "Sunset emergence";
      overlay.classList.add("hide");
      tallyBlock.classList.remove("hide");
      hud.classList.remove("hide");
      detectedReadout.textContent = "Detected this frame: 0";
      trackedReadout.textContent = "Auto-tracked (approx): 0";
      startDetectionLoop();
      setStatus("");
    } catch (err) {
      setStatus("Couldn't start the camera: " + (err.message || err.name || "unknown error"));
    } finally {
      startBtn.disabled = false;
    }
  });

  endSessionBtn.addEventListener("click", () => {
    stopDetectionLoop();
    const durationMinutes = sessionStartedAt ? Math.round((Date.now() - sessionStartedAt) / 60000) : 0;
    const entries = loadLog();
    entries.unshift({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      date: new Date().toISOString(),
      sessionType,
      tally,
      durationMinutes,
      autoTrackedApprox
    });
    saveLog(entries);
    renderLog();
    stopStream();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (outlineCanvas.width) outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
    tallyBlock.classList.add("hide");
    hud.classList.add("hide");
    overlay.classList.remove("hide");
    setStatus(`Saved: ${tally} counted.`);
  });

  renderLog();
})();
