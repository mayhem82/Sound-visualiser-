# Quest passthrough correction — Phase 0

Goal: put colorvision.html's correction pipeline in front of your eyes across
your full field of view on Quest 3/3S, instead of a floating rectangle on
tethered AR glasses (XREAL/Viture/Rokid/RayNeo etc., which only mirror a
phone screen and don't cover your real vision).

This is a **separate project** from the web app — different engine (Unity),
different language (C#/HLSL vs. JS/GLSL), different hardware, and I can't
build, run, or test any of it myself in this environment: no Quest headset,
no Unity Editor, no Android/XR runtime here. Everything in this folder has to
be verified by you on real hardware.

## Phase 0: is this viable at all?

Quest's passthrough cameras are not eye-aligned — they sit where the outer
cameras physically are, not where your eyes are. Meta's own docs call this
out. Before building anything, we need to know whether that offset is
"slightly odd" or "unusable for calibrating a colour by holding something
close to your face," which is this app's core interaction. Everything past
this point is gated on that answer.

### Setup

1. Install [Git LFS](https://git-lfs.com/) (the sample repo needs it).
2. Clone Meta's own sample project — this is the real, maintained starting
   point, not something hand-rolled:
   ```
   git clone https://github.com/oculus-samples/Unity-PassthroughCameraApiSamples.git
   ```
3. Open it in Unity Hub. Use whatever Unity version that repo's own
   `README.md`/`ProjectSettings/ProjectVersion.txt` specifies — don't
   override it, Meta's XR SDK packages are pinned to a tested version.
4. Put your Quest 3 or 3S into Developer Mode (Meta Horizon app → Devices →
   Developer Mode) and connect it (USB or Meta Horizon Link v2.1+; the XR
   Simulator does **not** support the Passthrough Camera API, so you need
   the real headset for this test — no shortcut there).
5. Build and deploy the **`CameraViewer`** scene first. It's the simplest of
   the five sample scenes: a 2D canvas showing the raw camera feed, nothing
   processed. That's all Phase 0 needs.
6. Once that's running, also look at the **`ShaderSample`** scene. It applies
   a custom GPU effect to the camera texture — that's the exact pattern
   `ColorVisionCorrection.shader` (below) will plug into for Phase 1. You
   don't need to modify it yet, just see how it's wired (which script feeds
   the camera texture into which material).

### Parallax test — the actual go/no-go question

Do this wearing the headset, `CameraViewer` running:

1. Hold a solid-colour object (a phone showing a solid colour is fine) at
   arm's length. Note whether it lines up with where you feel your arm is.
2. Bring it in close, the way you'd hold something up to calibrate a colour
   in colorvision.html/colorassist.html — roughly 20-40cm from your face.
   This is the distance that matters most, since it's the actual use case.
   Note the offset, if any, between where the passthrough image shows the
   object and where your hand actually is.
3. Move it slowly toward your face and away. Note whether the offset grows,
   shrinks, or stays roughly constant.
4. Try both single-eye framing (close one eye) and normal two-eye viewing.

Write down what you find. Roughly:
- **Negligible / doesn't interfere with picking up and looking at an object
  closely** → proceed to Phase 1, wire in the shader below.
- **Noticeable but you can still calibrate against it (aim slightly off,
  adjust)** → still worth trying Phase 1, but expect the aim/reticle
  interaction to need redesigning (e.g. sample a fixed screen-centre region
  rather than a precise reticle point).
- **Bad enough that you can't reliably tell what you're pointing at up
  close** → this hardware approach doesn't work for the calibration
  interaction as designed, full stop — that's a real answer, not a failure,
  and worth knowing before Phase 1 effort goes in.

## What's staged here for Phase 1 (not wired in yet)

- `Assets/Shaders/ColorVisionCorrection.shader` — HLSL port of
  colorvision.html's fragment shader: Daltonize CVD simulation+correction,
  Lab-distance calibrated-point correction, cartoon/duotone, edge outlines.
  Deliberately leaves out the audio-reactive tint and the video-element
  UV-cover/rotate logic — those are phone-camera/DOM-video concerns that
  don't apply to a passthrough texture.
- `Assets/Scripts/CalibrationPoint.cs` — C# data model matching the exact
  JSON shape colorvision.html/colorassist.html already save to localStorage
  (`cvCalibrationPoints_v1`), so calibration work already done can be
  exported from the web app and imported here without a format conversion.

Neither file is referenced by a scene yet. Phase 1 is: drop
`ColorVisionCorrection.shader` into the `ShaderSample` scene's material
slot in place of its demo shader, wire `CalibrationPoint` data into the
`_SourceLab`/`_Correction`/`_Correction2` arrays via script, and see if it
renders sanely on-device.
