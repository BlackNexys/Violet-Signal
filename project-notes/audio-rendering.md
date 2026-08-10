# Live and offline audio parity

Violet Signal uses one shared set of pure mappings to resolve step automation, seeded Ghost and Chance events, deterministic Humanize/Swing/Micro Shift offsets, ratchets, fatigue, effect gain staging, and texture noise color. The live engine schedules the resolved events against Tone Transport; the WAV renderer schedules the same written events inside a Tone Offline context.

The offline synthesis graph mirrors the live graph: four filtered voice channels feed the same input trim, drive, Fracture, Veil, Memory, Environment, master trim, and `−1 dB` limiter. Bass filter-envelope behavior, pulse pitch decay, chord Overclock shaping, and Texture noise color are also matched.

WAV output is stereo, 44.1 kHz, 16-bit PCM. After rendering, the highest absolute PCM sample is normalized to `−1 dBFS`. Silence is left untouched. This removes accidental playback-level differences while retaining the balance, dynamics, distortion, limiting, and effect interaction created before the normalization stage.

Peak normalization is not full mastering or LUFS normalization. Material with very sharp transients can still sound quieter than heavily compressed commercial music even when both peak at `−1 dBFS`.

The WAV represents the written composition. Temporary live gestures such as Pressure and Freeze Memory are intentionally excluded; use live WebM capture when those gestures are part of the performance.
