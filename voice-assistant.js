(() => {
  "use strict";

  // Shared Voice Assistant -- one real implementation, self-mounting
  // (injects its own floating button/status, no HTML or CSS changes
  // needed on including pages), the same lightweight "just add a script
  // tag" integration as wake-lock.js/camera-lifecycle.js. Included on
  // every real feature page in the suite so voice navigation between
  // features, and voice control of each page's own Start/Stop/Photo/
  // Record/Pause/Mute buttons (wherever those already exist under their
  // established shared id="..." convention), works the same way
  // everywhere without duplicating this per page.
  //
  // HONESTY, up front: this uses the browser's own built-in
  // SpeechRecognition API -- the same one sound-colour.js's instrument
  // voice control already uses. In most browsers (notably Chrome and
  // Chromium-based browsers, including on Android and Quest) that is NOT
  // on-device: your voice is streamed to the browser vendor's own cloud
  // speech service to be transcribed, unlike every camera-based model
  // elsewhere in this suite, which runs entirely locally. Safari's
  // on-device recognition is a real exception, not the rule -- which
  // browser you're on decides this, not this page. It only ever listens
  // while you've explicitly turned it on, never automatically, and
  // turning it off stops recognition immediately.
  //
  // Command matching is fuzzy keyword matching (same idea as
  // sound-colour.js's instrument matcher), not real language
  // understanding: a command's phrase matches if every one of its words
  // appears somewhere in what you said, not necessarily adjacent or in
  // that order, and the longest (most specific) matching phrase across
  // every registered command wins ties.

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = typeof SpeechRecognitionCtor === "function";

  // ---- Word matching (shared by nav commands and page-registered ones) ----

  function toWords(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  }

  // A command matches if ALL the words of at least one of its phrases
  // appear (any order, anywhere) in what was heard -- stricter than
  // "any one shared word wins," which misfires easily on short generic
  // words. The match strength is that phrase's word count, so a longer/
  // more specific phrase beats a shorter one that also happens to match.
  function scoreCommand(words, phrases) {
    let best = 0;
    for (const phrase of phrases) {
      const pw = toWords(phrase);
      if (pw.length > 0 && pw.every((w) => words.includes(w))) best = Math.max(best, pw.length);
    }
    return best;
  }

  function bestMatch(words, entries) {
    let best = null, bestScore = 0;
    for (const entry of entries) {
      const score = scoreCommand(words, entry.phrases);
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return best;
  }

  // ---- Global navigation -- every real feature page, spoken names
  // chosen to match how someone would actually say the feature, not
  // just its filename. Works from any page, including the pages this
  // list points at (saying "colour vision" while already there just
  // reloads it, which is harmless).
  const NAV_TARGETS = [
    { file: "index.html", label: "Home", phrases: ["home", "main menu", "all features"] },
    { file: "hub.html", label: "Hub", phrases: ["hub", "feature hub"] },
    { file: "colorvision.html", label: "Colour Vision Extreme", phrases: ["colour vision", "color vision", "vision extreme"] },
    { file: "colorassist.html", label: "Colour Assist", phrases: ["colour assist", "color assist"] },
    { file: "selective-effects.html", label: "Selective Effects", phrases: ["selective effects"] },
    { file: "colour-alarm.html", label: "Colour Alarm", phrases: ["colour alarm", "color alarm"] },
    { file: "sound-colour.html", label: "Sound Colour", phrases: ["sound colour", "sound color"] },
    { file: "nebula.html", label: "Sound Nebula", phrases: ["sound nebula", "nebula"] },
    { file: "restore.html", label: "Property Colour Reference", phrases: ["property colour", "property color", "colour reference", "color reference"] },
    { file: "theremin.html", label: "Theremin", phrases: ["theremin"] },
    { file: "drum-machine.html", label: "Drum Machine", phrases: ["drum machine"] },
    { file: "vibration-alarm.html", label: "Vibration Alarm", phrases: ["vibration alarm"] },
    { file: "vibro-scan.html", label: "Vibro Scan", phrases: ["vibro scan", "vibration scan", "pipe crack"] },
    { file: "batcount.html", label: "Flying Fox Count", phrases: ["flying fox", "bat count"] },
    { file: "bluelight.html", label: "Blue Light", phrases: ["blue light"] },
    { file: "dmx.html", label: "DMX", phrases: ["dmx"] },
    { file: "video-production.html", label: "Video Production", phrases: ["video production"] },
    { file: "call.html", label: "Video Call", phrases: ["video call"] },
    { file: "serial-sensor.html", label: "Serial Sensor", phrases: ["serial sensor"] },
    { file: "camera-diag.html", label: "Camera Diagnostic", phrases: ["camera diagnostic", "camera diagnostics"] },
    { file: "viewer.html", label: "Viewer", phrases: ["viewer"] },
    { file: "tutorials.html", label: "Tutorials", phrases: ["tutorials"] },
  ];

  // ---- Auto-wired page commands -- these element ids are already a
  // shared convention across most pages in this suite (see e.g.
  // colorvision.js's pauseBtn, selective-effects.js's startBtn); rather
  // than hand-register the same "start"/"photo"/"record" commands
  // separately on every page, this checks for each id once and wires it
  // if present. A page can still add its own extra commands with
  // registerCommands() below -- those are checked first.
  const AUTO_WIRE = [
    { id: "startBtn", phrases: ["start", "begin", "start camera", "enable camera", "stop"] },
    { id: "photoBtn", phrases: ["take photo", "take a photo", "photo", "snap a photo"] },
    { id: "recordBtn", phrases: ["record", "start recording", "stop recording", "toggle recording"] },
    { id: "pauseBtn", phrases: ["pause", "resume", "pause camera", "resume camera"] },
    { id: "muteBtn", phrases: ["mute", "unmute", "toggle mute"] },
  ];

  let pageCommands = []; // registerCommands() entries, checked before AUTO_WIRE and before navigation
  let autoWired = [];    // resolved AUTO_WIRE entries actually present on this page

  function resolveAutoWire() {
    autoWired = AUTO_WIRE
      .map((entry) => ({ el: document.getElementById(entry.id), phrases: entry.phrases, label: entry.id }))
      .filter((entry) => !!entry.el);
  }

  // ---- Dispatch ----

  let enabled = false;
  let recognition = null;
  let btn, statusEl;

  function report(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function handleTranscript(transcript) {
    const raw = transcript.trim();
    const words = toWords(raw);

    const pageMatch = bestMatch(words, pageCommands);
    if (pageMatch) {
      report(`Heard "${raw}" -- ${pageMatch.label || "ran a command"}.`);
      try { pageMatch.run(); } catch (e) {}
      return;
    }

    const wired = bestMatch(words, autoWired);
    if (wired) {
      report(`Heard "${raw}" -- ${wired.label}.`);
      try { wired.el.click(); } catch (e) {}
      return;
    }

    if ((words.includes("stop") && words.includes("listening")) || (words.length === 1 && words[0] === "listening")) {
      report("Stopped listening.");
      setEnabled(false);
      return;
    }

    const navMatch = bestMatch(words, NAV_TARGETS);
    if (navMatch) {
      report(`Heard "${raw}" -- opening ${navMatch.label}…`);
      setTimeout(() => { window.location.href = navMatch.file; }, 400);
      return;
    }

    report(`Heard "${raw}" -- didn't match a command.`);
  }

  function startRecognition() {
    if (recognition) return;
    recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      handleTranscript(transcript);
    };
    recognition.onerror = (event) => {
      report("Voice assistant error: " + event.error);
    };
    recognition.onend = () => {
      // Browsers auto-stop recognition after a period of silence even in
      // continuous mode -- restart transparently while still enabled, so
      // "on" means "keeps listening," not "listened once."
      if (enabled) { try { recognition.start(); } catch (e) {} }
    };
    try { recognition.start(); } catch (e) { report("Couldn't start listening: " + e.message); }
  }

  function stopRecognition() {
    if (!recognition) return;
    const r = recognition;
    recognition = null; // cleared first so onend sees enabled=false and doesn't restart
    try { r.stop(); } catch (e) {}
  }

  function setEnabled(next) {
    enabled = next;
    if (btn) {
      btn.textContent = enabled ? "🎤 Listening…" : "🎤";
      btn.setAttribute("aria-pressed", String(enabled));
      btn.classList.toggle("va-on", enabled);
    }
    if (statusEl) statusEl.classList.toggle("va-hide", !enabled);
    if (enabled) {
      resolveAutoWire(); // re-check in case the page's own script mounted these after voice-assistant.js loaded
      report("Listening… (voice may be processed by this browser's own cloud speech service -- see the mic button's tooltip)");
      startRecognition();
    } else {
      stopRecognition();
    }
  }

  // ---- Self-mounted UI -- bottom-left, so it doesn't collide with
  // colorvision.html's own #floatingCaptureBar (bottom-right).
  function mountUI() {
    const style = document.createElement("style");
    style.textContent = `
      #voiceAssistantBtn {
        position: fixed; left: 14px; bottom: 14px; z-index: 6;
        width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(242,242,247,0.2);
        background: rgba(20,20,28,0.85); color: #f2f2f7; font-size: 20px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; padding: 0;
      }
      #voiceAssistantBtn.va-on { background: rgba(74,222,128,0.85); color: #06202b; font-size: 12px; width: auto; padding: 0 14px; }
      #voiceAssistantStatus {
        position: fixed; left: 14px; bottom: 68px; z-index: 6; max-width: min(80vw, 360px);
        background: rgba(20,20,28,0.9); color: rgba(242,242,247,0.9); font-size: 12px; line-height: 1.4;
        border-radius: 10px; padding: 8px 10px; border: 1px solid rgba(242,242,247,0.15);
      }
      #voiceAssistantStatus.va-hide { display: none; }
    `;
    document.head.appendChild(style);

    btn = document.createElement("button");
    btn.id = "voiceAssistantBtn";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.title = "Voice assistant -- say a feature's name to open it (e.g. \"colour vision\", \"theremin\"), or this page's own start/photo/record/pause if it has one. Uses this browser's built-in speech recognition, which in most browsers (Chrome/Chromium especially) sends audio to the browser vendor's own cloud service to transcribe -- not on-device, unlike this suite's camera models. Only listens while on.";
    btn.textContent = "🎤";

    statusEl = document.createElement("div");
    statusEl.id = "voiceAssistantStatus";
    statusEl.className = "va-hide";

    btn.addEventListener("click", () => setEnabled(!enabled));

    document.body.appendChild(statusEl);
    document.body.appendChild(btn);
  }

  if (supported) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => { mountUI(); resolveAutoWire(); });
    } else {
      mountUI();
      resolveAutoWire();
    }
  }

  // Pages can add their own commands beyond the auto-wired id="..."
  // buttons and global navigation -- checked with highest priority.
  // phrases: string[] (what to say), run: () => void, label?: string
  // (shown in the "Heard ... --" status line; defaults to unlabelled).
  window.VoiceAssistant = {
    get supported() { return supported; },
    get enabled() { return enabled; },
    registerCommands(commands) {
      if (Array.isArray(commands)) pageCommands = pageCommands.concat(commands);
    },
    setEnabled,
  };

  // Same outside-the-app sanity-check hook the rest of this suite's work
  // gets (see colour-alarm.js's __colourAlarmTestables, selective-effects
  // .js's __selectiveEffectsTestables) -- lets word matching, dispatch
  // priority, and auto-wiring be verified without a real microphone or a
  // real (possibly cloud-backed) speech recognition result.
  window.__voiceAssistantTestables = {
    toWords,
    scoreCommand,
    bestMatch,
    handleTranscript,
    resolveAutoWire,
    getPageCommands: () => pageCommands,
    getAutoWired: () => autoWired,
    getNavTargets: () => NAV_TARGETS.slice(),
    getLastStatus: () => (statusEl ? statusEl.textContent : ""),
  };
})();
