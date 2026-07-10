# Sound Visualiser — Nebula

A single-page, dependency-free live microphone visualiser. Instead of the
usual bar spectrum or waveform, bass, mid, and treble frequencies each drive
their own swarm of glowing particles orbiting a pulsing core.

## Run it

Open `index.html` in a browser (or serve the folder with any static server)
and click **Enable microphone & start**. No build step, no dependencies.

## How it works

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
  frame.

The microphone stream is only analysed, never connected to audio output, so
there's no feedback loop.

## Flash + vibrate on beat

The **Flash + vibrate on beat** button arms a simple bass-onset detector
(compares the current bass-band energy against its rolling average) and, on
each detected beat:

- pulses the device's camera flash (torch) via the `MediaStreamTrack`
  `torch` constraint on an environment-facing camera — the pulse length
  scales with how strong the beat was, from ~50ms for a hit that just
  clears the threshold up to ~160ms for a very strong one, and
- triggers a short vibration via `navigator.vibrate`.

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
them automatically. Since this is the same signal that drives the "bass"
particle swarm, changing the range reshapes that swarm's frequency source
too.

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

If the flash stops responding mid-session (commonly caused by the screen
locking or the tab losing focus, which can end the camera connection), the
status line will say so — turn the flash toggle off and back on to
reconnect.

## Screen flash on beat

The **Screen flash on beat** switch flashes the whole page on each detected
beat instead of (or alongside) the camera torch. It needs no camera
permission at all, so it works on every device — including iPhone/Safari,
where the torch is never available.

The flash colour is a live blend of the current bass/mid/treble mix
(violet/cyan/pink, matching the particle swarms), weighted by how much
energy each band has at that instant, so it visually tracks whatever's
dominant in the sound rather than being a flat colour. Stronger beats trend
brighter and closer to white; quieter ones stay more tinted toward whichever
band triggered them. Shares the same sensitivity and speed sliders as the
torch/vibrate beat detector.
