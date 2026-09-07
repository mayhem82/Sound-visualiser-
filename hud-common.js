// Shared HUD auto-hide guard -- Phase 1 of de-duplicating the suite's
// per-page camera/HUD scaffolding (see the Tier Infinity Audit's 7th
// finding). isHudTapTarget(el) was hand-copied into colorassist.js,
// colorvision.js, restore.js and sound-colour.js with the same shape every
// time: a tap inside any of a page's own HUD/overlay/panel elements should
// never count as "tap the bare camera view", which is what triggers the
// auto-hide-HUD gesture. Each page's own list of panel IDs differs (its own
// panels), which is exactly why this bit twice: a new panel added to one
// page's own list was easy to forget, and forgetting it made every tap
// inside that panel also toggle the whole HUD hidden as a side effect (this
// happened for real with sound-colour.js's Tune sound/Saved sounds panels
// earlier this session).
//
// makeIsHudTapTarget(extraSelectors) returns a page's own isHudTapTarget,
// built from the selector list every page shares plus that page's own
// extras -- so adding a new panel to one page only ever means adding one
// selector to that one page's own call, not touching a duplicated function
// body.

function makeIsHudTapTarget(extraSelectors) {
  const BASE_HUD_SELECTORS = "#hud, #overlay, #cameraStatus, #reticleLayer, #tunePanel, #pointsPanel, #choosePanel, #floatingCaptureBar";
  const full = extraSelectors ? BASE_HUD_SELECTORS + ", " + extraSelectors : BASE_HUD_SELECTORS;
  return function isHudTapTarget(el) {
    return !!(el && el.closest && el.closest(full));
  };
}
