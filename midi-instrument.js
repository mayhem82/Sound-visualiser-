(() => {
  "use strict";

  // Shared Web MIDI output + GM instrument-sample playback -- the same
  // three-output idea (Synth/MIDI/Instrument) sound-colour.js's chime,
  // dominant tone, and edge texture channels each already have, factored
  // out here so a NEW page (starting with theremin.js) can offer the same
  // capability without a second copy of the GM instrument table, the
  // soundfont fetch/cache, or the raw Web MIDI byte-twiddling.
  // sound-colour.js keeps its own existing internal copy untouched -- this
  // is for anything new that wants the same real outputs, not a refactor
  // of that already-shipped page.

  const SOUNDFONT_BASE_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/";

  const GM_INSTRUMENTS = [
    { name: "Acoustic Grand Piano", program: 0, folder: "acoustic_grand_piano" },
    { name: "Bright Acoustic Piano", program: 1, folder: "bright_acoustic_piano" },
    { name: "Electric Grand Piano", program: 2, folder: "electric_grand_piano" },
    { name: "Honky-tonk Piano", program: 3, folder: "honkytonk_piano" },
    { name: "Electric Piano 1", program: 4, folder: "electric_piano_1" },
    { name: "Electric Piano 2", program: 5, folder: "electric_piano_2" },
    { name: "Harpsichord", program: 6, folder: "harpsichord" },
    { name: "Clavinet", program: 7, folder: "clavinet" },
    { name: "Celesta", program: 8, folder: "celesta" },
    { name: "Glockenspiel", program: 9, folder: "glockenspiel" },
    { name: "Music Box", program: 10, folder: "music_box" },
    { name: "Vibraphone", program: 11, folder: "vibraphone" },
    { name: "Marimba", program: 12, folder: "marimba" },
    { name: "Xylophone", program: 13, folder: "xylophone" },
    { name: "Tubular Bells", program: 14, folder: "tubular_bells" },
    { name: "Dulcimer", program: 15, folder: "dulcimer" },
    { name: "Drawbar Organ", program: 16, folder: "drawbar_organ" },
    { name: "Percussive Organ", program: 17, folder: "percussive_organ" },
    { name: "Rock Organ", program: 18, folder: "rock_organ" },
    { name: "Church Organ", program: 19, folder: "church_organ" },
    { name: "Reed Organ", program: 20, folder: "reed_organ" },
    { name: "Accordion", program: 21, folder: "accordion" },
    { name: "Harmonica", program: 22, folder: "harmonica" },
    { name: "Tango Accordion", program: 23, folder: "tango_accordion" },
    { name: "Acoustic Guitar (nylon)", program: 24, folder: "acoustic_guitar_nylon" },
    { name: "Acoustic Guitar (steel)", program: 25, folder: "acoustic_guitar_steel" },
    { name: "Electric Guitar (jazz)", program: 26, folder: "electric_guitar_jazz" },
    { name: "Electric Guitar (clean)", program: 27, folder: "electric_guitar_clean" },
    { name: "Electric Guitar (muted)", program: 28, folder: "electric_guitar_muted" },
    { name: "Overdriven Guitar", program: 29, folder: "overdriven_guitar" },
    { name: "Distortion Guitar", program: 30, folder: "distortion_guitar" },
    { name: "Guitar Harmonics", program: 31, folder: "guitar_harmonics" },
    { name: "Acoustic Bass", program: 32, folder: "acoustic_bass" },
    { name: "Electric Bass (finger)", program: 33, folder: "electric_bass_finger" },
    { name: "Electric Bass (pick)", program: 34, folder: "electric_bass_pick" },
    { name: "Fretless Bass", program: 35, folder: "fretless_bass" },
    { name: "Slap Bass 1", program: 36, folder: "slap_bass_1" },
    { name: "Slap Bass 2", program: 37, folder: "slap_bass_2" },
    { name: "Synth Bass 1", program: 38, folder: "synth_bass_1" },
    { name: "Synth Bass 2", program: 39, folder: "synth_bass_2" },
    { name: "Violin", program: 40, folder: "violin" },
    { name: "Viola", program: 41, folder: "viola" },
    { name: "Cello", program: 42, folder: "cello" },
    { name: "Contrabass", program: 43, folder: "contrabass" },
    { name: "Tremolo Strings", program: 44, folder: "tremolo_strings" },
    { name: "Pizzicato Strings", program: 45, folder: "pizzicato_strings" },
    { name: "Orchestral Harp", program: 46, folder: "orchestral_harp" },
    { name: "Timpani", program: 47, folder: "timpani" },
    { name: "String Ensemble 1", program: 48, folder: "string_ensemble_1" },
    { name: "String Ensemble 2", program: 49, folder: "string_ensemble_2" },
    { name: "Synth Strings 1", program: 50, folder: "synth_strings_1" },
    { name: "Synth Strings 2", program: 51, folder: "synth_strings_2" },
    { name: "Choir Aahs", program: 52, folder: "choir_aahs" },
    { name: "Voice Oohs", program: 53, folder: "voice_oohs" },
    { name: "Synth Choir", program: 54, folder: "synth_choir" },
    { name: "Orchestra Hit", program: 55, folder: "orchestra_hit" },
    { name: "Trumpet", program: 56, folder: "trumpet" },
    { name: "Trombone", program: 57, folder: "trombone" },
    { name: "Tuba", program: 58, folder: "tuba" },
    { name: "Muted Trumpet", program: 59, folder: "muted_trumpet" },
    { name: "French Horn", program: 60, folder: "french_horn" },
    { name: "Brass Section", program: 61, folder: "brass_section" },
    { name: "Synth Brass 1", program: 62, folder: "synth_brass_1" },
    { name: "Synth Brass 2", program: 63, folder: "synth_brass_2" },
    { name: "Soprano Sax", program: 64, folder: "soprano_sax" },
    { name: "Alto Sax", program: 65, folder: "alto_sax" },
    { name: "Tenor Sax", program: 66, folder: "tenor_sax" },
    { name: "Baritone Sax", program: 67, folder: "baritone_sax" },
    { name: "Oboe", program: 68, folder: "oboe" },
    { name: "English Horn", program: 69, folder: "english_horn" },
    { name: "Bassoon", program: 70, folder: "bassoon" },
    { name: "Clarinet", program: 71, folder: "clarinet" },
    { name: "Piccolo", program: 72, folder: "piccolo" },
    { name: "Flute", program: 73, folder: "flute" },
    { name: "Recorder", program: 74, folder: "recorder" },
    { name: "Pan Flute", program: 75, folder: "pan_flute" },
    { name: "Blown Bottle", program: 76, folder: "blown_bottle" },
    { name: "Shakuhachi", program: 77, folder: "shakuhachi" },
    { name: "Whistle", program: 78, folder: "whistle" },
    { name: "Ocarina", program: 79, folder: "ocarina" },
    { name: "Lead 1 (square)", program: 80, folder: "lead_1_square" },
    { name: "Lead 2 (sawtooth)", program: 81, folder: "lead_2_sawtooth" },
    { name: "Lead 3 (calliope)", program: 82, folder: "lead_3_calliope" },
    { name: "Lead 4 (chiff)", program: 83, folder: "lead_4_chiff" },
    { name: "Lead 5 (charang)", program: 84, folder: "lead_5_charang" },
    { name: "Lead 6 (voice)", program: 85, folder: "lead_6_voice" },
    { name: "Lead 7 (fifths)", program: 86, folder: "lead_7_fifths" },
    { name: "Lead 8 (bass + lead)", program: 87, folder: "lead_8_bass__lead" },
    { name: "Pad 1 (new age)", program: 88, folder: "pad_1_new_age" },
    { name: "Pad 2 (warm)", program: 89, folder: "pad_2_warm" },
    { name: "Pad 3 (polysynth)", program: 90, folder: "pad_3_polysynth" },
    { name: "Pad 4 (choir)", program: 91, folder: "pad_4_choir" },
    { name: "Pad 5 (bowed)", program: 92, folder: "pad_5_bowed" },
    { name: "Pad 6 (metallic)", program: 93, folder: "pad_6_metallic" },
    { name: "Pad 7 (halo)", program: 94, folder: "pad_7_halo" },
    { name: "Pad 8 (sweep)", program: 95, folder: "pad_8_sweep" },
    { name: "FX 1 (rain)", program: 96, folder: "fx_1_rain" },
    { name: "FX 2 (soundtrack)", program: 97, folder: "fx_2_soundtrack" },
    { name: "FX 3 (crystal)", program: 98, folder: "fx_3_crystal" },
    { name: "FX 4 (atmosphere)", program: 99, folder: "fx_4_atmosphere" },
    { name: "FX 5 (brightness)", program: 100, folder: "fx_5_brightness" },
    { name: "FX 6 (goblins)", program: 101, folder: "fx_6_goblins" },
    { name: "FX 7 (echoes)", program: 102, folder: "fx_7_echoes" },
    { name: "FX 8 (sci-fi)", program: 103, folder: "fx_8_scifi" },
    { name: "Sitar", program: 104, folder: "sitar" },
    { name: "Banjo", program: 105, folder: "banjo" },
    { name: "Shamisen", program: 106, folder: "shamisen" },
    { name: "Koto", program: 107, folder: "koto" },
    { name: "Kalimba", program: 108, folder: "kalimba" },
    { name: "Bagpipe", program: 109, folder: "bagpipe" },
    { name: "Fiddle", program: 110, folder: "fiddle" },
    { name: "Shanai", program: 111, folder: "shanai" }
  ];
  // Percussive-flavoured GM instruments -- real GM program numbers played on
  // a normal channel with a fixed note, NOT the reserved channel-10 drum
  // kit (a program change on channel 10 is ignored by every GM synth);
  // these are ordinary pitched-channel instruments that just happen to
  // sound percussive.
  const GM_PERCUSSIVE_INSTRUMENTS = [
    { name: "Tinkle Bell", program: 112, folder: "tinkle_bell" },
    { name: "Agogo", program: 113, folder: "agogo" },
    { name: "Woodblock", program: 115, folder: "woodblock" },
    { name: "Taiko Drum", program: 116, folder: "taiko_drum" },
    { name: "Melodic Tom", program: 117, folder: "melodic_tom" },
    { name: "Synth Drum", program: 118, folder: "synth_drum" },
    { name: "Reverse Cymbal", program: 119, folder: "reverse_cymbal" },
    { name: "Guitar Fret Noise", program: 120, folder: "guitar_fret_noise" },
    { name: "Breath Noise", program: 121, folder: "breath_noise" },
    { name: "Seashore", program: 122, folder: "seashore" },
    { name: "Bird Tweet", program: 123, folder: "bird_tweet" },
    { name: "Telephone Ring", program: 124, folder: "telephone_ring" },
    { name: "Helicopter", program: 125, folder: "helicopter" },
    { name: "Applause", program: 126, folder: "applause" },
    { name: "Gunshot", program: 127, folder: "gunshot" }
  ];
  const GM_ALL_INSTRUMENTS = GM_INSTRUMENTS.concat(GM_PERCUSSIVE_INSTRUMENTS);
  const GM_FAMILY_NAMES = [
    "Piano", "Chromatic Percussion", "Organ", "Guitar", "Bass", "Strings",
    "Ensemble", "Brass", "Reed", "Pipe", "Synth Lead", "Synth Pad",
    "Synth Effects", "Ethnic", "Percussive", "Sound Effects"
  ];

  function populateInstrumentSelect(selectEl) {
    selectEl.innerHTML = "";
    let currentFamily = -1;
    let currentGroup = null;
    GM_ALL_INSTRUMENTS.forEach((inst) => {
      const family = Math.floor(inst.program / 8);
      if (family !== currentFamily) {
        currentFamily = family;
        currentGroup = document.createElement("optgroup");
        currentGroup.label = GM_FAMILY_NAMES[family] || "Other";
        selectEl.appendChild(currentGroup);
      }
      const opt = document.createElement("option");
      opt.value = inst.folder;
      opt.textContent = inst.name;
      currentGroup.appendChild(opt);
    });
  }

  function hzToMidiNote(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  }

  function centsToRateFactor(cents) {
    return Math.pow(2, cents / 1200);
  }

  const NATURAL_NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Finds the nearest available natural-note sample to a MIDI note number,
  // and how many semitones away it is (for pitch-shifting via playbackRate)
  // -- the soundfont only ships one sample per natural note per octave, not
  // every semitone.
  function midiNoteToNearestSample(midiNote) {
    const target = Math.round(midiNote);
    let best = null;
    for (let candidate = target - 6; candidate <= target + 6; candidate++) {
      const octave = Math.floor(candidate / 12) - 1; // MIDI 60 = C4
      const semitoneInOctave = ((candidate % 12) + 12) % 12;
      const noteName = Object.keys(NATURAL_NOTE_SEMITONES).find((n) => NATURAL_NOTE_SEMITONES[n] === semitoneInOctave);
      if (!noteName) continue;
      const diff = Math.abs(candidate - target);
      if (!best || diff < best.diff) best = { sampleName: `${noteName}${octave}`, diff, semitoneOffset: midiNote - candidate };
    }
    return best;
  }

  // ---- Web MIDI output ----
  let midiAccess = null;
  let midiOutput = null;
  let outputsChangedCb = null;

  function refreshOutputs() {
    if (!midiAccess) { if (outputsChangedCb) outputsChangedCb([], null); return; }
    const outputs = [...midiAccess.outputs.values()];
    const previouslySelectedId = midiOutput && midiOutput.id;
    midiOutput = outputs.find((o) => o.id === previouslySelectedId) || outputs[0] || null;
    if (outputsChangedCb) outputsChangedCb(outputs, midiOutput ? midiOutput.id : null);
  }

  // onOutputsChanged(outputs, selectedId) fires once immediately (via
  // refreshOutputs) and again on every future MIDI device connect/disconnect
  // -- a caller renders its own <select> from `outputs` and calls setOutput
  // when the user picks one, rather than this module owning any DOM.
  async function ensureMidiAccess(onOutputsChanged) {
    if (onOutputsChanged) outputsChangedCb = onOutputsChanged;
    if (midiAccess) { refreshOutputs(); return true; }
    if (!navigator.requestMIDIAccess) return false;
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      midiAccess.onstatechange = refreshOutputs;
      refreshOutputs();
      return true;
    } catch (e) {
      midiAccess = null;
      return false;
    }
  }

  function setMidiOutput(id) {
    if (!midiAccess) return;
    midiOutput = midiAccess.outputs.get(id) || null;
  }

  function getMidiOutputs() {
    return midiAccess ? [...midiAccess.outputs.values()] : [];
  }

  const programSentPerChannel = {};
  const pitchBendSentPerChannel = {};

  function sendProgramChange(channel, program) {
    if (!midiOutput) return;
    if (programSentPerChannel[channel] === program) return;
    programSentPerChannel[channel] = program;
    midiOutput.send([0xc0 | channel, program]);
  }

  function sendNoteOn(channel, midiNote, velocity) {
    if (!midiOutput) return;
    const note = Math.max(0, Math.min(127, Math.round(midiNote)));
    const vel = Math.max(1, Math.min(127, Math.round(velocity * 127)));
    midiOutput.send([0x90 | channel, note, vel]);
  }

  function sendNoteOff(channel, midiNote) {
    if (!midiOutput) return;
    const note = Math.max(0, Math.min(127, Math.round(midiNote)));
    midiOutput.send([0x80 | channel, note, 0]);
  }

  // Standard MIDI pitch bend (0xE0), 14-bit value centred at 8192 -- default
  // GM pitch bend range on virtually every synth is +-2 semitones (200
  // cents) with no RPN setup required, so a caller's detune cents are
  // clamped to that range to guarantee this works on any connected
  // instrument out of the box.
  function sendPitchBend(channel, cents) {
    if (!midiOutput) return;
    const clamped = Math.max(-200, Math.min(200, cents));
    const value = Math.max(0, Math.min(16383, Math.round(8192 + (clamped / 200) * 8191)));
    if (pitchBendSentPerChannel[channel] === value) return;
    pitchBendSentPerChannel[channel] = value;
    midiOutput.send([0xe0 | channel, value & 0x7f, (value >> 7) & 0x7f]);
  }

  // Plays one note out to the currently selected MIDI output: a program
  // change (only sent when it actually changes), a pitch bend (also
  // deduped against the last value sent), note on, then note off after
  // durationMs. Returns false (and sends nothing) if no MIDI output is
  // selected, so a caller can fall back to another path.
  function playMidiNote(channel, program, midiNote, velocity, durationMs, detuneCents = 0) {
    if (!midiOutput) return false;
    sendProgramChange(channel, program);
    sendPitchBend(channel, detuneCents);
    sendNoteOn(channel, midiNote, velocity);
    setTimeout(() => sendNoteOff(channel, midiNote), durationMs);
    return true;
  }

  // ---- Instrument sample playback ----
  // Caller supplies its own AudioContext and destination node (rather than
  // this module owning a context) -- avoids yet another separate
  // AudioContext per feature; play straight into whatever graph the caller
  // already has running.
  const instrumentSampleCache = new Map(); // "folder/NoteOctave" -> Promise<AudioBuffer>

  function loadInstrumentSample(ctx, folder, sampleName) {
    const key = `${folder}/${sampleName}`;
    if (instrumentSampleCache.has(key)) return instrumentSampleCache.get(key);
    const promise = fetch(`${SOUNDFONT_BASE_URL}${folder}-mp3/${sampleName}.mp3`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`sample fetch failed: ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((arrayBuf) => ctx.decodeAudioData(arrayBuf));
    instrumentSampleCache.set(key, promise);
    return promise;
  }

  // Fire-and-forget (never blocks the caller on the network/decode round
  // trip); a fetch/decode failure (offline, sample genuinely missing) is
  // silently dropped rather than surfaced. Returns a Promise<boolean>.
  async function playInstrumentNote(ctx, destination, folder, midiNote, velocity, durationS, detuneCents = 0) {
    if (!ctx) return false;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const nearest = midiNoteToNearestSample(midiNote);
    if (!nearest) return false;
    try {
      const buffer = await loadInstrumentSample(ctx, folder, nearest.sampleName);
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = Math.pow(2, nearest.semitoneOffset / 12) * centsToRateFactor(detuneCents);
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0.0001, Math.min(1, velocity));
      src.connect(gain);
      gain.connect(destination);
      src.start(now);
      if (durationS) src.stop(now + durationS);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.MidiInstrumentHelper = {
    GM_INSTRUMENTS,
    GM_PERCUSSIVE_INSTRUMENTS,
    GM_ALL_INSTRUMENTS,
    hzToMidiNote,
    centsToRateFactor,
    populateInstrumentSelect,
    midi: {
      ensureAccess: ensureMidiAccess,
      setOutput: setMidiOutput,
      getOutputs: getMidiOutputs,
      playNote: playMidiNote,
    },
    instrument: {
      playNote: playInstrumentNote,
    },
  };
})();
