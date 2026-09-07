// Shared camera-stream primitives -- Phase 3 of de-duplicating the suite's
// per-page camera/HUD scaffolding (see the Tier Infinity Audit's 7th
// finding, and the "one camera, selectable features" Hub project it's
// being scoped into).
//
// This phase turned out smaller than originally scoped once each
// "duplicate-looking" function was actually diffed line by line (the same
// lesson Phases 1-2 already ran into with isHudTapTarget and torch/zoom):
// attachStream and the device-enumeration prefix of refreshVideoDevices
// really are identical everywhere, so those two move here. switchToDevice/
// switchCamera do NOT move here -- diffing all six copies (bluelight.js,
// colorassist.js, colorvision.js, colour-alarm.js, restore.js,
// sound-colour.js) turned up three genuine, behavior-changing splits:
//   - addressed by a specific deviceId (bluelight, colorvision,
//     colour-alarm, sound-colour) vs. cycling to the next index
//     (colorassist, restore) -- a different function signature, not a
//     cosmetic difference;
//   - a facingMode:"environment" fallback attempt if the specific device
//     fails (colorvision, sound-colour, colorassist, restore) vs. no
//     fallback, just an error (bluelight, colour-alarm);
//   - a <select> dropdown UI (bluelight, colorvision, colour-alarm,
//     sound-colour) vs. a single cycle button with no dropdown at all
//     (colorassist, restore), with colorvision/sound-colour actually
//     running both simultaneously.
// Forcing these into one shared function now -- the single most-used,
// most camera-critical piece of code in the whole suite -- risked being
// exactly the kind of "assumed uniformity that wasn't there" mistake this
// project has been careful to avoid at every phase so far. It's left as
// its own, more careful follow-up.

// The two lines every attachStream/attachCameraStream copy in the suite
// shares verbatim: hand the stream to the <video> element and wait for it
// to actually start playing. Each page still owns its own `currentStream`
// assignment and its own post-attach hooks (torch, zoom, exposure,
// stream-recovery, GL setup, ...) -- only this hardware-facing idiom moves.
async function attachVideoElement(video, stream) {
  video.srcObject = stream;
  await video.play();
}

// The verified-common prefix of every refreshVideoDevices copy: list the
// camera devices this browser can see, and resolve which one (if any) the
// current stream's video track is actually using. Each page still owns how
// it presents that list (a <select> dropdown, an index-cycle button, or
// both) and what it does on failure -- only the enumeration + active-device
// lookup moves here.
async function listVideoInputsWithActive(currentStream) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const track = currentStream && currentStream.getVideoTracks()[0];
  const activeId = track && track.getSettings ? track.getSettings().deviceId : null;
  return { videoDevices, activeId };
}
