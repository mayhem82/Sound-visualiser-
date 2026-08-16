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
  const recordSessionCheckbox = document.getElementById("recordSessionCheckbox");
  const recordingUnsupportedHint = document.getElementById("recordingUnsupportedHint");
  const startBtn = document.getElementById("startBtn");
  const statusEl = document.getElementById("status");

  const reviewPanel = document.getElementById("reviewPanel");
  const reviewSummary = document.getElementById("reviewSummary");
  const reviewVideo = document.getElementById("reviewVideo");
  const reviewBookmarksHint = document.getElementById("reviewBookmarksHint");
  const reviewBookmarks = document.getElementById("reviewBookmarks");
  const downloadRecordingBtn = document.getElementById("downloadRecordingBtn");
  const closeReviewBtn = document.getElementById("closeReviewBtn");

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
  const autoCountBtn = document.getElementById("autoCountBtn");
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
  let autoCountEnabled = false;
  let detectTimerId = null;

  // Frame-to-frame blob tracking — a blob only gets circled/counted once
  // it's been seen moving in a direction across ticks, the way bats
  // crossing the sky do, not a static edge (tree texture, a wire
  // junction, a lens speck) that never moves.
  let trackedBlobs = [];
  let nextTrackId = 1;
  let autoTrackedApprox = 0;

  // Session recording — lets someone mount the camera, hit Start, and
  // walk away entirely rather than having to stand there watching (and
  // touching the phone) for the whole emergence/return window. Recorded
  // from a small dedicated canvas (not the full native camera resolution)
  // to keep an hour-long file a reasonable size; each auto-tracked
  // crossing is bookmarked by its timestamp so reviewing afterwards means
  // jumping straight to the moments that matter, not scrubbing blind.
  const RECORD_MAX_DIM = 480;
  const RECORD_FPS = 10;
  const RECORD_MIME_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const recordingSupported = typeof MediaRecorder !== "undefined" && RECORD_MIME_CANDIDATES.some((m) => MediaRecorder.isTypeSupported(m));
  const recordMimeType = recordingSupported ? RECORD_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) : null;
  let recordCanvas = null, recordCtx = null, recordDrawTimerId = null;
  let mediaRecorder = null, recordedChunks = [], recordingStartedAt = null;
  let eventBookmarks = [];
  let reviewBlobUrl = null;

  if (!recordingSupported) {
    recordSessionCheckbox.checked = false;
    recordSessionCheckbox.disabled = true;
    recordingUnsupportedHint.classList.remove("hide");
  }

  // Analysis buffers, (re)allocated once native video dimensions are known.
  let analysisW = 0, analysisH = 0;
  let analysisCanvas = null, analysisCtx = null;
  let grayBuf = null, prevGrayBuf = null, hasPrevFrame = false;
  let diffBuf = null, blurredDiffBuf = null, motionMaskBuf = null;
  let gxBuf = null, gyBuf = null, magBuf = null, thinMagBuf = null;
  let maskBuf = null, visitedBuf = null, stackX = null, stackY = null;
  let outlineImageData = null;

  // A per-pixel grayscale change (0-255 scale) has to clear this before
  // it counts as "this pixel just moved" rather than sensor noise/
  // compression artifacts — fixed for now rather than another slider.
  const DIFF_THRESHOLD = 12;

  // Outline mode's own edge cutoff — fixed, independent of the Edge
  // sensitivity slider (which only tunes what counts as a *blob* for
  // counting). Keeps the visual outline view stable while sensitivity is
  // being tuned for detection accuracy. Thinned edges carry far less raw
  // brightness than the old always-on gradient render, hence the bigger gain.
  const OUTLINE_DISPLAY_CUTOFF = 4;
  const OUTLINE_DISPLAY_GAIN = 4;

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

  // ---- Session recording ----

  function startRecording() {
    if (!recordingSupported) return;
    const nativeW = cameraFeed.videoWidth, nativeH = cameraFeed.videoHeight;
    if (!nativeW || !nativeH) return;
    const scale = Math.min(1, RECORD_MAX_DIM / Math.max(nativeW, nativeH));
    recordCanvas = document.createElement("canvas");
    recordCanvas.width = Math.max(1, Math.round(nativeW * scale));
    recordCanvas.height = Math.max(1, Math.round(nativeH * scale));
    recordCtx = recordCanvas.getContext("2d");
    recordDrawTimerId = setInterval(() => {
      if (cameraFeed.readyState >= 2) recordCtx.drawImage(cameraFeed, 0, 0, recordCanvas.width, recordCanvas.height);
    }, 1000 / RECORD_FPS);

    recordedChunks = [];
    eventBookmarks = [];
    const recordStream = recordCanvas.captureStream(RECORD_FPS);
    mediaRecorder = new MediaRecorder(recordStream, { mimeType: recordMimeType });
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.start(1000);
    recordingStartedAt = Date.now();
  }

  // Stops recording (if any) and resolves with a playable WebM Blob, or
  // null if nothing was recorded this session. Async because MediaRecorder
  // delivers its last chunk and fires "stop" asynchronously after stop().
  function stopRecording() {
    return new Promise((resolve) => {
      if (recordDrawTimerId) { clearInterval(recordDrawTimerId); recordDrawTimerId = null; }
      if (!mediaRecorder) { resolve(null); return; }
      const recorder = mediaRecorder;
      const durationMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0;
      mediaRecorder = null;
      recorder.addEventListener("stop", () => {
        if (!recordedChunks.length) { resolve(null); return; }
        const rawBlob = new Blob(recordedChunks, { type: recordMimeType });
        rawBlob.arrayBuffer().then((buf) => {
          // MediaRecorder never writes a WebM Duration element, so an
          // unpatched recording plays but can't be scrubbed or trimmed —
          // same fix Video Production uses for its Take recordings.
          const fixed = window.VP_CORE && window.VP_CORE.fixWebmDuration
            ? window.VP_CORE.fixWebmDuration(new Uint8Array(buf), durationMs)
            : null;
          resolve(new Blob([fixed || buf], { type: recordMimeType }));
        }).catch(() => resolve(rawBlob));
      });
      if (recorder.state !== "inactive") recorder.stop();
      else resolve(null);
    });
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  }

  function showReview(blob) {
    if (reviewBlobUrl) URL.revokeObjectURL(reviewBlobUrl);
    reviewBlobUrl = URL.createObjectURL(blob);
    reviewVideo.src = reviewBlobUrl;
    reviewSummary.textContent = `${tally} counted, ${autoTrackedApprox} auto-tracked crossing${autoTrackedApprox === 1 ? "" : "s"} bookmarked below.`;
    reviewBookmarks.innerHTML = "";
    reviewBookmarksHint.classList.toggle("hide", eventBookmarks.length === 0);
    eventBookmarks.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = formatClock(t);
      btn.addEventListener("click", () => {
        reviewVideo.currentTime = Math.max(0, t - 1);
        reviewVideo.play().catch(() => {});
      });
      reviewBookmarks.appendChild(btn);
    });
    reviewPanel.classList.remove("hide");
  }

  downloadRecordingBtn.addEventListener("click", () => {
    if (!reviewBlobUrl) return;
    const a = document.createElement("a");
    a.href = reviewBlobUrl;
    a.download = `flying-fox-count-${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  closeReviewBtn.addEventListener("click", () => {
    reviewPanel.classList.add("hide");
    reviewVideo.pause();
    reviewVideo.removeAttribute("src");
    reviewVideo.load();
    if (reviewBlobUrl) { URL.revokeObjectURL(reviewBlobUrl); reviewBlobUrl = null; }
    overlay.classList.remove("hide");
  });

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
    prevGrayBuf = new Float32Array(analysisW * analysisH);
    diffBuf = new Float32Array(analysisW * analysisH);
    blurredDiffBuf = new Float32Array(analysisW * analysisH);
    motionMaskBuf = new Uint8Array(analysisW * analysisH);
    gxBuf = new Float32Array(analysisW * analysisH);
    gyBuf = new Float32Array(analysisW * analysisH);
    magBuf = new Float32Array(analysisW * analysisH);
    thinMagBuf = new Float32Array(analysisW * analysisH);
    maskBuf = new Uint8Array(analysisW * analysisH);
    visitedBuf = new Uint8Array(analysisW * analysisH);
    stackX = new Int32Array(analysisW * analysisH);
    stackY = new Int32Array(analysisW * analysisH);
    outlineImageData = outlineCtx.createImageData(analysisW, analysisH);
    hasPrevFrame = false;
    trackedBlobs = []; // old positions are in the previous resolution's coordinate space — invalid now
  }

  // ---- Edge detection, outline render, and blob labelling ----

  // Four-step pipeline, run once per tick, shared by both the outline
  // display and the blob detector below:
  //  1. Subtract — frame-difference against the previous tick, so what's
  //     left is only pixels that actually changed.
  //  2. Blur & Thresh — smooth the diff to suppress single-pixel sensor
  //     noise, then binarize into a motion mask.
  //  3. Sobel Edge — gradient of the *current* frame's real detail,
  //     computed only where the motion mask says something changed —
  //     static clutter (wires, foliage, rooflines) never becomes an edge
  //     at all now, rather than being detected and filtered out later.
  //  4. Edge Thinning — non-maximum suppression along each gradient's own
  //     direction, collapsing a smeared band of edge-ish pixels down to
  //     the single-pixel-wide ridge line running through it.
  function computeEdges() {
    const w = analysisW, h = analysisH;
    const imageData = analysisCtx.getImageData(0, 0, w, h);
    const src = imageData.data;
    // Ping-pong the two grayscale buffers instead of copying — grayBuf
    // becomes this tick's frame, prevGrayBuf still holds last tick's.
    const tmp = prevGrayBuf; prevGrayBuf = grayBuf; grayBuf = tmp;
    for (let i = 0, p = 0; p < grayBuf.length; i += 4, p++) {
      grayBuf[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }

    // 1. Subtract
    if (hasPrevFrame) {
      for (let p = 0; p < diffBuf.length; p++) diffBuf[p] = Math.abs(grayBuf[p] - prevGrayBuf[p]);
    } else {
      diffBuf.fill(0); // nothing to compare the very first tick against
    }

    // 2. Blur & Thresh — a direct 3x3 box blur; the analysis buffer is
    // small enough (a few hundred px per side) that this is cheap.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) sum += diffBuf[i + dy * w + dx];
        }
        blurredDiffBuf[i] = sum / 9;
      }
    }
    for (let i = 0; i < motionMaskBuf.length; i++) motionMaskBuf[i] = blurredDiffBuf[i] > DIFF_THRESHOLD ? 1 : 0;

    // 3. Sobel Edge, gated to the motion mask
    gxBuf.fill(0); gyBuf.fill(0); magBuf.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!motionMaskBuf[i]) continue;
        const gx = -grayBuf[i - w - 1] - 2 * grayBuf[i - 1] - grayBuf[i + w - 1]
                 +  grayBuf[i - w + 1] + 2 * grayBuf[i + 1] + grayBuf[i + w + 1];
        const gy = -grayBuf[i - w - 1] - 2 * grayBuf[i - w] - grayBuf[i - w + 1]
                 +  grayBuf[i + w - 1] + 2 * grayBuf[i + w] + grayBuf[i + w + 1];
        gxBuf[i] = gx; gyBuf[i] = gy;
        magBuf[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // 4. Edge Thinning — classic Canny-style non-maximum suppression:
    // keep a pixel only if its magnitude is a local peak along its own
    // gradient direction, quantized to the nearest of 4 compass angles.
    thinMagBuf.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const m = magBuf[i];
        if (m <= 0) continue;
        const deg = ((Math.atan2(gyBuf[i], gxBuf[i]) * 180 / Math.PI) + 180) % 180;
        let n1, n2;
        if (deg < 22.5 || deg >= 157.5) { n1 = magBuf[i - 1]; n2 = magBuf[i + 1]; }
        else if (deg < 67.5) { n1 = magBuf[i - w + 1]; n2 = magBuf[i + w - 1]; }
        else if (deg < 112.5) { n1 = magBuf[i - w]; n2 = magBuf[i + w]; }
        else { n1 = magBuf[i - w - 1]; n2 = magBuf[i + w + 1]; }
        if (m >= n1 && m >= n2) thinMagBuf[i] = m;
      }
    }

    hasPrevFrame = true;
  }

  function thresholdMask(threshold) {
    for (let i = 0; i < maskBuf.length; i++) maskBuf[i] = thinMagBuf[i] > threshold ? 1 : 0;
  }

  // The actual visible "bats standing out against the dark" view — bright
  // crisp edge-lines of only what's currently moving, on black. Built
  // from the same thinMagBuf the blob detector reads.
  function renderOutlineCanvas() {
    const data = outlineImageData.data;
    for (let p = 0, i = 0; p < thinMagBuf.length; p++, i += 4) {
      let v = thinMagBuf[p] - OUTLINE_DISPLAY_CUTOFF;
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

  function median(values) {
    if (!values.length) return 0;
    const s = values.slice().sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // Matches this tick's raw blob candidates against last tick's tracked
  // positions (nearest-centroid, within a distance tolerant of normal
  // flight speed between ticks) to build a velocity per blob, then keeps
  // only the ones moving differently from everything else — filtering out
  // anything sitting still *relative to the rest of the frame*. Raw
  // on-screen displacement alone isn't enough: handheld footage shakes,
  // so on its own every static edge (wires, foliage, rooflines) appears
  // to "move" together each tick, right along with any real bat. Most
  // detected edges in any given frame are that static background, so
  // their shared apparent motion (the median velocity across all of
  // them) is treated as the camera's own shake/pan and subtracted out —
  // what's left is motion relative to the ground, which is what a bat
  // actually flying across the sky produces and camera shake doesn't.
  // Simple nearest-neighbour matching, not a validated tracker: it can
  // mismatch when blobs cross paths or cluster tightly.
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
      trackedBlobs.push({ id: nextTrackId++, cx: c.cx, cy: c.cy, r: c.r, vx: 0, vy: 0, relVx: 0, relVy: 0, missedTicks: 0, matchedThisTick: true, everQualified: false });
    });
    // Lost blobs (left frame, occluded, or detection dropped out) get a
    // couple of ticks' grace before their track is dropped, so a brief
    // missed frame doesn't reset the velocity a real bat had built up.
    trackedBlobs = trackedBlobs.filter((t) => t.missedTicks <= 2);

    const matched = trackedBlobs.filter((t) => t.matchedThisTick);
    const driftX = median(matched.map((t) => t.vx));
    const driftY = median(matched.map((t) => t.vy));

    const moving = [];
    matched.forEach((t) => {
      t.relVx = t.vx - driftX;
      t.relVy = t.vy - driftY;
      if (Math.hypot(t.relVx, t.relVy) >= minMovement) moving.push(t);
    });
    moving.forEach((t) => {
      if (!t.everQualified) {
        t.everQualified = true;
        autoTrackedApprox++;
        if (autoCountEnabled) setTally(tally + 1, true);
        if (mediaRecorder && recordingStartedAt) {
          eventBookmarks.push((Date.now() - recordingStartedAt) / 1000);
        }
      }
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
    computeEdges();

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
        // A short trailing line showing the direction it's moving in,
        // relative to the camera's own shake/pan — the whole point being
        // tracked at all, not just circled.
        overlayCtx.beginPath();
        overlayCtx.moveTo(t.cx - t.relVx * 3, t.cy - t.relVy * 3);
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
      // Auto count has nothing to add to without tracking running.
      if (autoCountEnabled) autoCountBtn.click();
    }
  });

  autoCountBtn.addEventListener("click", () => {
    if (!autoCountEnabled && !detectEnabled) return; // needs blob highlight/tracking on to have anything to add
    autoCountEnabled = !autoCountEnabled;
    autoCountBtn.setAttribute("aria-pressed", String(autoCountEnabled));
    autoCountBtn.textContent = "Auto count: " + (autoCountEnabled ? "On" : "Off");
    autoCountBtn.classList.toggle("active", autoCountEnabled);
  });

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    if (paused) {
      cameraFeed.pause();
      if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.pause();
    } else {
      cameraFeed.play().catch(() => {});
      if (mediaRecorder && mediaRecorder.state === "paused") mediaRecorder.resume();
    }
  });

  function setTally(n, pulse) {
    tally = Math.max(0, n);
    tallyCount.textContent = String(tally);
    if (pulse) {
      // Distinguishes an auto-added count from a manual tap at a glance —
      // useful when the point is to be watching the sky, not the screen.
      tallyCount.classList.remove("pulse");
      void tallyCount.offsetWidth; // restart the animation if it's already mid-pulse
      tallyCount.classList.add("pulse");
    }
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
      if (autoCountEnabled) autoCountBtn.click(); // each session starts manual-tally by default; re-enable once the camera's settled
      tallyLabel.textContent = sessionType === "sunrise" ? "Sunrise return" : "Sunset emergence";
      overlay.classList.add("hide");
      tallyBlock.classList.remove("hide");
      hud.classList.remove("hide");
      detectedReadout.textContent = "Detected this frame: 0";
      trackedReadout.textContent = "Auto-tracked (approx): 0";
      if (recordSessionCheckbox.checked) startRecording();
      startDetectionLoop();
      setStatus("");
    } catch (err) {
      setStatus("Couldn't start the camera: " + (err.message || err.name || "unknown error"));
    } finally {
      startBtn.disabled = false;
    }
  });

  endSessionBtn.addEventListener("click", async () => {
    endSessionBtn.disabled = true;
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
    const recordingBlob = await stopRecording();
    stopStream();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (outlineCanvas.width) outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
    tallyBlock.classList.add("hide");
    hud.classList.add("hide");
    endSessionBtn.disabled = false;
    if (recordingBlob) {
      showReview(recordingBlob);
      setStatus(`Saved: ${tally} counted.`);
    } else {
      overlay.classList.remove("hide");
      setStatus(`Saved: ${tally} counted.`);
    }
  });

  renderLog();
})();
