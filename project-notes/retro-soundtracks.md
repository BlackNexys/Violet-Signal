# Retro soundtrack vertical slice

Violet Signal remains a general music application. Underworld is an optional built-in instrument pack and an editable example; no game code, assets, or runtime integration are required.

## Compose and export Still Burning

1. Start the app with `npm run dev` and use **Import** to open [`public/examples/still-burning.violet`](../public/examples/still-burning.violet). The same file is served at `/examples/still-burning.violet` in a production build.
2. Press Play. Edit the Signal melody, Bass, Chord, Pulse, and Texture lanes in the sequencer or the notation editor. Choose sounds from the Underworld group in **Sound patch**; other packs remain available.
3. Set **Loop from** to **1**, **to** to **4**, then click **Loop WAV**. These numbers refer to arrangement occurrences, not steps or bars. Each occurrence in this example contains two bars.
4. Import the resulting `still-burning-loop.wav` into the game and enable whole-file looping. It is stereo 44.1 kHz, 16-bit PCM, normalized to −1 dBFS, with exactly 564,480 frames (12.8 seconds). There is no appended silence or separate tail.

The command-line equivalent, after `npm run build:cli`, is:

```sh
node dist-cli/violet.js validate public/examples/still-burning.violet
node dist-cli/violet.js render public/examples/still-burning.violet --out still-burning-loop.wav --loop 1:4
```

For a shorter loop, use `--loop 1:2`. Ranges are one-based and inclusive in both the UI and CLI. The programmatic renderer accepts `{ loop: { startOccurrence: 0, endOccurrence: 4 } }`, using a zero-based start and exclusive end. Invalid or empty ranges fail with an error. Export controls are transient and do not change the saved composition schema.

The regular **WAV** button and CLI render without `--loop` retain the full arrangement and four-second ending tail. Loop export renders only the chosen section; an earlier intro does not feed its effects. Separate intro/loop pairs and synchronized stems are deferred, so this slice supplies a whole-file loop rather than sample-accurate intro-to-loop transitions.

Use WAV directly where supported. For OGG, encode the exported WAV with your game asset pipeline and check the decoded duration and seam in the target engine. Violet Signal does not encode OGG or MP3, and it writes no embedded WAV loop-marker chunk; enable looping on the entire asset in the game. Avoid MP3 for assets requiring exact loop timing because codec padding needs explicit handling.

## Musical material and sound pack

Still Burning is an original eight-bar sketch at 150 BPM. The opening G–Eb–G–Bb–C hook climbs over C minor, answers over Ab, opens toward Eb and Bb, then returns through F minor and G major. The B natural at the turnaround pulls into the opening C. The aim is momentum with a wistful harmonic center, rather than a transcription of an existing soundtrack. All four patterns remain individually editable and repeat through four occurrences.

| Patch | Voice | Sound |
| --- | --- | --- |
| Magenta Flame | Signal | Bright FM lead, quiet square octave, short glide |
| Neon Drive | Bass | Short FM attack with a sine sub layer |
| Afterlife | Chords | Warm triangle body and faint FM glass |
| Checkpoint | Pulse | Compact membrane kick and metallic transient |
| Cinder Hat | Texture | Short, high-passed noise hat/backbeat |

These use the existing versioned registry and synthesis factory. Original patches, defaults, styles, and saved data are unchanged. Applying patches preserves the user's sends. The example includes explicit voice/layer settings as well as patch identities: `patch` alone is descriptive and does not load settings during notation parsing. Customizing synthesis settings can legitimately change the displayed patch identity to Custom.

## Loop processing and limits

The offline renderer schedules repeated copies of the selected occurrences through the existing audio graph. It warms up at least one complete cycle and twelve seconds, increasing warmup for long layer releases. It preserves occurrence transforms, step automation, ratchets, ties, and the original occurrence addresses used for seeded Chance, Ghost, and timing variation. Fatigue and voice lifecycle state continue across the repeated boundaries.

The final complete cycle is extracted at the nearest 44.1 kHz sample boundary. A five-millisecond crossfade blends its end toward the preceding cycle's approach to its beginning, preserving the exact frame count and carrying active effects into the start. Normalization happens after extraction, using both channels together. This is a practical seam treatment, not mathematical periodic convergence of every nonlinear or modulated effect. A long sustain, chorus, changing fatigue, or deliberate harmonic jump can still make the musical transition perceptible; audition multiple repetitions in the game.

Event decisions are deterministic. Tone's procedural noise and generated reverb impulse are not seeded here, so independent renders are not guaranteed byte-identical. Editor monitoring also has existing level/engine calibration; offline export represents written settings and excludes temporary live Pressure and Freeze gestures. Warmup increases rendering time and memory use, especially for long loops. There is no chip-accurate Genesis or SNES emulation.

## Architecture audit and next steps

The current v4 model already provides four patterns with up to 64 steps each, five layered voices, and up to sixteen transformed arrangement occurrences. This is sufficient for the first theme. Pattern IDs, parser validation, normalization, arrangement controls, and UI assumptions all encode those bounds; expanding only one would silently truncate or reject projects. A later expansion should introduce a new format version, migrate v1–v4 data, and update these consumers together.

The registry already supports FM, AM, subtractive, dual, pluck, membrane, metal, and noise engines. Two-operator Tone FM and layered shadows are sufficient for these patches. Four-operator algorithms, programmable pulse duty, sample drums, independent kick/snare/hat lanes, and tracker pitch effects remain candidates for a later audible comparison. Current percussion is one pitched membrane lane plus one noise/metal texture lane; it cannot independently sequence a full drum kit.

Live and offline scheduling share pure occurrence, automation, seeded variation, timing, fatigue, effect routing, and tied-note lifecycle helpers. Their actual dispatch loops remain duplicated, which is a parity risk. This slice extends the existing offline path without a new event IR. Before adding tracker effects or MIDI, extract deterministic timestamped note/control events while preserving original seed coordinates, shifted-note replacement releases, gates, ratchets, ties, and effect precedence. Compare both schedulers against event fixtures and real browser renders.

Future MIDI interchange should map notes, timing, tempo, and tracks separately from engine-specific patches and effects. Audio-to-retro reconstruction would need transcription, instrument inference, and resynthesis; bit reduction only changes timbre. No MP3/WAV reconstruction converter is implemented.

## Validation

`npm test` checks loop bounds, exact frame planning, stereo seam extraction, nonmutation, example parsing/serialization, pack compatibility, CLI option propagation, and existing migration/scheduling regressions. The existing offline Web Audio unit test skips in Node; actual audio is exercised by the browser tests below.

`npm run test:cli` builds the packaged renderer and runs it in Chrome/Edge. It verifies both normal export and the entire retro theme: exact loop length, stereo PCM headers, audible energy, normalized peak, bounded boundary discontinuity, and invalid ranges. `npm run browser:smoke` against `npm run preview` additionally imports the example, checks patch selection, and exports a selected subrange through the UI, alongside the existing live-audio and editing checks. These checks do not replace a listening review in the target game.
