# Built-in learning system

## Purpose

Violet Signal should teach its own musical model without separating learning from making music. The tutorial therefore points to real controls and switches to the relevant Instrument, Sequence, or Code view. The cheatsheet remains available as a compact reference after the walkthrough is complete.

## Tutorial sequence

1. Wake browser audio through an explicit gesture.
2. Understand four beats and sixteen `1 e & a` steps.
3. Assign exact notes from the touch/computer keyboard.
4. Shape independent voices and the Memory, Environment, Veil, Fracture, Ghost, and Overclock system.
5. Transform patterns and build the arrangement.
6. Read and edit the equivalent safe notation.
7. Recover, snapshot, exchange, and capture work.

Completion is stored locally under `violet-signal:tutorial-complete`. It only affects the unread indicator; the tutorial can always be replayed.

## Interaction decisions

- Tutorial steps highlight the actual interface element rather than an illustration of it.
- On narrow screens, a step selects the relevant workspace tab before highlighting its target.
- The tutorial is explanatory rather than destructive: progressing never changes the composition.
- Escape closes either learning surface.
- Tutorial targets jump directly into view so the lesson and spotlight never drift out of sync.
- Parser notation in the cheatsheet uses the same sparse syntax accepted by the application.

## Maintenance

When a workflow, shortcut, DSL form, sound world, or Blacklight term changes, update `src/learning/content.ts`, its focused tests, `notes/soundverse.md`, and the relevant README section together. Browser smoke coverage verifies that both learning surfaces open and that contextual highlighting works.
