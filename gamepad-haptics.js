(() => {
  "use strict";

  // Shared Gamepad precision-haptics helper. navigator.vibrate() is a
  // crude on/off duration with no amplitude control at all -- real
  // amplitude control only exists via a connected gamepad's own dual-
  // rumble motors (GamepadHapticActuator.playEffect), which most wired or
  // Bluetooth controllers expose. Callers just ask for a pulse with a
  // strength (0-1) and duration; this transparently prefers the gamepad
  // path when one's connected and falls back to navigator.vibrate()
  // (strength ignored, since vibrate() has no amplitude control) when it
  // isn't -- so every existing vibrate() call site gets real amplitude
  // control for free the moment someone plugs in a controller, with no
  // behaviour change otherwise.

  function findHapticGamepad() {
    if (typeof navigator.getGamepads !== "function") return null;
    let pads;
    try { pads = navigator.getGamepads(); } catch (e) { return null; }
    for (const pad of pads) {
      if (pad && pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") return pad;
    }
    return null;
  }

  // Returns which path actually ran ("gamepad", "vibrate", or "none"), so
  // a caller that cares (like Vibration Scan, where the excitation's
  // calibration is the whole point) can report it.
  function pulse(strength, durationMs) {
    const s = Math.max(0, Math.min(1, strength));
    const pad = findHapticGamepad();
    if (pad) {
      try {
        pad.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: s,
          strongMagnitude: s,
        });
        return "gamepad";
      } catch (e) { /* fall through to vibrate() below */ }
    }
    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate(durationMs); return "vibrate"; } catch (e) { /* ignore */ }
    }
    return "none";
  }

  window.HapticHelper = { pulse, hasGamepad: () => !!findHapticGamepad() };
})();
