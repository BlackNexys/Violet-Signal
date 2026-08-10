# Violet Signal style system

Violet Signal treats a style as a versioned, data-driven production recipe—not a genre lock and not a second audio engine. Every recipe targets the same composition primitives: tempo, meter, step count, swing, scale mood, voice design, shared effects, rhythmic positions, expression, and arrangement.

## Design principles

1. **One instrument, many vocabularies.** Styles configure the shared four-voice synth instead of branching into genre-specific interfaces.
2. **Preserve authorship.** Applying a style exposes independent preserve switches for tempo, timing, harmony, patterns, arrangement, voices, and effects.
3. **Blend bounded influences.** A primary style may borrow a secondary style at `0`–`0.8`; numeric traits interpolate while the primary style retains its structural identity.
4. **Determinism is musical.** Pattern recipes, chance, humanization, ratchets, and offline rendering use the composition seed and shared resolution logic.
5. **Timing remains explicit.** A pattern declares meter, sixteenth-note cell count, global swing, and optional per-step shift. Step 01 stays anchored at the loop seam.
6. **Old projects remain playable.** `world:` is accepted as an alias for `style:`, and missing fields migrate to conservative defaults.

## Registry anatomy

Definitions live in `src/model/styles.ts`. A `StyleDefinition` includes:

- stable `id`, display label, family, tags, description, and schema version;
- preferred/range tempo;
- meter, step count, and swing;
- scale mode and chord density;
- partial shared-effect and per-voice recipes;
- 16-cell rhythmic motifs that repeat safely into longer patterns;
- optional default probability, ratchet count, and micro-shift;
- an arrangement recipe using patterns A–D.

The initial registry covers ambient, Berlin School, synthpop, new wave, darkwave, witch house, synthwave, darksynth, house, techno, acid, trance, electro/breakbeat, drum & bass, hip-hop/trap, industrial/EBM, chiptune, glitch/IDM, and cinematic scoring.

## Applying and blending

Style Lab calls one pure transformation: `applyStyle(composition, styleId, strength, preserve, influences)`. It clones the input, applies only unchecked categories, and returns a serializable composition suitable for undo/redo and queued musical-boundary application.

Strength controls interpolation. Structural choices such as meter, step count, waveform, and scale mode switch only at 50% or more; numeric values interpolate continuously. Pattern generation is opt-in because notes and rhythm are preserved by default.

## Adding a style

1. Add one `defineStyle({...})` record to `STYLE_DEFINITIONS` with a unique kebab-case id.
2. Reuse `baseVoices` where practical and override only intentional traits.
3. Keep rhythmic positions in the canonical 0–15 motif; the generator expands them across longer patterns and ignores out-of-range positions in shorter ones.
4. Select an existing family, bounded synth values, a supported meter, and a supported step count.
5. Add or update tests to assert registry uniqueness, valid bounds, deterministic application, and notation round-tripping.
6. Update the Code guide only when adding a new capability; adding another data record should not require parser or UI changes.

Future style packs can use the same schema once import validation and trust/version policy are added. External packs should be treated as data, never executable code.
