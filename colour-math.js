// Shared colour-science primitives — Phase 0 of de-duplicating the suite's
// per-page camera/HUD scaffolding (see the Tier Infinity Audit's 7th
// finding). These three were verified byte-identical (module differences
// aside) across every page that had its own copy: colorassist.js,
// colorvision.js, colour-alarm.js, dmx.js (rgb2hsl only), restore.js,
// sound-colour.js, video-production.js. Deliberately NOT wrapped in an
// IIFE — every page's own script already runs as `(() => { ... })()` and
// calls these unqualified, so they need to land as plain globals for every
// existing call site to keep working with zero changes.
//
// Load this before any page script that calls srgbToLinear/rgb2lab/rgb2hsl.

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// CIE Lab, via sRGB -> linear -> XYZ (D65) -> Lab. r/g/b are 0..1.
function rgb2lab(r, g, b) {
  const rl = srgbToLinear(r);
  const gl_ = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const X = rl * 0.4124564 + gl_ * 0.3575761 + bl * 0.1804375;
  const Y = rl * 0.2126729 + gl_ * 0.7151522 + bl * 0.0721750;
  const Z = rl * 0.0193339 + gl_ * 0.1191920 + bl * 0.9503041;
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : t / (3 * 0.20705 * 0.20705) + 4 / 29);
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// r/g/b are 0..1; returns [h in 0..360, s in 0..1, l in 0..1].
function rgb2hsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
