# Ideas

1. **Web Serial sensor bridge** — talk to an ESP32/Arduino over `navigator.serial` (same API dmx.js already uses for real DMX hardware), for reading external sensors.
2. **NFC rig and property tags** — tap an NFC tag (`NDEFReader`, Android Chrome only) to load a rig or property profile, same lookup-by-name pattern as the existing QR tags in dmx.js/restore.js.
3. **Accelerometer-based vibration analysis** — send a vibration pulse via `navigator.vibrate()`, measure the resistance/residual response via the accelerometer; move along a pipe to detect a crack from a change in the response.
4. **Heading-only compass feature** — real compass heading via `AbsoluteOrientationSensor`/`deviceorientation`. Not raw magnetic-field-anomaly detection — no web API exposes that.
5. **Simple vibration pattern feedback** (maybe) — hands-free haptic output via `navigator.vibrate()` where it helps.

All five above are built. `NDEFReader` is Android Chrome only, reads/writes passive NDEF tags only — no phone-to-phone, no peer-to-peer (Android Beam was removed from the OS years ago and was never exposed to the web regardless).

## NFC-focused ideas

1. Colour Vision Extreme: NFC tag loads a saved calibration point by name, same pattern as DMX rig tags.
2. Colour Assist: a per-person keychain tag loads that person's own saved calibration points on any shared device.
3. Sound Colour: NFC tag loads a saved calibrated sound point by name.
4. Sound Colour: NFC tag stores a whole chime preset (source/output/instrument) to reconfigure it in one tap.
5. Colour Alarm: NFC tag stores a target/trigger colour (hex) to arm the alarm without recalibrating.
6. Video Production: NFC tag triggers a saved Template by name — the tap equivalent of the existing "Scan QR to trigger a Template."
7. Video Call: NFC tag encodes a room code/link to auto-fill and join.
8. Camera Hub: NFC tag jumps straight to a named feature, the tap equivalent of the existing QR jump.
9. Flying Fox Count: NFC tag at a monitoring site starts a pre-configured session (type + sensitivity) on arrival.
10. Blue Light Filter: NFC tag stores a location's sunrise/sunset override for reliable indoor use.
11. Tablet Viewer: NFC tag auto-connects to a specific broadcaster's room code.
12. DMX: a per-fixture (not per-rig) tag stores just that one fixture's patch, for swapping a single physical fixture.
13. DMX: a "scene" tag stores a static snapshot of manual values, not the live-reactive patch, like a lighting cue.
14. Property Colour Reference: a tag embedded at the property/room also carries the room name/date into the log, not just the colour profile.
15. Vibration Scan: a tag marks the sweep's start point, resetting/labelling the log per physical object scanned.
16. Sensor Bridge: a tag stores a device nickname + last-used baud rate for one-tap re-pairing with a known board.
17. A kiosk/installation tag links straight to the Privacy Policy, for an on-site camera-data disclosure requirement.
18. Tutorials: a tag on a printed card/poster jumps straight to the matching tutorial video.
19. An "identity" tag encodes a person's name; Colour Vision Extreme/Colour Assist/Sound Colour each look up their own saved data under that same name from one tap on a shared device.
20. A multi-record tag: one physical NTAG215/216 carries both a DMX rig tag and a Property Colour profile tag as separate NDEF records, so the same tag works for two different pages depending on which one scans it.
