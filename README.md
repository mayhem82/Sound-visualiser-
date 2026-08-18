# My Journey Into Sight and Sound

*A personal suite of camera and microphone tools — colour vision correction,
real-estate colour reference, and sound-reactive visuals.*

A small suite of dependency-free, single-page camera/microphone tools that
share a dark visual style and a lot of underlying plumbing:

- **`index.html`** — the suite's home page: the journey behind these tools
  and a card linking to each one. No camera/mic of its own.
- **`nebula.html`** ("Sound Nebula") — a mic-reactive particle visualiser,
  with an optional live camera background that can be colour-corrected.
- **`colorassist.html`** ("Colour Assist") — built for colourblind eyes:
  personal colour calibration, structural outlines, and camera/lighting
  controls, with everything else trimmed away. Work in progress — none of
  it is proven to actually help yet.
- **`colorvision.html`** ("Colour Vision Extreme") — the same correction
  engine taken further, as an experimental space for pushing what colour
  correction and photography can do — cartoon mode, diagnosed-CVD-type
  correction, photo/video capture, two-device tablet pairing, Templates.
  See its own section below for how it relates to Colour Assist.
- **`restore.html`** ("Property Colour Reference") — live camera colour
  correction for real-estate photography, built around a known-true
  reference colour (a paint chip or swatch) rather than a generic filter.
- **`viewer.html`** — a read-only viewer for any of the above pages' "Connect
  tablet" broadcasts.
- **`call.html`** — two-way peer-to-peer video calling, using the same
  room-code pairing as "Connect tablet" above.
- **`batcount.html`** ("Flying Fox Count") — a counting aid for flying fox
  (bat) colony emergence/return counts at sunset/sunrise: edge-outline
  highlighting of likely blobs, plus a manual tally. Work in progress, not
  a validated automated counter.
- **`tutorials.html`** — a placeholder grid for short how-to video clips.

No build step, no dependencies — open any `.html` file directly in a
browser, or serve the folder with any static server.

## Sound Nebula (`nebula.html`)

Click **Enable microphone & start**. Bass, mid, and treble frequencies each
drive their own swarm of glowing particles orbiting a pulsing core.

Once running, tap anywhere on the empty screen to hide/show the menu.
Double-tap to black out the screen — beat detection and all effects
(torch, vibrate, screen flash) keep running underneath; only the visuals
are hidden. Double-tap again to bring it back. Most of your settings
persist across reloads, and can also be saved/restored as named Templates
(see below).

### How the visualiser works

- `script.js` uses the Web Audio API (`AnalyserNode`) to read frequency and
  time-domain data from the microphone every animation frame.
- The frequency spectrum is split into three bands by real frequency (bass
  20-150Hz, mid 150Hz-2kHz, treble 2-9kHz) rather than a fixed fraction of
  FFT bins, so the bass band tracks kick/bass-drum energy specifically
  instead of also picking up guitar fundamentals and harmonics that sit
  well above 150Hz. Each band's average energy drives the orbit radius,
  speed, and glow intensity of its own particle swarm.
- Overall volume (RMS of the time-domain signal) drives a pulsing core at
  the center.
- Particles are drawn with additive ("lighter") blending and soft radial
  gradients for the glow, with a fading trail instead of a hard clear each
  frame — unless Outlines or Cartoon mode is on (see below), which redraw
  them as flat/stroked shapes instead.

The microphone stream is only analysed, never connected to audio output, so
there's no feedback loop.

### Mic mode: Voice / Music (Spotify)

By default the mic is requested with the browser's default constraints,
which turn on echo cancellation and noise suppression tuned for speech.
That's normally desirable, but on a phone it also treats music playing out
of the phone's own speaker (e.g. Spotify) as "echo" and suppresses it, so
the visualiser reacts to your voice but barely to the music.

The **Mic mode** button in the HUD toggles this: switching it to "Music
(Spotify)" re-requests the microphone with echo cancellation, noise
suppression, and auto gain control all turned off, so it also picks up
audio playing out loud. Toggling it while already running swaps the live
mic stream in place — no need to restart. The choice is remembered for next
time.

### Flash + vibrate on beat

The **Flash + vibrate on beat** button arms a simple bass-onset detector
(compares the current bass-band energy against its rolling average) and, on
each detected beat:

- pulses the device's camera flash (torch) via the `MediaStreamTrack`
  `torch` constraint on an environment-facing camera — the pulse length
  scales with how strong the beat was, from ~50ms for a hit that just
  clears the threshold up to ~160ms for a very strong one, and
- triggers a short vibration via `navigator.vibrate`.

If the camera fails to start with a transient-looking error (e.g. Chrome's
"Could not start video source" / `NotReadableError`, usually meaning
another app or tab is still holding the camera), it's retried once
automatically after a short delay before falling back.

Camera flash control is only exposed by some Android/Chrome-based browsers.
It is not available in iOS Safari or on desktops without a camera with a
torch — the app detects this and falls back to vibrate-only (or silently
does nothing on devices with neither capability), reporting the current
mode in the status line under the button.

The **Beat sensitivity** slider adjusts how easily a beat is detected: low
sensitivity requires a large, sharp bass spike; high sensitivity reacts to
smaller bumps in the bass energy.

The **Beat detection range** control is a pair of Hz sliders (default
20-150Hz) setting which frequency range feeds the beat detector. Narrow it
to isolate kick/bass-drum content, or widen it up to ~2kHz to also catch
bass guitar or low toms. The two sliders keep a 20Hz minimum gap between
them automatically. The **All Hz** button resets it to the sliders' full
extent (20-2000Hz) in one click, so detection reacts to the whole spectrum
rather than just bass. Since this is the same signal that drives the
"bass" particle swarm, changing the range reshapes that swarm's frequency
source too.

The **Sync delay** slider (0-500ms, default 0) delays torch/vibrate/screen
flash after a beat is detected. Useful for compensating for a slower
device's own hardware response lag (e.g. a torch that's slow to physically
respond), or for nudging timing to match another device. Doesn't affect
the particle visuals, which always react immediately.

The **Flash speed** slider adjusts how fast beats can retrigger the
flash/vibrate: low speed limits retriggering to about 2.5 times per second
(minimum ~400ms between beats), high speed allows close to a genuine strobe
at up to ~14 times per second (~70ms between beats). Note that real-world
speed can also be limited by how fast a given phone's camera hardware can
physically toggle the torch.

The **Dim flicker (experimental)** switch is the closest approximation to
"brightness" available: the web platform's `torch` constraint is on/off
only, there is no real intensity/brightness control exposed to browsers.
When switched on, each flash pulse is broken into a rapid on/off flicker
instead of staying solidly lit, to give a rough dimmer look. It's an
illusion, not real dimming, and how smooth it looks depends on how fast
the device's camera hardware can respond to on/off calls — on slower
phones it may look janky or stuttery rather than dim.

The **Invert torch (on, cuts on beat)** switch flips the polarity: instead
of the torch staying off and briefly flashing on for each beat, it stays on
continuously and briefly cuts off on each beat. Checking it arms the flash
system by itself (requesting the camera if needed) — you don't have to
also press the Flash button first. (It takes priority over Dim flicker,
which only applies to the normal on-beat pulse.)

Establishing that baseline on/off state is protected from beat-triggered
pulses firing concurrently with it (both are serialized through the same
lock), and retries once on failure — some devices reject a torch command
issued immediately after the camera starts, before its preview has
actually begun streaming frames.

If the flash stops responding mid-session (commonly caused by the screen
locking or the tab losing focus, which can end the camera connection), the
status line will say so — turn the flash toggle off and back on to
reconnect.

### Screen flash on beat

The **Screen flash on beat** switch flashes the whole page on each detected
beat instead of (or alongside) the camera torch. It needs no camera
permission at all, so it works on every device — including iPhone/Safari,
where the torch is never available.

On a **strong** beat, the flash is solid black instead of colour — an
intentional, punchier hit for the loudest moments. Weaker/normal beats
flash a live blend of the current bass/mid/treble mix (violet/cyan/pink,
matching the particle swarms), weighted by how much energy each band has
at that instant, so it visually tracks whatever's dominant in the sound
rather than being a flat colour. Shares the same sensitivity and speed
sliders as the torch/vibrate beat detector. The **Test flash** button fires
one flash manually, independent of beat detection, to check it works at
all.

### Camera background, Colour vision correction, and Nebula toggle

The **Camera background** button shows the live camera feed behind the
particles instead of a plain dark background ("party mode"). Once it's on
and more than one camera is available, a **Camera** dropdown appears to
pick which one feeds it.

The **Colour vision** button applies Colour Vision Extreme's correction (see
below) to that camera background — the same calibration system used by
`colorvision.html`, sharing the same saved colour points, CVD type, spread,
and blend controls. It turns the camera background on automatically if it
isn't already. **Colour vision flash mode** goes further: on each beat it
cycles to a different saved calibration point shown in isolation and tints
the screen flash to match — useful as a fast way to demo several
corrections in a row. It needs at least one saved point.

The **Nebula** button hides the swirling particles so the camera feed shows
through clearly underneath — handy while looking closely at the colour
correction itself.

### Outlines mode and Cartoon mode

**Outlines mode** redraws the particle swarms as hollow/stroked shapes
instead of solid glow blobs, and (when Colour vision is on) overlays
detected edges on the camera view. Three sliders control both at once:
outline thickness, outline blend (0% normal/filled, 100% fully outlined),
and outline opacity.

**Cartoon mode** flattens the particles and (when Colour vision is on) the
camera view into bold flat colour bands with dark ink lines, for a
hand-drawn look — a posterize effect plus Sobel-edge-detected outlines plus
a saturation boost. Four sliders: how many colour bands (levels), ink line
thickness, ink line strength/sensitivity, and saturation. Outlines mode and
Cartoon mode are mutually exclusive — turning one on turns the other off.

### Photo and video capture

The **Photo** button captures the current canvas (particles, and the camera
background if it's on) as a downloaded image. The **Record** button records
it as a video, at whichever framerate is picked in the **Recording FPS**
dropdown (15/24/30/60fps, locked once recording starts) — a recording
indicator with an elapsed-time counter appears while it's running.

When the HUD is hidden (tap the empty screen), a small floating capture bar
appears instead with Calibrate/Photo/Record buttons, so capture stays
available without the full menu on screen. Long-press and drag it to
reposition — its position is remembered per page. On supported
Android/Chrome browsers, the phone's hardware volume-down button also
works as a shutter (photo or video, whichever mode is currently selected);
volume-up switches between photo/video shutter mode, with a brief on-screen
confirmation.

### Calibrating colours and Templates

**Calibrate a colour** / **Saved colours** work the same way as on
`colorvision.html` (see below) — aim the camera at a real colour, tune the
correction until it's recognisable, and save it. Saved colours are kept
separately per page, not shared between Sound Nebula and
`colorvision.html`.

**Templates** (inside the Saved colours panel) save a complete named
snapshot of your setup — every slider and toggle on this page (sensitivity,
flash speed, dim flicker, torch invert, screen flash, beat detection range,
sync delay, nebula/blend, outlines mode and its sliders, cartoon mode and
its sliders, rotation, spread, CVD type/strength) plus your saved colour
points — so you can jump between full configurations instantly. Loading an
older template saved before a setting existed just leaves that setting as
it currently is.

### Two-device (tablet) pairing

The **Connect tablet** button opens a panel with two options, both using
the same WebRTC/room-code pairing (signaled over public MQTT relays, no
server of your own required):

- **Start live sharing** — broadcasts this device's composited view
  (particles + camera background) to a second device running
  `viewer.html`, read-only. If the camera background is also on, the raw
  camera feed goes out too, and `viewer.html` shows both side by side.
- **Receive camera from another device** — the other half of a two-device
  setup: this device becomes the *controller*, pulling in a raw camera feed
  from a second device that's in **Camera-only broadcast** mode (see
  below) and running this device's own full local camera-background/colour
  correction pipeline against it, exactly as if it had its own camera.

**Camera-only broadcast** is a HUD button that appears once the camera
background is on. Turning it on hides this device's own HUD in favour of a
small corner badge with the room code — meant for a phone that's mounted
somewhere just to point at a scene, with no controls of its own to fumble
with, while a second device (connected via "Receive camera from another
device" above) does all the actual calibration and control.

Both directions degrade gracefully if the public relays are unreachable
(e.g. no internet, or a restrictive network) — the status line explains
what went wrong rather than hanging silently.

## Colour Assist (`colorassist.html`)

Built for colourblind eyes. Colour Assist's control surface is deliberately
just six things:

- **Calibrate Colour** / **Saved Colours** — aim the camera at a real
  colour, tune hue, saturation, lightness, contrast, and exposure until it
  reads right, and save it.
- **Correction Spread** — how far a saved calibration's correction
  generalises to perceptually nearby colours, using Lab-space
  colour-distance weighting, not just an exact RGB match.
- **True ↔ Corrected** — blends between the raw and corrected view.
- **Outlines** — a Sobel edge-detection overlay, with thickness/blend/
  opacity sliders. It's calculated from the raw camera image, so
  structural edges stay visible regardless of whatever colour correction
  is currently applied — a second information channel for when colour
  differentiation alone isn't enough.
- **Light / Camera Controls** — flashlight, exposure lock, exposure
  compensation (EV), shutter, ISO, camera switching, and pause, exposed
  where the browser/hardware supports them. Automatic exposure and
  changing light can shift the apparent colour of whatever's being
  calibrated against, throwing the calibration off — locking exposure is
  more than just a photography nicety here, though it doesn't guarantee
  a good calibration.

Saved colours use their own storage, separate from `colorvision.html` —
calibrating one doesn't affect the other.

## Colour Vision Extreme (`colorvision.html`)

The same correction engine as Colour Assist, taken further: an
experimental space for pushing colour correction and photography
techniques beyond what Colour Assist exposes — cartoon mode,
diagnosed-CVD-type correction, capture, tablet pairing, Templates.
Anything that proves useful here can graduate into Colour Assist
individually later; the underlying WebGL shader is shared between the two
(Colour Assist just never turns its cartoon/CVD-type branches on), so any
correction-quality improvement made to one applies to both without being
ported by hand.

Click **Enable camera & start**, then either:

- **Calibrate a colour**: aim the camera at a real colour, tune hue,
  saturation, lightness, contrast, and exposure until it's recognisable,
  and save it. Corrections blend outward from each saved colour to nearby
  shades in the scene (the **Correction spread** slider controls how far),
  rather than only affecting the exact calibrated pixel.
- Apply a **Colour blindness type** correction (protanopia/deuteranopia/
  tritanopia), independent of any manually calibrated colours, with its own
  strength slider.

The **True ↔ Corrected** slider blends between the raw and corrected view.
**Outlines mode** and **Cartoon mode** work the same as described above for
Sound Nebula. **Templates** save/restore a full settings snapshot alongside
your saved colour points. Photo/Record (with FPS selection), the floating
capture bar, volume-button shutter, and two-device tablet pairing
(broadcast/camera-only/receive) all work the same way as described above.

## Property Colour Reference (`restore.html`)

Live camera colour correction for real-estate photography, built from a
known-true reference colour (a paint chip, swatch, or matched sample)
rather than a generic filter. Work in progress — how well it holds up
under different light hasn't been proven, so check results against the
real reference rather than trusting it blind. Click
**Enable camera & start**, then **Match a reference colour** the same way
`colorvision.html` calibrates a colour, or use **Quick presets** for
one-tap corrections with no reference needed (10 lighting-condition
presets plus 10 starter colour-set templates — these replace your
currently saved references).

Saved references can be scoped per-category (e.g. Wall vs. Other), and
**Mask** lets you paint over an area (like a ceiling) to protect it from
any correction regardless of how close its colour is to a reference.
Manual camera controls — flashlight, exposure lock, shutter, ISO, EV, and
switch camera — are exposed where the browser/hardware supports them.
Outlines mode, Cartoon mode, Photo/Record, the floating capture bar,
volume-button shutter, Templates, and two-device tablet pairing all work
the same way as described above.

## Viewer (`viewer.html`)

A read-only page for watching a "Connect tablet" broadcast from any of the
three pages above — open it on a second device and enter the room code (or
open the direct link shown on the broadcasting device). Shows a single view
normally, or the raw/original feed alongside the corrected one side by side
when the broadcaster is sending both.

## Video Call (`call.html`)

Peer-to-peer video calling between two devices — direct WebRTC, no account,
no call server. Reuses the same room-code pairing as "Connect tablet" above
(a short code, handshake signaled over public MQTT relays), but two-way:
both sides send camera and microphone, instead of one broadcasting to a
read-only viewer.

**Start a call** generates a room code and waits; **join with a room code**
(or open the shared link, which prefills and auto-joins) connects to it.
Once connected: **Mute** and **Camera off** toggle your own tracks without
dropping the call, **Hang up** ends it.

Like the rest of this suite's pairing, there's no TURN relay configured —
only a public STUN server, used to discover a direct path between the two
devices. That's enough for most home and mobile networks, but very
restrictive ones (some corporate firewalls, certain mobile carrier setups)
can still block the connection outright, since there's nothing here to
relay the actual call media if a direct path can't be found. Deliberately
the cheap option to try first, not a guarantee.

## Flying Fox Count (`batcount.html`)

A counting aid for flying fox (bat) colony counts at sunset (emergence) or
sunrise (return). Self-contained — it doesn't share the WebGL correction
engine the colour pages use, just a small 2D-canvas pipeline on a
downscaled copy of the camera frame, run a few times a second:

1. **Subtract** — frame-difference the current tick against the last one,
   so only pixels that actually changed survive.
2. **Blur & Thresh** — a 3x3 box blur suppresses single-pixel sensor
   noise, then it's binarized into a motion mask.
3. **Sobel Edge** — the gradient of the *current* frame's real detail,
   computed only where the motion mask says something changed. Static
   clutter (wires, foliage, rooflines) never becomes an edge at all,
   rather than being detected and filtered out afterward.
4. **Edge Thinning** — non-maximum suppression along each gradient's own
   direction collapses a smeared band of edge-ish pixels down to a single
   crisp line down its ridge.

**Outline mode** shows the result of that pipeline directly — bright
crisp lines on black, but now only of whatever's *currently moving*,
which is a much cleaner "spot the bat" view than outlining the whole
static scene. **Blob highlight** goes one step further on top of it: it
connects those thinned edge-pixels into blobs, matches each tick's blobs
against the previous tick's tracked positions to get a velocity, then
subtracts the median velocity across everything (treated as the camera's
own shake/pan, since most surviving motion in any frame is still the
whole scene shifting together under a handheld shake) — only blobs still
moving *relative to that* get circled. **Min movement** sets how much of
that relative motion counts as flight. **Edge sensitivity**, **Min blob
size**, and **Max blob size** adjust the detector for the lighting and
framing on hand; the max-size filter (and a bounding-box aspect-ratio
check in code) exists mainly to reject long straight wire segments and
whole-tree foliage clusters, on the rare occasion those are moving too
(wind).

**Strip top** / **Strip bottom** crop detection to a horizontal band of
the frame (as a % of frame height), instead of relying on the motion/size
filters alone to ignore whatever's outside where bats actually cross —
useful for cutting out a treeline, a neighbouring roofline, or the ground
outright. The excluded area is marked with a dashed line at each boundary
(visible even in Outline mode's black background) and dimmed where
there's a plain camera feed to dim. The two handles keep a minimum gap
from each other rather than letting the strip collapse to nothing.

**The tally is the count that matters.** Tap **+1** for each bat you see;
**&minus;** corrects a misclick. By default nothing is added automatically
— **Detected this frame** and **Auto-tracked (approx)** (a running count
of distinct tracked blobs, once each) are spotting aids only, not
validated against real footage. Once the camera is fixed in place (not
handheld) and the sliders look right, **Auto count** can be switched on to
add each newly tracked crossing to the tally itself — the number still
pulses on every automatic add so it stays easy to eyeball against what's
actually flying past, and manual +1/&minus; keeps working alongside it to
correct misses or false adds. Auto count turns itself off if Blob
highlight is turned off (nothing left for it to track), and starts off
again at the beginning of every new session.

**End session & save** logs the date, session type (sunset/sunrise), tally,
duration, and the auto-tracked figure to a local session history (shown on
the start panel, with **Export CSV** and **Clear log**) — nothing leaves
the device.

**Record this session** (checked by default, on browsers that support
`MediaRecorder`) is what makes Auto count actually practical for an
hour-long emergence: mount the camera, hit Start, and walk away entirely
instead of having to stand there watching and touching the phone the
whole time. It records from a small dedicated canvas (downscaled from the
native camera resolution, ~10fps) rather than the full-resolution feed, to
keep an hour-long file a reasonable size. Every auto-tracked crossing is
bookmarked by its timestamp; ending the session opens a review panel with
the recording and a row of tappable bookmark times to jump straight to
each one, plus a **Download recording** button — reusing the same
Duration-metadata fix (`fixWebmDuration`, via `video-production.js`'s
`VP_CORE` export) as Video Production's Take recordings, since
`MediaRecorder` never writes that itself and an unpatched file can't be
scrubbed or trimmed. Recording is entirely local; nothing is uploaded.

## Video Tutorials (`tutorials.html`)

A placeholder grid of short how-to clips (getting started, fine-tuning a
colour, colour blindness type & spread, outlines mode, two-device setup,
managing saved colours) — currently all "Coming soon" until walkthrough
footage is cut into clips and dropped in.
