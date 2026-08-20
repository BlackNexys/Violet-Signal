# Timing model

Violet Signal uses two clocks for two different jobs:

- Tone Transport and the Web Audio clock schedule every note. This clock runs with audio-rate precision and schedules slightly ahead so the browser has time to prepare each event.
- Tone Draw publishes the active step and exhaustion indicators at the corresponding audio timestamp. It uses `requestAnimationFrame` internally, but keeps each frame tied to the Web Audio clock.

Using a raw animation frame as the sequencer would make the groove depend on display refresh rate, main-thread load, and whether the tab is visible. The draw scheduler gives the interface animation-frame updates without moving musical timing off the audio clock.

Each event begins from the sixteenth-note Web Audio grid, then receives three bounded offsets: deterministic Humanize, global Swing on alternating cells, and the selected step's Micro Shift. Negative shifts may pull an event slightly early; positive shifts move it late. The combined result is clamped to stay inside the surrounding step window.

Step 1 in the interface (internal step zero) is always pinned exactly to the transport grid, so no timing control can add a pause at the loop boundary. This remains true for every supported 8–64-step pattern length.

Meter changes musical grouping rather than the base cell duration. `/4` meters group four sixteenth cells per beat; `/8` meters group two. The live transport uses that grouping for beat-boundary code application and pulse accents. Pattern boundaries remain the safest point for structural changes such as meter or length.

Ratchets divide one cell into one to four evenly scheduled sub-events. Chance uses the same seeded resolver in live and offline playback, so it does not drift between a browser performance and WAV export.

Chord and Bass `>` ties are evaluated on the same step clock and can cross a pattern or occurrence boundary. A valid chain changes pitch at the next event's deterministic shifted timestamp. A rest, failed Chance, mute, Ghost substitution, or ratchet breaks the held lifecycle at that boundary before another event can trigger, preventing stale releases from cutting off later micro-shifted notes.
