# Violet Signal soundverse

Status: implemented 2026-08-10.

## Intent

Violet Signal's headline scenes are oriented toward a connected dark-electronic soundverse: witch house, darksynth, darkwave, and glitch. These remain starting grammars rather than rigid genre validators, while the broader registry now covers many synth traditions. See [`style-system.md`](style-system.md) for the extensible recipe architecture.

Everything remains synthesized or procedurally generated in the browser. No remote or copyrighted samples are required.

## Headline worlds

| World | Scene | Musical center | Production center |
| --- | --- | --- | --- |
| Witch house | **Veil Communion** | 68 BPM, half-time weight, long minor sonorities, sparse trap-like accents | cavernous Environment, heavy Memory, damaged haze, slow saw pad |
| Darksynth | **Midnight Vector** | 112 BPM, repeating minor arpeggio, regular bass propulsion, machine pulse | bright saw edges, short envelopes, controlled Overclock, restrained Fracture |
| Darkwave | **Cold Circuit** | 104 BPM, four-chord minor cycle, syncopated bass, drum-machine restraint | high Veil, moderate room and delay, cold triangle/square layering |
| Glitch | **Fractured Broadcast** | 136 BPM, asymmetric fragments, irregular accents, deterministic gaps | high Fracture and Ghost, short envelopes, white-noise shards, bounded timing instability |

The earlier Rain Behind Glass, Static Nerves, and Blues on a Black Moon scenes remain as additional darkwave/glitch hybrids.

## New shared effects

### Veil · chorus width

Veil maps one normalized value to a stereo chorus:

- wet mix: 0–52%;
- modulation rate: 0.18–0.9 Hz;
- depth: 0.18–0.86;
- delay time: 5–13 ms.

The dry signal always remains present. Higher values create cold width and unstable halos without turning every scene into an obvious chorus preset.

### Fracture · bit reduction

Fracture maps one normalized value to parallel bit reduction:

- wet mix: 0–70%;
- depth: 16 down to a protected minimum of 4 bits.

The bound preserves impact and limiter headroom while making digital erosion audible. It is not a destructive file conversion.

Both controls are serializable, undoable, editable in Code, automatable per pattern step, available in the visual Instrument, and shared by live playback and offline WAV rendering. Each voice also has a bounded send into Fracture, Veil, Memory, and Environment, allowing different depths while retaining one shared processor of each kind.

## Notation

```text
scene "Veil Communion" {
  style: witch-house
  veil: 0.46
  fracture: 0.18

  automate veil A: 01=0.46 09=0.62
  automate fracture A: 01=0.18 13=0.34
}
```

`style` accepts any id in the built-in registry. `world` remains a legacy alias. Editing the field directly is descriptive; applying a Style Lab recipe is the explicit operation that can transform musical settings.

## Beginner-facing rules

- Load a scene to hear a complete grammar before editing individual values.
- Change one family at a time: rhythm, harmony, envelope, space, or damage.
- Veil creates width; Environment creates depth. They are not interchangeable.
- Fracture changes digital texture; Overclock changes brightness, drive, density, and instability.
- Ghost is deterministic from the scene seed, so chance remains repeatable.
- Genre labels describe intent, not correctness. Hybrid scenes are expected.

## Data and compatibility

Older local projects receive safe defaults when cloned or restored: darkwave as the descriptive style, 4/4, sixteen steps, no Swing, low Veil, no Fracture, and conservative voice-expression values. Existing notes, voices, automation, and arrangements are preserved. Missing automation lanes are created as silent lanes.

## Maintenance

When adding a new scene, verify that it:

- round-trips through the DSL exactly;
- names one supported style;
- differs musically, not only by title;
- contains useful Veil and Fracture automation examples;
- remains below the hard −1 dB limiter with its intended Overclock range;
- renders through both live playback and offline WAV paths;
- has a concise beginner explanation in the cheatsheet when it introduces a new technique.
