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
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  let currentStream = null;
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

  function buildSensorControls(track) {
    sensorTrack = track;
    sensorControls.innerHTML = "";
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const settings = track.getSettings ? track.getSettings() : {};
    let anySupported = false;
    const valueInputsByKey = {};

    SENSOR_MODE_CONTROLS.forEach((spec) => {
      const values = caps && caps[spec.key];
      if (!Array.isArray(values) || !values.length) return;
      anySupported = true;

      const wrap = document.createElement("label");
      wrap.className = "hud-slider";
      wrap.title = `Which of this camera's own focus/exposure/white-balance modes is active. Related sliders below only take effect while this is set to Manual.`;
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

      function syncRelatedDisabled(modeValue) {
        spec.relatedKeys.forEach((k) => {
          const input = valueInputsByKey[k];
          if (input) input.disabled = modeValue !== "manual";
        });
      }
      // Not called here yet -- the related range sliders haven't been
      // built at this point (mode selects are built first, in the loop
      // above this one). The re-sync pass after both loops complete
      // handles the correct initial disabled state instead.

      select.addEventListener("change", async () => {
        syncRelatedDisabled(select.value);
        try {
          await track.applyConstraints({ advanced: [{ [spec.key]: select.value }] });
        } catch (err) {
          // Reported as supported but rejected in practice -- remove this
          // one control rather than leave a dead dropdown.
          wrap.remove();
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
      valueInputsByKey[spec.key] = input;
      // Initial disabled state (for a value gated by a mode) is set in the
      // re-sync pass below, once every control -- mode selects and range
      // sliders alike -- has actually been built.

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

    // Range sliders are built AFTER mode selects in DOM order, but
    // syncRelatedDisabled() runs while building each mode select -- before
    // its related range input(s) exist yet in valueInputsByKey. Re-apply
    // now that every control (mode and range alike) has been built, so
    // initial disabled state is correct regardless of build order.
    SENSOR_MODE_CONTROLS.forEach((spec) => {
      const values = caps && caps[spec.key];
      if (!Array.isArray(values) || !values.length) return;
      const settingsValue = typeof settings[spec.key] === "string" ? settings[spec.key] : values[0];
      spec.relatedKeys.forEach((k) => {
        const input = valueInputsByKey[k];
        if (input) input.disabled = settingsValue !== "manual";
      });
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

  // ---- Estimated ambient brightness ----
  // There's no usable Ambient Light Sensor API left in any shipping
  // browser (Chromium shipped one, then withdrew it from stable over
  // fingerprinting concerns) -- so this isn't a real lux reading, and is
  // labelled as such. It IS a genuine measurement of something real,
  // though: the average luminance of what the camera is actually looking
  // at right now, sampled from the live feed itself, not faked.
  const brightnessCanvas = document.createElement("canvas");
  brightnessCanvas.width = 16;
  brightnessCanvas.height = 16;
  const brightnessCtx = brightnessCanvas.getContext("2d", { willReadFrequently: true });
  let brightnessTimer = null;

  function sampleAmbientBrightness() {
    if (!currentStream || video.readyState < video.HAVE_CURRENT_DATA) return;
    brightnessCtx.drawImage(video, 0, 0, 16, 16);
    const data = brightnessCtx.getImageData(0, 0, 16, 16).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const pct = Math.round((sum / (data.length / 4) / 255) * 100);
    ambientBrightnessLabel.textContent = `Estimated ambient brightness (from the camera view): ${pct}%`;
  }

  async function startCamera() {
    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      currentStream = stream;
      video.srcObject = stream;
      await video.play();
      setupTorch(stream.getVideoTracks()[0]);
      buildSensorControls(stream.getVideoTracks()[0]);
      overlay.classList.add("hide");
      hud.classList.remove("hide");
      requestWakeLock();
      ambientBrightnessLabel.classList.remove("hide");
      clearInterval(brightnessTimer);
      brightnessTimer = setInterval(sampleAmbientBrightness, 500);
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
