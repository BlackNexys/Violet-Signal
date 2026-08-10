# Blacklight interface style guide

Status: applied to the Violet Signal interface on 2026-08-10. This guide translates the supplied Blacklight references into product-interface rules; it does not prescribe literal character art, decorative Japanese text, or a full-screen cyberpunk illustration.

## Implementation record

The first system-wide pass applies the guide through:

- semantic canvas, surface, line, text, signal, data, warning, and danger tokens in `src/styles.css`;
- a three-register hierarchy using serif identity, legible sans-serif controls, and monospaced data/notation;
- a quieter broadcast-desk shell with project/status rails kept subordinate to the active workspace;
- calibrated Instrument modules, a luminous Sequence matrix, and an opaque dossier-like Code score;
- separate written, selected, sounding, queued, recording, warning, and error treatments;
- code-native material details—subtle scanlines, inner highlights, signal bloom, and edge indexing—with no illustrative background;
- responsive touch sizing, 320px reflow, reduced-motion behavior, increased-contrast overrides, and color-independent state cues;
- explicit tutorial shade, spotlight, and dialog layers so contextual glass never obscures instruction.

## Design thesis: haunted precision

Violet Signal should feel like an intimate musical instrument recovered from a nocturnal future: technically exact, emotionally charged, and visibly used. The interface is quiet until music, focus, or danger creates light.

The reference set repeatedly combines:

- near-black rooms and rain-dark cities with concentrated violet illumination;
- human warmth against cold institutional systems;
- translucent evidence panes, broadcast equipment, dossiers, and marginal metadata;
- delicate organic marks—especially an orchid or flower—inside mechanical frames;
- grain, rain, glass, scanlines, and imperfect physical surfaces;
- occasional red or amber rupture against the dominant violet night.

The product translation is **an instrument first, an artifact second**. Atmosphere should reinforce hierarchy and musical state. It must never compete with note entry, code editing, or playback.

## Core principles

### 1. The field is dark; state creates light

Most of the interface stays near-black. Violet is not a general brand fill: it identifies the current signal—selection, playback, focus, valid synchronization, or an explicitly active control.

Use a rough 72/20/6/2 balance:

- 72% canvas and negative space;
- 20% surfaces and structural lines;
- 6% violet signal and warm-white information;
- at most 2% warning red, amber, or human warmth.

If everything glows, nothing is sounding.

### 2. One clear task, peripheral evidence

The references have a strong central subject surrounded by small dossiers and telemetry. Each workspace should follow the same hierarchy:

- one dominant task surface;
- a small number of supporting controls nearby;
- low-contrast metadata at the perimeter;
- advanced evidence available on demand.

The sequencer, instrument, or editor is the subject. Status text, project tools, and diagnostics are the dossier—not competing cards of equal importance.

### 3. Mechanical shells, organic signal

Structure should feel engineered: thin rules, aligned rails, square or lightly rounded panels, indexed labels, and exact spacing. Musical activity may feel organic: a soft bloom, waveform, pulse, or orchid-like mark.

Use the flower/signal motif as a signature, not wallpaper. Good placements are the product mark, an empty state, and a rare completion moment. Avoid repeating it on every panel.

### 4. Glass is contextual, not universal

Translucency belongs to temporary or interpretive layers: tutorials, code-to-control connections, queued changes, capture state, and floating status. Primary editing surfaces should remain substantially opaque for legibility.

Glass should mean “information laid over the instrument,” not simply “premium-looking card.”

### 5. Warmth carries human meaning

Warm amber, copper, or restrained red should appear when the interface becomes human or consequential:

- amber: caution, saturation, pending work, or recoverable friction;
- red: destructive action, clipping, recording, or broken/unsafe state;
- warm low light: editorial or narrative moments, never routine chrome.

Red must not be a second everyday accent. It is a rupture in the violet system.

### 6. Fiction always has a plain-language handrail

Blacklight vocabulary creates character, while conventional labels preserve trust. Continue pairing terms such as **Mask · filter cutoff** and **Memory · delay**. Status messages should be calm, specific, and actionable rather than cryptic.

### 7. Materiality without visual debris

The images feel physical through rain, scratched glass, bloom, scanlines, and worn devices. In the app, express that with extremely subtle background grain, inner highlights, and occasional scanline texture at large scale.

Texture must disappear beneath text and controls. Never apply noise directly behind code, small labels, note names, or validation feedback.

### 8. Motion follows music or intent

Motion should explain change:

- the playhead advances with the transport;
- selection light travels between linked representations;
- queued code resolves at its chosen boundary;
- recording and overload states pulse deliberately;
- panels enter only when the user changes workspace.

Avoid ambient glitch loops, drifting decoration, flicker, or constant bloom. Reduced-motion mode should retain state changes without travel, flicker, or scale animation.

## Visual foundations

### Semantic palette

These values are a target system for implementation, not a requirement to replace every color in one mechanical sweep.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#07070c` | page background and deepest void |
| `ink` | `#0c0a12` | main application shell |
| `surface` | `#12101a` | primary work surfaces |
| `surface-raised` | `#191423` | selected sections and floating controls |
| `surface-glass` | `rgba(28, 20, 40, .82)` | contextual overlays only |
| `line-soft` | `#282132` | routine dividers |
| `line-strong` | `#514064` | focus-adjacent structure |
| `text` | `#f1eaf0` | primary copy and note names |
| `text-muted` | `#aaa0af` | secondary labels |
| `text-dim` | `#776d7c` | metadata that is not required to act |
| `violet` | `#9668f0` | selected/active foundation |
| `signal` | `#d58cff` | live sound, current step, strong focus |
| `signal-soft` | `#e9c4ff` | high-emphasis signal text and highlights |
| `data-cool` | `#78c8df` | rare code/data linkage, never general decoration |
| `amber` | `#d99a62` | warning, pressure, pending state |
| `danger` | `#e65062` | destructive, clipping, failure, recording accent |
| `human-warmth` | `#f0a06a` | rare narrative warmth; not a control-state color |

Rules:

- Warm-white text replaces pure white.
- Violet communicates normal activation; red never does.
- Cyan is a supporting data color and should occupy less area than violet.
- Gradients may create depth inside a surface but should not become button decoration.
- Bloom belongs only to a small live indicator or the current musical target.

### Typography: three registers

1. **Display / identity** — a high-contrast serif for the product name, scene title, and rare ceremonial moments. It provides the editorial intimacy visible in the references. Keep it out of dense controls.
2. **Interface / instruction** — a neutral, highly legible sans serif for buttons, explanations, parameter names, and tutorial copy.
3. **Data / notation** — a monospaced face for step numbers, code, time, values, IDs, and peripheral telemetry.

Type rules:

- Use size, spacing, and weight before using brighter color.
- Uppercase plus tracking is reserved for short eyebrows, status, and coordinates—not paragraphs.
- Core body copy should be at least 14px; control labels at least 12px; peripheral metadata may reach 11px when contrast is strong.
- Do not use distressed or pseudo-futuristic display fonts for editable data.
- Avoid extremely wide letter spacing in long labels; it slows scanning.

### Shape and framing

- Default radii: 2px for data cells, 4px for controls, 8px for overlays.
- Pills are for compact status only, not ordinary buttons or navigation.
- Borders are usually one pixel and low contrast. Active borders gain color before gaining thickness.
- A raised surface may use one inner top highlight and one deep shadow. Avoid stacks of glossy effects.
- Sparse crop marks, indexes, or rail labels may frame major workspaces, but never all components at once.

### Spacing and density

Use a 4px base rhythm with practical steps of 4, 8, 12, 16, 24, and 32px. Dense musical data may be compact, but primary actions and explanations need air.

On desktop, let negative space clarify the three-workspace relationship. On narrow screens, show one console at a time and preserve the global transport and status before secondary tools.

## Component translation

### Application shell

Treat the shell like a quiet broadcast desk. The top region owns identity, scene, transport, and the two most important global values. Project administration should feel secondary and may collapse into a drawer or overflow group on smaller widths.

One very subtle atmospheric layer may live behind the shell. Do not place a character, skyline, or high-contrast illustration behind the working UI.

### Transport

The transport is the physical heart of the device. Play should be the clearest solid control. Stop, record, and panic need distinct shapes or icons as well as colors. Audio state can use a restrained lamp-like bloom.

### Sequencer

The grid should read as a luminous matrix:

- beats form the strongest grouping;
- subdivisions remain visible but subordinate;
- the selected destination has a precise outline;
- the sounding step uses the brightest narrow signal;
- assigned events use filled, voice-specific material without creating four unrelated palettes.

The user should be able to distinguish selection, written content, and currently sounding content without relying on hue alone.

### Instrument

Controls should resemble calibrated sections of one machine, not individual SaaS cards. Voice selection may use indexed module labels. Parameter values belong in monospaced readouts. Reserve bloom for active audition, solo, or overload—not every slider thumb.

### Code

Treat code as a score inside an evidence viewer: opaque editor surface, disciplined line numbers, a clear active line, and low-contrast marginal status. The linked musical token may share the same signal treatment as its sequencer event.

Errors use amber for recoverable syntax guidance and red only when an action is genuinely blocked or destructive. Never introduce decorative scanlines that compromise character recognition.

### Tutorials, cheatsheets, and dialogs

These are the best place for contextual glass. Keep the copy surface dark enough to meet contrast targets. A tutorial spotlight should reveal one real control while the rest of the instrument recedes; it should not turn the target into an uncontrolled neon bloom.

### Status and feedback

Feedback has three layers:

- immediate: control state, focus, or current step;
- local: a concise message beside the affected workspace;
- persistent: project/audio health in the perimeter status area.

Do not surface the same status in all three layers unless it is safety-critical.

## Language and iconography

Voice: intimate, exact, and calm. Prefer “Choose a step, then play a note” over “Input event payload.” A slight haunted tone belongs in scene names and flavor copy, not error recovery.

Icons should be thin, geometric, and familiar at control scale. Pair unfamiliar icons with labels. Custom motifs should derive from an orchid, waveform, aperture, or divided signal line; use them sparingly and with consistent stroke weight.

Do not import Japanese characters from the references as decoration. Use another language only when it contains real, reviewed content and has an accessible translation.

## Accessibility is part of the atmosphere

- Meet WCAG AA contrast for all instructional text and interactive states.
- Never communicate playback, selection, errors, mute, or solo by color alone.
- Keep a visible two-pixel focus treatment with adequate offset.
- Target at least 44×44px on touch layouts; dense desktop cells still need a reliable keyboard focus state.
- Preserve zoom and reflow down to 320px.
- Grain, transparency, and glow must not reduce code or note legibility.
- No rapid glitch, flash, or luminance flicker. Honor `prefers-reduced-motion` and `prefers-contrast` where supported.

## Explicit anti-patterns

- Neon violet on every border, label, and icon.
- Full-screen character or city artwork underneath the instrument.
- Fake terminal jargon where a beginner needs a musical instruction.
- Arbitrary Japanese typography, barcode clutter, or dossier stamps without product meaning.
- Constant scanlines, chromatic aberration, glitch, or rain animation.
- Glass on every panel.
- Rounded, floating cards with equal visual weight.
- Tiny low-contrast labels used for essential actions.
- Red and violet competing as everyday brand colors.
- An ornamental design change that makes note assignment or code editing harder to understand.

## Recommended application sequence

1. **Foundation** — introduce semantic color, type, radius, spacing, glow, and motion tokens; raise essential text sizes and contrast.
2. **Hierarchy** — simplify the shell into one task plus peripheral evidence; clarify global versus workspace tools.
3. **State language** — standardize focus, hover, selected, sounding, queued, recording, warning, error, mute, and solo states.
4. **Core workspaces** — restyle the sequencer as the luminous matrix, the instrument as calibrated modules, and code as an evidence/score viewer.
5. **Signature details** — refine the signal/orchid mark and add restrained material texture and musically driven motion.
6. **Responsive and accessibility QA** — verify 320px reflow, touch targets, contrast, zoom, reduced motion, keyboard use, and color-independent state recognition.

## Review checklist

A visual change belongs in Violet Signal when all of these remain true:

- The primary musical task is obvious within a few seconds.
- Live, selected, written, pending, and error states remain distinct.
- Signal color is concentrated rather than ambient.
- The interface feels material and intimate without becoming illustrative.
- The thematic term has a conventional explanation where needed.
- Essential copy and controls remain legible, keyboard-accessible, and usable on narrow screens.
- Removing the atmospheric effect would not change the underlying information hierarchy.
