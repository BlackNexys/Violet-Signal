# Live and offline audio parity

Violet Signal uses one shared set of pure mappings to resolve arrangement occurrences, step automation, seeded Ghost and Chance events, deterministic Humanize/Swing/Micro Shift offsets, ratchets, fatigue, effect gain staging, texture noise color, and layered-instrument Character. The live engine schedules the resolved events against Tone Transport; the WAV renderer schedules the same written events inside a Tone Offline context.

Arrangement occurrence resolution selects the source pattern without mutating it, then applies whole-memory rotation, bounded pitch transposition, per-occurrence voice mute, per-voice layer focus, and effect modifiers to scheduled events. Rotation moves steps, their expression data, and all automation lanes together through a cloned virtual pattern. Neutral occurrences reproduce the legacy pattern-letter behavior.

Pattern automation resolves before occurrence effects. Mask uses a `0.25`–`4` multiplier; Memory, Veil, Fracture, Ghost, and Overclock use bounded `-1`–`1` offsets. Live Pressure/Freeze gestures follow those written values, and the final audio mapping performs the processor safety clamps. In particular, the occurrence Mask multiplier remains available to interact with performance brightness before the shared `80`–`12000 Hz` filter bound. Both renderers therefore use the same precedence: `pattern data/automation -> occurrence transform -> performance gesture -> safety mapping`.

The offline synthesis graph mirrors the live graph: each voice's Primary and optional Shadow sources are created through the same source factory, then four filtered voice channels feed the same input trim, drive, Fracture, Veil, Memory, Environment, master trim, and `−1 dB` limiter. Engine Character, layer pitch/level/response, bass filter-envelope behavior, pulse pitch decay, chord Overclock shaping, and Texture noise color are also matched.

WAV output is stereo, 44.1 kHz, 16-bit PCM. After rendering, the highest absolute PCM sample is normalized to `−1 dBFS`. Silence is left untouched. This removes accidental playback-level differences while retaining the balance, dynamics, distortion, limiting, and effect interaction created before the normalization stage.

Peak normalization is not full mastering or LUFS normalization. Material with very sharp transients can still sound quieter than heavily compressed commercial music even when both peak at `−1 dBFS`.

The WAV represents the written composition. Temporary live gestures such as Pressure and Freeze Memory are intentionally excluded; use live WebM capture when those gestures are part of the performance.

The packaged `violet render <input.violet> --out <output.wav>` command exposes this exact renderer to scripts and CI. Node validates and canonicalizes the composition before starting a loopback-only static server and a temporary headless Chrome or Edge session. The browser downloads the generated Blob directly to the requested path, avoiding a large audio transfer through the automation protocol. Browser discovery checks `VIOLET_CHROME_PATH`, `CHROME_PATH`, and standard installation locations; the browser and local server are always closed after success or failure.
