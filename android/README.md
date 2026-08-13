# Visual Performance Studio — Android package

A Trusted Web Activity (TWA) wrapper around `video-production.html`. Chrome does
the actual rendering (WebGL, camera, everything already built) — this is a
thin native shell that launches it full-screen with no browser UI, verified
via [Digital Asset Links](https://developer.android.com/training/app-links/verify-android-applinks)
so Chrome trusts it enough to hide the address bar entirely.

## Before your first real Play Store upload

1. **Package name** (`applicationId` in `app/build.gradle`) is `com.mayhem82.vpstudio`
   right now — a placeholder. It's permanent once published, so change it now
   if you want something else (e.g. once you have a real domain/company name).
2. **Launch URL** (`app/src/main/res/values/strings.xml`) points at the current
   GitHub Pages URL. Fully valid to keep as-is — Digital Asset Links only needs
   you to control `/.well-known/assetlinks.json` at that origin, which you do —
   but update `launch_url`/`host_name`/`path_prefix` together if you move to a
   custom domain later.
3. **The signing fingerprint in `/.well-known/assetlinks.json` will need to change
   after your first Play Store upload.** The fingerprint in there right now is
   from the local keystore generated alongside this project (see below) — good
   enough for sideloading a debug/test build on your own phone to confirm the
   TWA verifies correctly. Play Console's **App Signing** (mandatory for new
   apps) generates its *own* signing certificate separate from the upload key
   you sign with locally — after your first upload, go to **Play Console → your
   app → Setup → App signing**, copy the SHA-256 there, and update
   `.well-known/assetlinks.json` (safe to list both fingerprints in the array
   during the transition).

## The signing keystore

Generated locally and sent to you directly — **it is not in this repository**
(`.gitignore` excludes `*.jks`/`credentials.txt` on purpose: a leaked signing
key lets anyone impersonate you as this app's publisher). Keep the `.jks` file
and its passwords somewhere durable (password manager, encrypted backup) —
losing it means losing the ability to sign updates as the same upload identity.

## Building

This project can't be compiled inside the sandbox this was scaffolded in — its
network policy blocks `dl.google.com`, which hosts both the Android Gradle
Plugin and the `androidbrowserhelper` library this depends on. Two ways to
actually build it:

- **Locally**: open the `android/` folder in Android Studio (it'll fetch the
  Android SDK + Gradle dependencies itself), or run `./gradlew assembleDebug`
  / `./gradlew bundleRelease` from a machine with the Android SDK and normal
  internet access.
- **GitHub Actions**: `.github/workflows/build-android.yml` builds a debug APK
  on every push under `android/**` and uploads it as a downloadable workflow
  artifact — GitHub's runners aren't behind the same network restriction, so
  this is the fastest way to get an actual installable APK without setting up
  Android Studio yourself. A release (signed, Play-ready) build needs the
  keystore + passwords added as repository secrets first — ask before doing
  that, since it means the signing key touches CI at all.

## What's still manual

- Creating the Google Play Developer account ($25 one-time, needs your own
  Google identity + payment method — only you can do this).
- Buying/pointing a custom domain, if you want one instead of the github.io URL.
- The actual Play Console listing: screenshots, store description (drafted
  separately), content rating questionnaire, and enabling **Play App Signing**
  on first upload.
