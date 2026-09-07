// Blue Light Filter's actual feature logic, pulled out of bluelight.js so
// the exact same code can run inside bluelight.html's own standalone page
// AND inside the Hub's shared camera session, without duplicating it.
// Real camera-sensor controls (colour temperature, exposure, ISO,
// saturation, and whatever else the device/browser actually expose --
// applied by the hardware itself, never a software recolour), tap-to-
// focus, and ambient-brightness/blue-light-share estimation sampled from
// the live feed.
//
// Deliberately takes the <video> element and one empty panel container as
// parameters instead of grabbing fixed element IDs off the page -- the
// panel builds its own child markup once, so nothing here depends on any
// particular host page's static HTML.
//
// createBlueLightFeature(video, panelEl) returns { start(), stop(),
// onTrackChanged(track) }:
//   - onTrackChanged(track) is called once with the first live track (and
//     again on every later device switch) to build/rebuild the sensor
//     panel against that track's own capabilities.
//   - start() is called once, right after the first onTrackChanged, to
//     begin ambient-light sampling and wire up tap-to-focus.
//   - stop() tears down the sampling timer and the tap-to-focus listener,
//     and clears the panel -- called when the feature is deactivated
//     (never, on the standalone page; on every mode switch, in the Hub).
function createBlueLightFeature(video, panelEl) {
  panelEl.innerHTML = `
    <div class="bluelight-sensor-controls"></div>
    <p class="bluelight-sensor-hint hint hide">This browser/camera doesn't expose any sensor-level controls (most don't) -- colour temperature, exposure, ISO, saturation, or anything else here. There's no fallback -- the view stays true rather than showing a fake software tint in their place.</p>
    <p class="bluelight-ambient-brightness hint hide" title="There's no usable Ambient Light Sensor API in any current browser (Chromium withdrew the one it shipped over fingerprinting concerns) -- this is the average brightness of what the camera is actually looking at right now, sampled from the live feed, not a dedicated light-sensor reading."></p>
    <p class="bluelight-ambient-red hint hide" title="The red channel's share of the sampled scene's total red+green+blue -- an exact reading of the sampled pixels, not an estimate."></p>
    <p class="bluelight-ambient-green hint hide" title="The green channel's share of the sampled scene's total red+green+blue -- an exact reading of the sampled pixels, not an estimate."></p>
    <p class="bluelight-ambient-blue hint hide" title="Not a real spectrometer reading, and not a single specific wavelength -- a camera's blue channel is one broad response spanning roughly 400-500nm. This is that whole channel's share of the visible scene (blue's share of red+green+blue), sampled from the live feed itself. A screen or overcast sky reads high; warm indoor bulb light reads low."></p>
    <p class="bluelight-ambient-bg-ratio hint hide" title="A rough proxy for shorter blue (nearer 450nm) vs longer blue-cyan (nearer 480nm) -- green channel sensitivity extends further into the longer range than blue's does, so a lower ratio leans shorter, a higher one leans longer. Not a substitute for an actual spectral measurement, just the closest an RGB sensor can offer toward that distinction."></p>
    <p class="bluelight-ambient-temp hint hide" title="An approximation (McCamy 1992, the same kind of formula white-balance algorithms use) from the sampled RGB values, not a spectrometer reading. Most reliable in the roughly 2856K-6504K daylight/tungsten range; less reliable for strongly tinted or narrowband light."></p>
  `;
  const sensorControls = panelEl.querySelector(".bluelight-sensor-controls");
  const sensorHint = panelEl.querySelector(".bluelight-sensor-hint");
  const ambientBrightnessLabel = panelEl.querySelector(".bluelight-ambient-brightness");
  const ambientRedLabel = panelEl.querySelector(".bluelight-ambient-red");
  const ambientGreenLabel = panelEl.querySelector(".bluelight-ambient-green");
  const ambientBlueLabel = panelEl.querySelector(".bluelight-ambient-blue");
  const ambientBlueGreenRatioLabel = panelEl.querySelector(".bluelight-ambient-bg-ratio");
  const ambientColorTempLabel = panelEl.querySelector(".bluelight-ambient-temp");

  const SENSOR_CONTROLS = [
    { key: "colorTemperature", label: "Sensor colour temp", unit: "K", mode: { key: "whiteBalanceMode", value: "manual" }, title: "The camera sensor's own white-balance colour temperature, in Kelvin. Lower is warmer (less blue at the source)." },
    { key: "exposureCompensation", label: "Exposure compensation", unit: " EV", mode: null, title: "Overall exposure at the sensor/ISP level. Lower reduces total light captured (blue included, along with everything else); higher increases it." },
    { key: "iso", label: "ISO", unit: "", mode: { key: "exposureMode", value: "manual" }, title: "Sensor sensitivity. Lower is less sensitive (needs more light, less noise); higher is more sensitive (works in dimmer light, more noise)." },
    { key: "exposureTime", label: "Shutter speed", unit: "", mode: { key: "exposureMode", value: "manual" }, title: "Sensor exposure time, in 100-microsecond units. Lower is a faster shutter (less light, less motion blur); higher is slower (more light, more blur)." },
    { key: "saturation", label: "Sensor saturation", unit: "", mode: null, title: "Colour intensity applied by the camera hardware itself, at capture. Lower reduces vividness across every colour, blue included; this is a genuine sensor/ISP setting, not a software desaturation." },
    { key: "brightness", label: "Sensor brightness", unit: "", mode: null, title: "Overall brightness applied by the camera hardware at capture." },
    { key: "contrast", label: "Sensor contrast", unit: "", mode: null, title: "Contrast applied by the camera hardware at capture." },
    { key: "sharpness", label: "Sensor sharpness", unit: "", mode: null, title: "Sharpening applied by the camera hardware at capture." },
    { key: "zoom", label: "Zoom", unit: "x", mode: null, title: "Camera zoom, applied by the camera hardware itself." },
    { key: "focusDistance", label: "Focus distance", unit: "", mode: { key: "focusMode", value: "manual" }, title: "Manual focus distance, in the units this camera reports it. Not blue-light related, but a real sensor/lens control -- included since a plain visual guess isn't the goal here, exposing whatever's genuinely there is." },
    { key: "pan", label: "Pan", unit: "°", mode: null, title: "Camera pan, on hardware that physically or digitally supports it." },
    { key: "tilt", label: "Tilt", unit: "°", mode: null, title: "Camera tilt, on hardware that physically or digitally supports it." }
  ];
  const SENSOR_MODE_CONTROLS = [
    { key: "whiteBalanceMode", label: "White balance mode", relatedKeys: ["colorTemperature"] },
    { key: "exposureMode", label: "Exposure mode", relatedKeys: ["iso", "exposureTime", "exposureCompensation"] },
    { key: "focusMode", label: "Focus mode", relatedKeys: ["focusDistance"] }
  ];
  const MODE_VALUE_LABELS = { continuous: "Auto (continuous)", manual: "Manual", "single-shot": "Single-shot", none: "Off" };

  let sensorTrack = null;
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
      wrap.title = "Which of this camera's own focus/exposure/white-balance modes is active. Dragging a related slider below switches this to Manual on its own -- use this to switch back to the camera's own automatic behaviour.";
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
      if (spec.mode) {
        const modeSelect = modeSelectsByKey[spec.mode.key];
        if (modeSelect) modeSelect.value = spec.mode.value;
      }
    } catch (err) {
      wrapEl.remove();
      if (!sensorControls.children.length) sensorHint.classList.remove("hide");
    }
  }

  function srgbToLinearLocal(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function estimateColorTempKelvin(x, y) {
    const n = (x - 0.3320) / (0.1858 - y);
    return Math.round(449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33);
  }

  const brightnessCanvas = document.createElement("canvas");
  brightnessCanvas.width = 16;
  brightnessCanvas.height = 16;
  const brightnessCtx = brightnessCanvas.getContext("2d", { willReadFrequently: true });

  function sampleAmbientLight() {
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
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
    if (rgbSum <= 0) return;

    const redPct = Math.round((rSum / rgbSum) * 100);
    const greenPct = Math.round((gSum / rgbSum) * 100);
    const bluePct = Math.round((bSum / rgbSum) * 100);
    ambientRedLabel.textContent = `Red channel share: ${redPct}%`;
    ambientGreenLabel.textContent = `Green channel share: ${greenPct}%`;
    ambientBlueLabel.textContent = `Blue channel share (whole ~400-500nm band, from the camera view): ${bluePct}%`;

    const blueGreenRatio = gSum > 0 ? bSum / gSum : 0;
    ambientBlueGreenRatioLabel.textContent = `Blue/green ratio (rough shorter-vs-longer-blue proxy): ${blueGreenRatio.toFixed(2)}`;

    const rLin = srgbToLinearLocal(rSum / n), gLin = srgbToLinearLocal(gSum / n), bLin = srgbToLinearLocal(bSum / n);
    const X = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
    const Y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
    const Z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;
    const xyzSum = X + Y + Z;
    if (xyzSum > 0) {
      const kelvin = estimateColorTempKelvin(X / xyzSum, Y / xyzSum);
      ambientColorTempLabel.textContent = `Estimated colour temperature: ${kelvin}K (approximation, not a spectrometer reading)`;
    }
  }

  const focusCrosshair = document.createElement("div");
  focusCrosshair.className = "bluelight-focus-crosshair";
  focusCrosshair.setAttribute("aria-hidden", "true");
  document.body.appendChild(focusCrosshair);

  let abortController = null;
  let brightnessTimer = null;

  function handleTapToFocus(e) {
    if (!sensorTrack) return;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    sensorTrack.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }] }] }).then(() => {
      focusCrosshair.style.left = `${e.clientX}px`;
      focusCrosshair.style.top = `${e.clientY}px`;
      focusCrosshair.classList.remove("show");
      void focusCrosshair.offsetWidth;
      focusCrosshair.classList.add("show");
    }).catch(() => { /* not supported on this device/browser -- no visual, no error */ });
  }

  // Called once, the first time the feature becomes active -- the caller
  // is expected to have already called onTrackChanged(track) at least once
  // (building the sensor panel against the live track), so this only ever
  // does the one-time setup: the tap-to-focus listener, unhiding the
  // ambient labels, and starting the sampling timer.
  function start() {
    abortController = new AbortController();
    video.addEventListener("pointerdown", handleTapToFocus, { signal: abortController.signal });
    ambientBrightnessLabel.classList.remove("hide");
    ambientRedLabel.classList.remove("hide");
    ambientGreenLabel.classList.remove("hide");
    ambientBlueLabel.classList.remove("hide");
    ambientBlueGreenRatioLabel.classList.remove("hide");
    ambientColorTempLabel.classList.remove("hide");
    clearInterval(brightnessTimer);
    brightnessTimer = setInterval(sampleAmbientLight, 500);
  }

  function stop() {
    if (abortController) { abortController.abort(); abortController = null; }
    clearInterval(brightnessTimer);
    brightnessTimer = null;
    focusCrosshair.remove();
    panelEl.innerHTML = "";
  }

  function onTrackChanged(track) {
    buildSensorControls(track);
  }

  return { start, stop, onTrackChanged };
}
