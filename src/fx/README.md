# Violet FX Lab · one-shot vertical slice

**Status:** Optional prototype. Composer, .violet DSL v4, existing patches, song state, and game integration are unchanged.

## Workflow

Switch from Composer to **FX Lab** in the top utility row. Start with the included **Flicker — Magenta Snap** experiment. Edit one of three independently placed layers:

- **Transient**: short band-passed noise click.
- **Body**: two-oscillator FM pitch sweep.
- **Tail**: two inharmonic metallic oscillators with controlled fade.

Each can be enabled/disabled and adjusted independently. Use the tiny timeline to see start/length at a glance. **Audition** plays one shot; **Rapid-fire ×5** schedules five shots 200 ms apart to expose collisions or fatiguing tails. **Stop** cancels preview voices. Export **WAV** writes a stereo, 44.1 kHz, 16-bit PCM file at *authored levels* (no automatic peak normalization); a clipping warning appears for peak >= 0 dBFS. Save/import a separate editable \`.violetfx\` JSON project.

The generated files belong in your game's asset library. No game runtime integration is included.

## Architecture

- \`src/fx/project.ts\`: v1 data model, strict numeric limits, validation, serialization. Separate from \`.violet\`.
- \`src/fx/synthesis.ts\`: deterministic white-noise seeds, Web Audio layers, pitch sweeps, filter, amplitude quantization, offline stereo rendering, WAV encoder.
- \`src/components/FxLab.tsx\`: editor, preview, five-shot stress test, import/export.

Offline preview and export share the same rendered buffer. The current slice is deliberately synth-only: no recording import, trimming, sample manipulation, or complex multi-node effect chains. Pitch changes are exponential; the noise layer's pitch controls are not connected (filter and amplitude affect it). Bit reduction quantizes amplitude rather than sample rate. Project length is 60–1500 ms and each layer is fully constrained to its bounds.

FX Lab does not modify Composer transport or .violet project schema. Switching to FX Lab stops the Composer transport to prevent accidental simultaneous playback. Closing or resetting preview stops active voices and closes the preview AudioContext on unmount.

## Review

1. Open **FX Lab**, audition once, and listen for a clear snap, body, and decay.
2. Mute each layer to verify independent control; adjust the time bars and filters.
3. Use five-shot playback to inspect masking.
4. Export WAV and verify length, level, and no clipping.
5. Save .violetfx, import it, and verify identical controls.
6. Switch back to Composer and confirm existing songs, playback, and WAV export work unchanged.

## Future scope

An ordinary sound design session needs samples and waveform editing, but that is deliberately deferred. Good future additions include amplitude/pitch/filter envelope points, sample layers, waveform preview, undo/redo, variant batching, and shared engine adapter(s) where isolation can be maintained without breaking musical semantics.
