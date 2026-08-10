# Timing model

Violet Signal uses two clocks for two different jobs:

- Tone Transport and the Web Audio clock schedule every note. This clock runs with audio-rate precision and schedules slightly ahead so the browser has time to prepare each event.
- Tone Draw publishes the active step and exhaustion indicators at the corresponding audio timestamp. It uses `requestAnimationFrame` internally, but keeps each frame tied to the Web Audio clock.

Using a raw animation frame as the sequencer would make the groove depend on display refresh rate, main-thread load, and whether the tab is visible. The draw scheduler gives the interface animation-frame updates without moving musical timing off the audio clock.

Humanization is deterministic and late-only. Step 1 in the interface (internal step zero) is always pinned to the transport grid, so timing variation cannot add a pause at the loop boundary. Steps 2–16 may move by at most 28 ms.
