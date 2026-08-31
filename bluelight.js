(() => {
  "use strict";

  const ROTATE_KEY = "blueLightRotate180_v1";

  function loadBoolPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    } catch (e) {
      return fallback;
    }
  }
  function saveBoolPref(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch (e) { /* ignore */ }
  }

  const video = document.getElementById("cameraFeed");
  const cameraSelectWrap = document.getElementById("cameraSelectWrap");
  const cameraSelect = document.getElementById("cameraSelect");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const status = document.getElementById("status");
  const hud = document.getElementById("hud");
  const pauseBtn = document.getElementById("pauseBtn");
  const rotateBtn = document.getElementById("rotateBtn");
  const torchBtn = document.getElementById("torchBtn");
  const sensorControls = document.getElementById("sensorControls");
  const sensorHint = document.getElementById("sensorHint");
  const ambientBrightnessLabel = document.getElementById("ambientBrightnessLabel");
  const ambientRedLabel = document.getElementById("ambientRedLabel");
  const ambientGreenLabel = document.getElementById("ambientGreenLabel");
  const ambientBlueLabel = document.getElementById("ambientBlueLabel");
  const ambientBlueGreenRatioLabel = document.getElementById("ambientBlueGreenRatioLabel");
  const ambientColorTempLabel = document.getElementById("ambientColorTempLabel");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  let currentStream = null;
  let videoDevices = [];
  let switchingCamera = false;
  let paused = false;
  let rotate180 = loadBoolPref(ROTATE_KEY, false);
  let torchTrack = null;
  let torchSupported = false;
  let torchOn = false;

  function setStatus(msg) {
    status.textContent = msg;
  }

  function setupTorch(track) {
    torchTrack = track;
    torchOn = false;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    torchSupported = !!(caps && caps.torch);
    torchBtn.classList.toggle("hide", !torchSupported);
    torchBtn.classList.remove("active");
    torchBtn.setAttribute("aria-pressed", "false");
    torchBtn.textContent = "Flashlight";
    if (!torchSupported) return;
    track.addEventListener("ended", () => {
      torchSupported = false;
      torchOn = false;
      torchBtn.classList.add("hide");
    });
  }

  async function toggleTorch() {
    if (!torchTrack || !torchSupported) return;
    const next = !torchOn;
    try {
      await torchTrack.applyConstraints({ advanced: [{ torch: next }] });
      torchOn = next;
      torchBtn.classList.toggle("active", torchOn);
      torchBtn.setAttribute("aria-pressed", String(torchOn));
      torchBtn.textContent = torchOn ? "Flashlight: On" : "Flashlight";
    } catch (err) {
      torchSupported = false;
      torchBtn.classList.add("hide");
    }
  }

  // ---- Sensor controls ----
  // The ONLY adjustment this page offers: real MediaTrackConstraints
  // applied by the camera hardware/ISP itself before a frame is ever
  // captured -- a genuine change in what the sensor takes in, never a
  // software recolour of the picture afterward. The view stays true at all
  // times; there's no visual-filter fallback for a control a device/
  // browser doesn't expose (most expose few, if any, of these) -- each one
  // is feature-detected individually via the track's own capabilities and
  // only appears when genuinely present, with a shared hint explaining the
  // lack of a fallback when NONE of them are.
  //
  // Some properties only take effect alongside their own mode switched to
  // "manual" (colorTemperature needs whiteBalanceMode, exposureTime/iso
  // need exposureMode) -- the mode is set in the same applyConstraints
  // call as the value, every time, since a device isn't guaranteed to
  // remember it from an earlier call.
  const SENSOR_CONTROLS = [
    {
      key: "colorTemperature", label: "Sensor colour temp", unit: "K",
      mode: { key: "whiteBalanceMode", value: "manual" },
      title: "The camera sensor's own white-balance colour temperature, in Kelvin. Lower is warmer (less blue at the source)."
    },
    {
      key: "exposureCompensation", label: "Exposure compensation", unit: " EV",
      mode: null,
      title: "Overall exposure at the sensor/ISP level. Lower reduces total light captured (blue included, along with everything else); higher increases it."
    },
    {
      key: "iso", label: "ISO", unit: "",
      mode: { key: "exposureMode", value: "manual" },
      title: "Sensor sensitivity. Lower is less sensitive (needs more light, less noise); higher is more sensitive (works in dimmer light, more noise)."
    },
    {
      key: "exposureTime", label: "Shutter speed", unit: "",
      mode: { key: "exposureMode", value: "manual" },
      title: "Sensor exposure time, in 100-microsecond units. Lower is a faster shutter (less light, less motion blur); higher is slower (more light, more blur)."
    },
    {
      key: "saturation", label: "Sensor saturation", unit: "",
      mode: null,
      title: "Colour intensity applied by the camera hardware itself, at capture. Lower reduces vividness across every colour, blue included; this is a genuine sensor/ISP setting, not a software desaturation."
    },
    {
      key: "brightness", label: "Sensor brightness", unit: "",
      mode: null,
      title: "Overall brightness applied by the camera hardware at capture."
    },
    {
      key: "contrast", label: "Sensor contrast", unit: "",
      mode: null,
      title: "Contrast applied by the camera hardware at capture."
    },
    {
      key: "sharpness", label: "Sensor sharpness", unit: "",
      mode: null,
      title: "Sharpening applied by the camera hardware at capture."
    },
    {
      key: "zoom", label: "Zoom", unit: "x",
      mode: null,
      title: "Camera zoom, applied by the camera hardware itself."
    },
    {
      key: "focusDistance", label: "Focus distance", unit: "",
      mode: { key: "focusMode", value: "manual" },
      title: "Manual focus distance, in the units this camera reports it. Not blue-light related, but a real sensor/lens control -- included since a plain visual guess isn't the goal here, exposing whatever's genuinely there is."
    },
    {
      key: "pan", label: "Pan", unit: "°",
      mode: null,
      title: "Camera pan, on hardware that physically or digitally supports it."
    },
    {
      key: "tilt", label: "Tilt", unit: "°",
      mode: null,
      title: "Camera tilt, on hardware that physically or digitally supports it."
    }
  ];

  // The three properties above that force their own mode to "manual" as a
  // side effect of being dragged (colorTemperature/iso+exposureTime/
  // focusDistance) have no way, until now, to see what mode is actually
  // active or switch back to the camera's own auto behaviour. These are
  // real, spec-defined enum properties (getCapabilities() reports them as
  // an array of supported strings, not a {min,max} range, which is why the
  // range-building loop below never picked them up on its own).
  const SENSOR_MODE_CONTROLS = [
    { key: "whiteBalanceMode", label: "White balance mode", relatedKeys: ["colorTemperature"] },
    { key: "exposureMode", label: "Exposure mode", relatedKeys: ["iso", "exposureTime", "exposureCompensation"] },
    { key: "focusMode", label: "Focus mode", relatedKeys: ["focusDistance"] }
  ];
  const MODE_VALUE_LABELS = {
    continuous: "Auto (continuous)", manual: "Manual", "single-shot": "Single-shot", none: "Off"
  };

  let sensorTrack = null;
  // Maps a mode key (e.g. "whiteBalanceMode") to its live <select> element,
  // so applySensorConstraint() can reflect a slider-triggered mode switch
  // back onto the dropdown -- see the mode-select loop below and the sync
  // in applySensorConstraint().
  let modeSelectsByKey = {};

  function buildSensorControls(track) {
    sensorTrack = track;
    sensorControls.innerHTML = "";
    modeSelectsByKey = {};
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const settings = track.getSettings ? track.getSettings() : {};
    let anySupported = false;

    SENSOR_MODE_CONTROLS.forEach((spec) => {
      const values = caps && caps[spec.key];
      if (!Array.isArray(values) || !values.length) return;
      anySupported = true;

      const wrap = document.createElement("label");
      wrap.className = "hud-slider";
      wrap.title = `Which of this camera's own focus/exposure/white-balance modes is active. Dragging a related slider below switches this to Manual on its own -- use this to switch back to the camera's own automatic behaviour.`;
      const labelSpan = document.createElement("span");
      labelSpan.textContent = spec.label;
      const select = document.createElement("select");
      values.forEach((v) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = MODE_VALUE_LABELS[v] || v;
        select.appendChild(option);
      });
      const initial = typeof settings[spec.key] === "string" ? settings[spec.key] : values[0];
      select.value = initial;
      modeSelectsByKey[spec.key] = select;

      select.addEventListener("change", async () => {
        try {
          await track.applyConstraints({ advanced: [{ [spec.key]: select.value }] });
        } catch (err) {
          // Reported as supported but rejected in practice -- remove this
          // one control rather than leave a dead dropdown.
          wrap.remove();
          delete modeSelectsByKey[spec.key];
          if (!sensorControls.children.length) sensorHint.classList.remove("hide");
        }
      });

      wrap.appendChild(labelSpan);
      wrap.appendChild(select);
      sensorControls.appendChild(wrap);
    });

    SENSOR_CONTROLS.forEach((spec) => {
      const range = caps && caps[spec.key];
      if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return;
      anySupported = true;

      const wrap = document.createElement("label");
      wrap.className = "hud-slider";
      wrap.title = spec.title;
      const labelSpan = document.createElement("span");
      const initial = Number.isFinite(settings[spec.key]) ? settings[spec.key] : (range.min + range.max) / 2;
      labelSpan.textContent = `${spec.label}: ${formatSensorValue(initial)}${spec.unit}`;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(range.min);
      input.max = String(range.max);
      input.step = String(range.step || (spec.key === "exposureTime" || spec.key === "iso" ? 1 : (range.max - range.min) / 100 || 1));
      input.value = String(initial);

      let debounceTimer = null;
      input.addEventListener("input", () => {
        const value = parseFloat(input.value);
        labelSpan.textContent = `${spec.label}: ${formatSensorValue(value)}${spec.unit}`;
        clearTimeout(debounceTimer);
        // applyConstraints is a real (sometimes slow) device call -- debounce
        // so dragging doesn't fire dozens of overlapping requests.
        debounceTimer = setTimeout(() => applySensorConstraint(spec, value, wrap), 120);
      });

      wrap.appendChild(labelSpan);
      wrap.appendChild(input);
      sensorControls.appendChild(wrap);
    });

    sensorHint.classList.toggle("hide", anySupported);
  }

  function formatSensorValue(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }

  async function applySensorConstraint(spec, value, wrapEl) {
    if (!sensorTrack) return;
    const advanced = spec.mode ? { [spec.mode.key]: spec.mode.value, [spec.key]: value } : { [spec.key]: value };
    try {
      await sensorTrack.applyConstraints({ advanced: [advanced] });
      // Dragging a mode-gated slider (e.g. colour temp) switches its mode
      // to Manual as a side effect, in the same call above -- reflect that
      // back onto the mode dropdown so the two controls don't visually
      // disagree (the dropdown would otherwise still show "Auto").
      if (spec.mode) {
        const modeSelect = modeSelectsByKey[spec.mode.key];
        if (modeSelect) modeSelect.value = spec.mode.value;
      }
    } catch (err) {
      // Some devices report the capability but reject the constraint in
      // practice -- remove just this control rather than leave a dead one.
      wrapEl.remove();
      if (!sensorControls.children.length) sensorHint.classList.remove("hide");
    }
  }

  // ---- Tap to focus/expose ----
  // pointsOfInterest is real (part of the same Image Capture spec as
  // everything else in this file), but getCapabilities() doesn't reliably
  // report a specific shape for it the way it does for a range or an enum
  // -- so, consistent with the "attempt and remove/ignore on rejection"
  // approach used everywhere else here, this doesn't gate on a capability
  // check up front. It just tries, on every tap on the video itself, and
  // shows the crosshair only once the device has actually accepted it --
  // silent (not a fake "it worked" flash) wherever it doesn't.
  const focusCrosshair = document.getElementById("focusCrosshair");
  video.addEventListener("pointerdown", async (e) => {
    if (!sensorTrack) return;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    try {
      await sensorTrack.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }] }] });
      focusCrosshair.style.left = `${e.clientX}px`;
      focusCrosshair.style.top = `${e.clientY}px`;
      focusCrosshair.classList.remove("show");
      // Force reflow so re-adding the class restarts the fade animation on
      // a second tap, rather than the browser coalescing it as a no-op.
      void focusCrosshair.offsetWidth;
      focusCrosshair.classList.add("show");
    } catch (err) {
      // Not supported on this device/browser -- no visual, no error.
    }
  });

  // ---- Screen Wake Lock ----
  // The whole point of this page is extended low-light viewing -- exactly
  // the situation where a phone's own screen timeout is most likely to
  // kick in and undo it. Real API (Wake Lock), feature-detected the same
  // way as everything else here; the browser releases the lock whenever
  // the tab is backgrounded regardless, so it's re-requested on
  // visibilitychange rather than assumed to persist.
  let wakeLock = null;
  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { /* not fatal -- the screen just times out normally */ }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentStream && !wakeLock) requestWakeLock();
  });

  // ---- Estimated ambient brightness & blue light share ----
  // There's no usable Ambient Light Sensor API left in any shipping
  // browser (Chromium shipped one, then withdrew it from stable over
  // fingerprinting concerns), and no real spectrometer either -- so
  // neither of these is a lux or nanometre reading, and both are labelled
  // as such. They ARE genuine measurements of something real, though:
  // sampled directly from the live camera feed itself, not faked.
  // Brightness is the average luminance of what the camera sees;
  // blue-light share is how much of that light is blue relative to the
  // whole visible scene (blue channel's share of R+G+B) -- a screen or an
  // overcast sky reads high, warm indoor bulb light reads low.
  const brightnessCanvas = document.createElement("canvas");
  brightnessCanvas.width = 16;
  brightnessCanvas.height = 16;
  const brightnessCtx = brightnessCanvas.getContext("2d", { willReadFrequently: true });
  let brightnessTimer = null;

  // A plain RGB camera sensor cannot resolve individual wavelengths -- its
  // "blue" channel is one broad response curve spanning roughly 400-500nm,
  // not a narrowband reading at any single nanometre figure (450nm, 480nm,
  // or otherwise). What follows is every quantity that genuinely CAN be
  // computed from that broadband RGB data, each labelled for exactly what
  // it is -- channel shares are exact given the sampled pixels; the colour
  // temperature is a standard, real approximation formula (McCamy 1992,
  // the same kind of estimate white-balance algorithms use), not a
  // fabricated reading, but still an approximation that assumes a
  // blackbody-like light source and is displayed as such.
  function srgbToLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  // McCamy's approximation (1992): converts CIE 1931 xy chromaticity to a
  // correlated colour temperature in Kelvin. Accurate mainly in the
  // 2856K-6504K daylight/tungsten range this suite otherwise deals in;
  // well outside that range (strongly tinted or narrowband light) it
  // becomes unreliable, same as any CCT estimate from a handful of RGB
  // samples rather than a real spectrometer.
  function estimateColorTempKelvin(x, y) {
    const n = (x - 0.3320) / (0.1858 - y);
    return Math.round(449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33);
  }

  function sampleAmbientLight() {
    if (!currentStream || video.readyState < video.HAVE_CURRENT_DATA) return;
    brightnessCtx.drawImage(video, 0, 0, 16, 16);
    const data = brightnessCtx.getImageData(0, 0, 16, 16).data;
    const n = data.length / 4;
    let lumSum = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      rSum += r; gSum += g; bSum += b;
    }
    const brightnessPct = Math.round((lumSum / n / 255) * 100);
    ambientBrightnessLabel.textContent = `Estimated ambient brightness (from the camera view): ${brightnessPct}%`;

    const rgbSum = rSum + gSum + bSum;
    // rgbSum is 0 only when the sampled frame is pure black -- nothing
    // meaningful to report a share/ratio/temperature of in that case, so
    // leave the previous readings up rather than show misleading numbers.
    if (rgbSum <= 0) return;

    const redPct = Math.round((rSum / rgbSum) * 100);
    const greenPct = Math.round((gSum / rgbSum) * 100);
    const bluePct = Math.round((bSum / rgbSum) * 100);
    ambientRedLabel.textContent = `Red channel share: ${redPct}%`;
    ambientGreenLabel.textContent = `Green channel share: ${greenPct}%`;
    ambientBlueLabel.textContent = `Blue channel share (whole ~400-500nm band, from the camera view): ${bluePct}%`;

    // Blue-to-green ratio: a rough, real proxy for "shorter blue, nearer
    // the ~450nm end" vs "longer blue-cyan, nearer the ~480nm end" -- the
    // green channel's own sensitivity extends further into that longer
    // range than blue's does, so a lower ratio leans toward the shorter
    // end and a higher one toward the longer end. Not a substitute for an
    // actual spectral measurement, just the closest thing an RGB sensor
    // can offer toward that distinction.
    const blueGreenRatio = gSum > 0 ? bSum / gSum : 0;
    ambientBlueGreenRatioLabel.textContent = `Blue/green ratio (rough shorter-vs-longer-blue proxy): ${blueGreenRatio.toFixed(2)}`;

    const rLin = srgbToLinear(rSum / n), gLin = srgbToLinear(gSum / n), bLin = srgbToLinear(bSum / n);
    const X = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
    const Y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
    const Z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;
    const xyzSum = X + Y + Z;
    if (xyzSum > 0) {
      const kelvin = estimateColorTempKelvin(X / xyzSum, Y / xyzSum);
      ambientColorTempLabel.textContent = `Estimated colour temperature: ${kelvin}K (approximation, not a spectrometer reading)`;
    }
  }

  // ---- Camera device selection ----
  // getUserMedia's facingMode ("environment"/"user") is a phone concept --
  // it means nothing to a USB webcam or an HDMI/SDI-to-USB capture card
  // feeding a real camera into a desktop, which the OS (and so the
  // browser) just sees as one more plain video input device, no different
  // from a phone's own lens. This lists every one of them by name and
  // lets a specific one be picked directly, the same enumerate/switch
  // pattern already used for phone lens-switching in colorvision.js,
  // generalized here to any camera hardware at all.
  async function attachStream(stream) {
    currentStream = stream;
    video.srcObject = stream;
    await video.play();
    setupTorch(stream.getVideoTracks()[0]);
    buildSensorControls(stream.getVideoTracks()[0]);
  }

  function stopCurrentStream() {
    if (!currentStream) return;
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  async function refreshVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter((d) => d.kind === "videoinput");
      cameraSelectWrap.classList.toggle("hide", videoDevices.length <= 1);
      const track = currentStream && currentStream.getVideoTracks()[0];
      const activeId = track && track.getSettings ? track.getSettings().deviceId : null;
      cameraSelect.innerHTML = "";
      videoDevices.forEach((d, i) => {
        const option = document.createElement("option");
        option.value = d.deviceId;
        option.textContent = d.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(option);
      });
      if (activeId) cameraSelect.value = activeId;
    } catch (err) {
      cameraSelectWrap.classList.add("hide");
    }
  }

  async function switchToDevice(deviceId) {
    if (switchingCamera) return;
    switchingCamera = true;
    // Release the current camera before requesting the next one -- some
    // camera drivers/capture cards refuse or silently fail a second
    // concurrent open, same reasoning as the existing lens-switch code in
    // colorvision.js.
    stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      await attachStream(stream);
      setStatus("");
      await refreshVideoDevices();
    } catch (err) {
      setStatus("Couldn't switch camera: " + (err.message || err.name || "unknown error"));
    } finally {
      switchingCamera = false;
    }
  }

  cameraSelect.addEventListener("change", () => switchToDevice(cameraSelect.value));

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      await attachStream(stream);
      overlay.classList.add("hide");
      hud.classList.remove("hide");
      requestWakeLock();
      ambientBrightnessLabel.classList.remove("hide");
      ambientRedLabel.classList.remove("hide");
      ambientGreenLabel.classList.remove("hide");
      ambientBlueLabel.classList.remove("hide");
      ambientBlueGreenRatioLabel.classList.remove("hide");
      ambientColorTempLabel.classList.remove("hide");
      clearInterval(brightnessTimer);
      brightnessTimer = setInterval(sampleAmbientLight, 500);
      await refreshVideoDevices();
    } catch (err) {
      setStatus("Camera access failed: " + (err.message || err.name || "unknown error"));
    }
  }

  startBtn.addEventListener("click", startCamera);

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    if (paused) video.pause(); else video.play().catch(() => {});
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.classList.toggle("active", paused);
    pauseBtn.setAttribute("aria-pressed", String(paused));
  });

  rotateBtn.addEventListener("click", () => {
    rotate180 = !rotate180;
    video.classList.toggle("rotate180", rotate180);
    rotateBtn.classList.toggle("active", rotate180);
    rotateBtn.setAttribute("aria-pressed", String(rotate180));
    saveBoolPref(ROTATE_KEY, rotate180);
  });
  video.classList.toggle("rotate180", rotate180);
  rotateBtn.classList.toggle("active", rotate180);
  rotateBtn.setAttribute("aria-pressed", String(rotate180));

  torchBtn.addEventListener("click", toggleTorch);

  // ---- Fullscreen ----
  // A single button, pinned outside both #hud and the normal flow, so it
  // never disappears regardless of HUD state -- one large, unmissable,
  // fixed target to get in and back out, with no tiny gap to hunt for and
  // no dead end that needs a page reload to escape.
  let fullscreenActive = false;

  async function enterFullscreen() {
    try {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) await req.call(document.documentElement);
    } catch (e) { /* fullscreen not available/permitted -- still hide the HUD below */ }
    fullscreenActive = true;
    hud.classList.add("hide");
    fullscreenBtn.classList.add("active");
    fullscreenBtn.setAttribute("aria-pressed", "true");
  }

  function exitFullscreenMode() {
    fullscreenActive = false;
    hud.classList.remove("hide");
    fullscreenBtn.classList.remove("active");
    fullscreenBtn.setAttribute("aria-pressed", "false");
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      exit.call(document).catch ? exit.call(document).catch(() => {}) : exit.call(document);
    }
  }

  fullscreenBtn.addEventListener("click", () => {
    if (fullscreenActive) exitFullscreenMode(); else enterFullscreen();
  });

  ["fullscreenchange", "webkitfullscreenchange"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (fullscreenActive && !document.fullscreenElement && !document.webkitFullscreenElement) exitFullscreenMode();
    });
  });
})();
