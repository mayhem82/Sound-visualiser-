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
- The frequency spectrum is split into three bands (bass / mid / treble);
  each band's average energy drives the orbit radius, speed, and glow
  intensity of its own particle swarm.
- Overall volume (RMS of the time-domain signal) drives a pulsing core at
  the center.
- Particles are drawn with additive ("lighter") blending and soft radial
  gradients for the glow, with a fading trail instead of a hard clear each
  frame.

The microphone stream is only analysed, never connected to audio output, so
there's no feedback loop.
