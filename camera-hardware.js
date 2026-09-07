// Shared camera-hardware controls -- Phase 2 of de-duplicating the suite's
// per-page camera/HUD scaffolding (see the Tier Infinity Audit's 7th
// finding, and the "one camera, selectable features" Hub project it's
// being scoped into).
//
// Torch (flashlight): createTorchController(torchBtn) was verified
// byte-identical (comments aside) across bluelight.js, colorassist.js,
// colour-alarm.js and restore.js -- and, critically, its three pieces of
// state (the active track, on/off, supported) were verified to be used
// ONLY inside that setup/toggle pair in all four of those files, so it's
// safe to fully encapsulate here. colorvision.js and sound-colour.js also
// have their own copies, but their torch state additionally drives a
// separate "beat-synced flashlight flicker" feature from several other
// places deep in each file -- extracting those two is real, and riskier,
// work, deliberately deferred to its own follow-up rather than folded in
// here.
//
// Zoom: only the pure capability-detection math (deriveZoomRange) is
// shared -- colorvision.js's zoom UI (zoomIn/zoomOut step buttons) and
// colour-alarm.js's (a continuous slider) are genuinely different
// interaction patterns, so only the DOM-free "does this camera really
// support zoom, and what range/step/initial value" logic moves here; each
// page keeps wiring its own UI to it, same as before.

function createTorchController(torchBtn) {
  let track = null;
  let supported = false;
  let on = false;

  function setup(newTrack) {
    track = newTrack;
    on = false;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    supported = !!(caps && caps.torch);
    torchBtn.classList.toggle("hide", !supported);
    torchBtn.classList.remove("active");
    torchBtn.setAttribute("aria-pressed", "false");
    torchBtn.textContent = "Flashlight";
    if (!supported) return;
    track.addEventListener("ended", () => {
      // Commonly fires when the screen locks or the tab loses focus, which
      // can end the camera connection outright -- the torch goes with it.
      supported = false;
      on = false;
      torchBtn.classList.add("hide");
    });
  }

  async function toggle() {
    if (!track || !supported) return;
    const next = !on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      on = next;
      torchBtn.classList.toggle("active", on);
      torchBtn.setAttribute("aria-pressed", String(on));
      torchBtn.textContent = on ? "Flashlight: On" : "Flashlight";
    } catch (err) {
      // Some devices report the capability but reject the constraint in
      // practice -- stop offering it rather than leave a dead button.
      supported = false;
      torchBtn.classList.add("hide");
    }
  }

  return { setup, toggle };
}

// caps/settings are a track's own getCapabilities()/getSettings() (or {}
// wherever the browser doesn't support either). Returns null wherever this
// camera/browser doesn't genuinely report zoom support at all.
function deriveZoomRange(caps, settings) {
  const range = caps && caps.zoom;
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.max <= range.min) return null;
  const min = range.min, max = range.max;
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : (max - min) / 10 || 0.1;
  const initial = Number.isFinite(settings && settings.zoom) ? settings.zoom : min;
  return { min, max, step, initial };
}
