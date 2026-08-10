# Configuring the Violet Signal Code section

This guide is a configuration reference for both human musicians and AI assistants. Violet Signal's Code section uses a small declarative music language—it does **not** execute JavaScript or general-purpose code.

The safest editing rule is simple: start with the complete scene currently shown in Code, preserve its structure, and change only the values or musical events you intend to change.

## Quick workflow

1. Open **Code** and use the existing generated scene as the source of truth.
2. If playback is running, choose when valid edits should apply: **next step**, **next beat**, or **next bar**. Next bar is the least surprising choice for structural changes.
3. Change one section at a time.
4. Check the status immediately above the editor:
   - **Signal in tune** means the draft is valid and active.
   - **Queued** means the valid draft will become active at the selected musical boundary.
   - A red **Line …** message means the draft is invalid. Click it to navigate to the problem.
5. Use **Format** to return the latest valid or queued composition to canonical formatting. This is also a quick way to discard an invalid draft.
6. Press **Ctrl + Space** in the editor to open suggestions.

Visual controls and Code represent the same composition. Visual changes rewrite the Code section; valid code changes update the visual controls and sequencer.

> Important: every valid draft is parsed into a fresh composition. Removing a line does not preserve the old value—it allows that field to return to its default. Preserve the complete generated scene when editing an existing project.

## The shape of a scene

A scene begins with a quoted name, contains `control: value` lines, and ends with a closing brace on its own line.

```text
scene "Your Scene Name" {
  world: darkwave
  tempo: 104
  seed: 712
  scale: C minor
  lock: on
  patterns: A B C D
  active: A
  arrangement: A A B C

  // Voice, effect, pattern, and automation lines go here.
}
```

Indentation is optional but recommended. Blank lines are allowed. Comments must occupy their own line and begin with `//`; inline comments are not supported. Unknown controls are rejected instead of being ignored.

## How steps map to beats

Every pattern is one 4/4 bar divided into sixteen sixteenth-note steps.

| Beat | Step numbers | Count |
| --- | --- | --- |
| 1 | `01 02 03 04` | `1 e & a` |
| 2 | `05 06 07 08` | `2 e & a` |
| 3 | `09 10 11 12` | `3 e & a` |
| 4 | `13 14 15 16` | `4 e & a` |

For example, steps `01 05 09 13` are the four quarter-note downbeats. Steps `03 07 11 15` are their offbeat eighth notes.

## Global configuration

| Control | Accepted value | Meaning |
| --- | --- | --- |
| `world` | `witch-house`, `darksynth`, `darkwave`, or `glitch` | Descriptive sound-world identity. It does not overwrite the other controls. |
| `tempo` | `40`–`220` | Beats per minute. |
| `seed` | Whole number `0`–`2147483647` | Makes Ghost and other chance behavior repeatable. |
| `scale` | Root plus `minor` or `major`, such as `C minor` or `F# major` | Scale used by scale-aware visual tools. |
| `lock` | `on` or `off` | Enables or disables scale locking in the visual instrument. |
| `patterns` | `A B C D` exactly once each | Declares the four available patterns. Keep this line unchanged. |
| `active` | `A`, `B`, `C`, or `D` | Pattern shown for editing. The arrangement decides what playback sounds. |
| `arrangement` | Between 1 and 16 pattern letters | Bar order, for example `A A B C A D`. |
| `output` | `-36`–`-6` | Master level before final limiting and WAV normalization. Start near `-12`. |

Use integer seeds when asking an AI for variations. Reusing the same seed keeps probabilistic details deterministic.

WAV export reproduces the written gain staging and effects, then peak-normalizes the completed file to `−1 dBFS`. The `output` value still changes how strongly the signal reaches the drive/limiter stages, but it no longer leaves an otherwise healthy export unnecessarily quiet. Peak normalization is not commercial loudness mastering.

## Voice configuration

There are four voices: `chords`, `bass`, `pulse`, and `texture`. A voice line begins with its waveform and then uses space-separated `setting=value` tokens.

```text
voice chords: triangle volume=-10 cutoff=2600 attack=0.08 decay=0.5 sustain=0.62 release=1.8 mute=off solo=off
voice bass: sawtooth volume=-9 cutoff=780 attack=0.01 decay=0.28 sustain=0.48 release=0.65 mute=off solo=off
voice pulse: sine volume=-16 cutoff=2100 attack=0.005 decay=0.09 sustain=0 release=0.06 mute=off solo=off
voice texture: square volume=-23 cutoff=1500 attack=0.08 decay=0.6 sustain=0.12 release=1.8 mute=off solo=off
```

| Setting | Accepted value | Meaning |
| --- | --- | --- |
| First token | `sine`, `triangle`, `square`, or `sawtooth` | Oscillator core. Texture maps these choices to procedural noise colors. |
| `volume` | `-36`–`-4` | Voice level in dB. |
| `cutoff` | `80`–`12000` | Low-pass filter cutoff in Hz. Lower values are darker. |
| `attack` | `0.005`–`2` | Fade-in time in seconds. |
| `decay` | `0.02`–`3` | Time from the attack peak to sustain. |
| `sustain` | `0`–`1` | Held amplitude. |
| `release` | `0.03`–`5` | Fade-out time after release. |
| `mute` | `on` or `off` | Silences this voice. |
| `solo` | `on` or `off` | Silences every voice that is not soloed. |

Long attacks can make a correctly timed note feel late. For sharp pulse or bass events, keep attack near `0.005`–`0.03`. Longer chord and texture attacks are useful for pads.

## Shared sound controls

```text
memory: 0.3
environment: 0.35
veil: 0.55
fracture: 0.08
ghost: 0.12
humanize: 0.025
overclock: 0.1
output: -12
```

| Control | Range | Conventional meaning |
| --- | --- | --- |
| `memory` | `0`–`1` | Delay amount and feedback. |
| `environment` | `0`–`1` | Generated reverb and spatial depth. |
| `veil` | `0`–`1` | Chorus width and modulation. |
| `fracture` | `0`–`1` | Bit-depth reduction and digital erosion. |
| `ghost` | `0`–`1` | Seeded probability of altered or unexpected events. |
| `humanize` | `0`–`0.2` | Deterministic timing variation. The first step remains locked to the loop grid. |
| `overclock` | `0`–`1` | Combined brightness, drive, activity, and instability. Sustained extremes trigger recovery. |

For controlled results, change one of these controls at a time. High Memory or Environment can make one bar overlap the next; that is an effect tail, not a transport delay.

## Writing notes and chords

Chord and bass lanes use sparse `step=value` assignments.

```text
notes A: 01=C4+Eb4+G4~4 09=Ab3+C4+Eb4~4
bass A: 01=C2~4 09=Ab1~4
```

- `01=` places the event at step 01.
- Join chord pitches with `+`.
- Add `~1`, `~2`, `~3`, `~4`, or `~8` to hold the event for that many steps.
- Without `~length`, the event lasts one step.
- Bass accepts one pitch per assignment; chords accept one or more pitches.
- Note names use an uppercase letter, an optional `#` or `b`, and an octave: `C4`, `Eb4`, `F#3`.
- Use `none` for an empty lane.

Assignments on the same line are separated by spaces. Do not use commas.

## Writing Pulse, Texture, and emphasis

Pulse and Texture list hit positions directly:

```text
pulse A: 01 05 09 13
texture A: 04 12
emphasis A: 01=0.92 05=0.62 09=0.84 13=0.58
```

- `pulse` triggers the percussion voice.
- `texture` triggers a procedural-noise event.
- `emphasis` sets step velocity from `0.1` to `1`.
- Steps without an emphasis assignment use the default `0.72`.
- An empty lane is written as `pulse B: none`, not as a blank value.

## Step automation

Automation uses `automate control pattern: step=value`.

```text
automate mask A: 01=1100 05=2400 09=4200 13=1700
automate memory A: 01=0.18 13=0.52
automate veil A: 01=0.35 09=0.72
automate fracture A: 01=0.04 15=0.55
automate ghost A: 01=0.08 13=0.28
automate overclock A: 01=0.05 09=0.32
```

Automation is held from its latest point until another point changes it, including across the loop boundary. `mask` accepts `80`–`12000`; Memory, Veil, Fracture, Ghost, and Overclock accept `0`–`1`. Use `none` when a lane has no automation.

Automation note lengths are not meaningful. Write `09=0.72`, not `09=0.72~4`.

## A compact valid example

This scene can be pasted directly into the Code section:

```text
scene "Neon Séance" {
  world: witch-house
  tempo: 72
  seed: 1999
  scale: C minor
  lock: on
  patterns: A B C D
  active: A
  arrangement: A A B A
  voice chords: triangle volume=-11 cutoff=2100 attack=0.12 decay=0.7 sustain=0.66 release=2.4 mute=off solo=off
  voice bass: sawtooth volume=-10 cutoff=680 attack=0.012 decay=0.35 sustain=0.5 release=0.8 mute=off solo=off
  voice pulse: sine volume=-17 cutoff=1900 attack=0.005 decay=0.1 sustain=0 release=0.06 mute=off solo=off
  voice texture: triangle volume=-24 cutoff=1300 attack=0.1 decay=0.7 sustain=0.1 release=2 mute=off solo=off
  memory: 0.48
  environment: 0.62
  veil: 0.52
  fracture: 0.12
  ghost: 0.18
  humanize: 0.035
  overclock: 0.08
  output: -12

  notes A: 01=C4+Eb4+G4~8 09=Ab3+C4+Eb4~8
  bass A: 01=C2~4 09=Ab1~4
  pulse A: 01 07 09 15
  texture A: 04 12
  emphasis A: 01=0.9 09=0.82
  automate mask A: 01=1600 09=2600
  automate memory A: none
  automate veil A: 01=0.42 09=0.66
  automate fracture A: 01=0.08 13=0.22
  automate ghost A: none
  automate overclock A: none

  notes B: 01=F3+Ab3+C4~4 05=G3+Bb3+D4~4 09=Ab3+C4+Eb4~8
  bass B: 01=F1~4 05=G1~4 09=Ab1~8
  pulse B: 01 05 09 13
  texture B: 03 11
  emphasis B: 01=0.88 09=0.84
  automate mask B: 01=1900 09=3300
  automate memory B: none
  automate veil B: none
  automate fracture B: 13=0.28
  automate ghost B: none
  automate overclock B: none

  notes C: none
  bass C: none
  pulse C: none
  texture C: none
  emphasis C: none
  automate mask C: none
  automate memory C: none
  automate veil C: none
  automate fracture C: none
  automate ghost C: none
  automate overclock C: none

  notes D: none
  bass D: none
  pulse D: none
  texture D: none
  emphasis D: none
  automate mask D: none
  automate memory D: none
  automate veil D: none
  automate fracture D: none
  automate ghost D: none
  automate overclock D: none
}
```

## Starting values for the four sound worlds

These are creative starting points, not parser requirements.

| World | Suggested direction |
| --- | --- |
| Witch house | `60`–`82` BPM, long chord releases, half-time Pulse, high Environment and Memory, moderate Veil, restrained Fracture. |
| Darksynth | `100`–`140` BPM, saw bass, short attack, brighter cutoff, regular Pulse, moderate Overclock and low-to-medium Environment. |
| Darkwave | `85`–`120` BPM, minor chord movement, triangle or saw cores, medium-to-high Veil, controlled Pulse, moderate reverb. |
| Glitch | `110`–`180` BPM, short events, irregular Pulse and Texture positions, automated Fracture, moderate Ghost, and bounded Humanize. |

## Common errors

| Error | Fix |
| --- | --- |
| `Step 17 is outside this 16-step bar` | Use only `01` through `16`. |
| `needs the form 05=value` | Note, bass, emphasis, and automation tokens need `step=value`. |
| `is not a step from 01 to 16` | Pulse and Texture use bare step numbers such as `01 05 09 13`. |
| `is not a note I recognize` | Use `C4`, `Eb4`, or `F#3`; keep the note letter uppercase. |
| `Note length can be…` | Use only `~1`, `~2`, `~3`, `~4`, or `~8`. |
| `understands on or off` | Boolean settings do not accept `true`, `false`, `yes`, or `no`. |
| `is not a voice setting` | Use only waveform, volume, cutoff, ADSR, mute, and solo settings. |
| `not a control in this instrument` | Remove the unknown key or translate it to a supported control. |
| `scene needs a closing }` | Put one `}` on its own final line. |

If a note sounds late even though its step is correct, check the voice `attack`, long Memory/Environment tails, and Humanize before changing its step number.

## Instructions for an AI assistant

Give the assistant the current complete scene, this guide, and a musical goal. A reliable instruction is:

```text
Edit this Violet Signal scene to meet the musical request below.

Return one complete valid Violet Signal scene and no explanation or Markdown fence.
Preserve all four patterns and every existing line unless the request requires a change.
Use only controls and ranges from CODE_SECTION_GUIDE.md.
Keep steps between 01 and 16, note lengths in 1/2/3/4/8, and the arrangement between 1 and 16 bars.
Do not output JavaScript, JSON, YAML, or invented controls.
Prefer changing a small number of intentional parameters over randomizing everything.

Musical request: [describe the desired change]
Current scene:
[paste the complete Code section here]
```

For a variation rather than a replacement, also say which elements must remain fixed—for example: “keep tempo, harmony, and arrangement; vary only Pulse, Texture, and Fracture automation.” This makes AI-generated edits easier to compare and undo.

## Machine-readable constraint summary

```text
header        = scene "NAME" {
world         = witch-house | darksynth | darkwave | glitch
tempo         = number 40..220
seed          = integer 0..2147483647
scale         = NOTE_ROOT (minor | major)
lock          = on | off
patterns      = A B C D
active        = A | B | C | D
arrangement   = 1..16 values from A | B | C | D
waveform      = sine | triangle | square | sawtooth
note_event    = STEP=NOTE[+NOTE...][~LENGTH]
bass_event    = STEP=NOTE[~LENGTH]
STEP          = 01..16
LENGTH        = 1 | 2 | 3 | 4 | 8
hit_lane      = STEP [STEP...] | none
emphasis      = STEP=number(0.1..1) [...] | none
automation    = STEP=value [...] | none
mask_value    = 80..12000
effect_value  = 0..1
humanize      = 0..0.2
output        = -36..-6
footer        = }
```

When in doubt, make the smallest valid edit, preserve the current structure, and let Violet Signal's error message identify the first incompatible line.
