# Live and offline audio parity

Violet Signal uses one shared set of pure mappings to resolve arrangement occurrences, Hold/Linear step automation, seeded Ghost and Chance events, deterministic Humanize/Swing/Micro Shift offsets, ratchets, fatigue, effect gain staging, texture noise color, and layered-instrument Character. The live engine schedules the resolved events against Tone Transport; the WAV renderer schedules the same written events inside a Tone Offline context.

Arrangement occurrence resolution selects the source pattern without mutating it, then applies whole-memory rotation, bounded pitch transposition, per-occurrence voice mute, per-voice layer focus, and effect modifiers to scheduled events. Rotation moves steps, their expression data, and all automation lanes together through a cloned virtual pattern. Neutral occurrences reproduce the legacy pattern-letter behavior.

One pure resolver supplies automation values to the lane preview, live sequencer, and offline renderer. Hold carries the latest point across the loop seam. Linear interpolates numerically between surrounding points, including the final-to-first segment; zero points use the global fallback and one point remains constant. Legacy projects normalize every lane to Hold.

Chord, Signal, and Bass ties use one shared lifecycle decision model in both renderers. An outgoing tied event attacks without a scheduled gate release; the next eligible authored event changes the active source, and the chain continues only when that event also carries a tie. The terminal event retains its authored gate length across rests, but an earlier replacement note releases it at that note's shifted start. Rests, mute, failed Chance, Ghost substitution, and ratchets otherwise release the previous held state before any replacement trigger. Live Pause, Stop, Panic, and offline arrangement completion also release held sources. Layer/engine replacement starts the old source's release and defers disposal until its tail has elapsed. Arrangement and pattern boundaries do not otherwise interrupt a valid chain.

Mono Signal/Bass subtractive, FM, AM, and dual sources call the Tone monophonic pitch-change path, so the voice's Glide remains audible without restarting the envelope. Polyphonic Chords retain pitches shared by adjacent voicings and release/attack only removed or added pitches. The managed physical-pluck pool retains shared strings but re-excites changed pitches because `PluckSynth` has no continuous repitch operation.

Resolved pattern automation precedes occurrence effects. Mask uses a `0.25`–`4` multiplier; Memory, Veil, Fracture, Ghost, and Overclock use bounded `-1`–`1` offsets. Live Pressure/Freeze gestures follow those written values, and the final audio mapping performs the processor safety clamps. In particular, the occurrence Mask multiplier remains available to interact with performance brightness before the shared `80`–`12000 Hz` filter bound. Both renderers therefore use the same precedence: `pattern data/automation -> occurrence transform -> performance gesture -> safety mapping`.

The offline synthesis graph mirrors the live graph through one shared routing factory. Each voice's Primary and optional Shadow sources are created through the same source factory and enter a common voice filter/level before routing:

```text
Primary + Shadow -> voice filter/level -> unity dry bus ----------------------|
                                       -> Fracture send -> shared processor --|
                                       -> Veil send ----> shared processor --|-> compensated input -> drive -> master -> −1 dB limiter
                                       -> Memory send --> shared processor ---|
                                       -> Environment --> shared processor ---|
```

Each per-voice send is bounded to `0`–`1`; legacy voices without sends normalize all four effect sends to `1`. A newly migrated Signal voice uses a quieter calibrated depth map because its lane was not present in the legacy mix. The dry branch remains at unity and each send input uses a `0.72` trim before the processor. A shared compensation mapping reduces the pre-drive input by the nominal dry-plus-return sum, keeping even four unity sends at the established input level instead of relying on the final limiter to absorb buildup. These mappings are identical in both renderers. Mute and solo happen upstream of the fork, so they silence both dry and effect input. The processors are shared rather than duplicated per voice or layer.

Format v4 adds Signal as a fifth, monophonic source with its own step lane, gate length, and tie state. v1–v3 projects normalize the voice and empty lane deterministically, so their rendered audio is unchanged. Existing Style recipes deliberately leave Signal notes and settings alone; Signal sounds only when the composer authors it.

Global and step-addressed Fracture, Veil, and Memory values shape the shared processors and return gains after the stable per-voice sends; Environment uses the same global-return model. Memory's dotted-eighth delay is derived from the composition BPM in both renderers and retimed when live tempo changes. Drive now sits after the compensated dry/effect returns. That placement deliberately replaces the old serial interactions while keeping legacy voices routed to every processor, using conservative gain staging and final limiting as the compatibility strategy. Engine Character, layer pitch/level/response, bass filter-envelope behavior, pulse pitch decay, chord Overclock shaping, and Texture noise color remain matched.

WAV output is stereo, 44.1 kHz, 16-bit PCM. After rendering, the highest absolute PCM sample is normalized to `−1 dBFS`. Silence is left untouched. This removes accidental playback-level differences while retaining the balance, dynamics, distortion, limiting, and effect interaction created before the normalization stage.

Peak normalization is not full mastering or LUFS normalization. Material with very sharp transients can still sound quieter than heavily compressed commercial music even when both peak at `−1 dBFS`.

The WAV represents the written composition. Temporary live gestures such as Pressure and Freeze Memory are intentionally excluded; use live WebM capture when those gestures are part of the performance.

Editor playback and live WebM capture add bounded monitoring calibration before the shared limiter. A `+12 dB` monitor stage restores practical headroom without changing the written Output value, while engine-specific monitor trims compensate Tone's quieter AM/FM carriers and restrain naturally dense dual/metal sources. Offline WAV rendering opts out of both monitor calibrations and retains its existing peak-normalized sound.

Live initialization is serialized so overlapping first gestures cannot create duplicate Transport callbacks. Pending Play commands are invalidated by a newer Play, Pause, Stop, Panic, or engine disposal, and Transport mutations are skipped when Tone is already in the requested state. This keeps rapid controls and first-load cancellation from corrupting Tone's internal tick-state timeline. A disposed engine also cannot resume construction after its asynchronous reverb setup finishes. Real-time layer starts receive a two-millisecond audio-clock lead and one-millisecond monotonic separation when a callback arrives late; this avoids equal/past starts rejected by Tone's unsynced monophonic sources. Offline rendering retains the exact authored timestamps.

The packaged `violet render <input.violet> --out <output.wav>` command exposes this exact renderer to scripts and CI. Node validates and canonicalizes the composition before starting a loopback-only static server and a temporary headless Chrome or Edge session. The browser downloads the generated Blob directly to the requested path, avoiding a large audio transfer through the automation protocol. Browser discovery checks `VIOLET_CHROME_PATH`, `CHROME_PATH`, and standard installation locations; the browser and local server are always closed after success or failure.
