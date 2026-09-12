# Ideas

1. **Web Serial sensor bridge** — talk to an ESP32/Arduino over `navigator.serial` (same API dmx.js already uses for real DMX hardware), for reading external sensors.
2. **NFC rig and property tags** — tap an NFC tag (`NDEFReader`, Android Chrome only) to load a rig or property profile, same lookup-by-name pattern as the existing QR tags in dmx.js/restore.js.
3. **Accelerometer-based vibration analysis** — send a vibration pulse via `navigator.vibrate()`, measure the resistance/residual response via the accelerometer; move along a pipe to detect a crack from a change in the response.
4. **Heading-only compass feature** — real compass heading via `AbsoluteOrientationSensor`/`deviceorientation`. Not raw magnetic-field-anomaly detection — no web API exposes that.
5. **Simple vibration pattern feedback** (maybe) — hands-free haptic output via `navigator.vibrate()` where it helps.
