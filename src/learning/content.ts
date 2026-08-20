export type LearningView = 'instrument' | 'sequence' | 'code'

export interface TutorialStep {
  id: string
  eyebrow: string
  title: string
  body: string
  detail: string
  selector: string
  view?: LearningView
  mobileDialog?: 'top' | 'bottom'
}

export interface CheatItem {
  term: string
  description: string
  example?: string
}

export interface CheatSection {
  id: string
  title: string
  intro: string
  items: CheatItem[]
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'wake', eyebrow: '01 · Wake the instrument', title: 'Begin with a gesture',
    body: 'Browser audio begins only when you choose Play, Enable audio, or a touch key.',
    detail: 'Play follows the arrangement from its first bar. Stop returns to step 01; Panic also releases every sounding voice.',
    selector: '.transport',
  },
  {
    id: 'styles', eyebrow: '02 · Choose a vocabulary', title: 'Styles are transformable recipes',
    body: 'Open Style Lab to explore broad synth traditions, blend an influence, and decide which parts of your project should remain untouched.',
    detail: 'A style can shape tempo, meter, voices, effects, and generated patterns. Preserve checkboxes make the transformation explicit and reversible.',
    selector: '.style-lab-launch',
  },
  {
    id: 'location', eyebrow: '03 · Choose a location', title: 'Select before you write',
    body: 'Choose a Chord or Bass cell. The outlined cell becomes the destination for notes you play next.',
    detail: 'The ruler adapts to the selected meter and pattern length. In /4 meters a beat reads 1, e, &, a; in /8 meters it reads 1, &.',
    selector: '.sequencer-scroll', view: 'sequence',
  },
  {
    id: 'notes', eyebrow: '04 · Give it a voice', title: 'Assign exact notes',
    body: 'Use the touch keys or A S D F G H J K. Pressing an assigned pitch again removes it.',
    detail: 'For chords, the Roman-numeral suggestions create scale-aware voicings. Length holds the note for several steps.',
    selector: '.touch-keyboard', view: 'instrument', mobileDialog: 'top',
  },
  {
    id: 'shape', eyebrow: '05 · Shape the material', title: 'Sound, Layers, Body, and Afterimage',
    body: 'Choose a voice patch or combine a Primary source with an optional Shadow. Then shape their shared filter, envelope, and channel level.',
    detail: 'Layer Character changes the synthesis tone. Veil adds chorus width; Fracture reduces digital detail; performance gestures remain unwritten.',
    selector: '.voice-tabs', view: 'instrument',
  },
  {
    id: 'patterns', eyebrow: '06 · Move beyond a loop', title: 'Patterns become a song',
    body: 'Patterns A–D are independent phrases. Append them to the Song strip, then select an occurrence to transform that repetition.',
    detail: 'Transpose pitched voices, mute a voice this time, or focus it on Primary or Shadow without changing the source pattern. The glowing cell shows what is sounding.',
    selector: '.pattern-toolbar', view: 'sequence',
  },
  {
    id: 'code', eyebrow: '07 · Hear the abstraction', title: 'The notation is the same music',
    body: 'Visual edits regenerate code. Valid code edits update the visual instrument at the next chosen musical boundary.',
    detail: 'Try 05=C4+Eb4+G4~4: step 05, a three-note chord, held for four steps. Invalid text never destroys the last playable scene.',
    selector: '.code-panel', view: 'code',
  },
  {
    id: 'keep', eyebrow: '08 · Preserve the signal', title: 'Save, exchange, and capture',
    body: 'Automatic recovery uses IndexedDB. Save named snapshots, exchange .violet files, capture a performance, or render the arrangement to WAV.',
    detail: 'Live capture preserves temporary gestures. Offline WAV reproduces deterministic chance and automation, then peak-normalizes the written arrangement.',
    selector: '.project-tools',
  },
]

export const cheatSections: CheatSection[] = [
  {
    id: 'timing', title: 'Timing & steps', intro: 'Patterns can hold 8–64 sixteenth-note steps and several meters.',
    items: [
      { term: 'Meter', description: 'Sets the beat grouping and transport emphasis.', example: 'meter: 7/8' },
      { term: 'Steps', description: 'Resizes every pattern. Accepted: 8, 12, 14, 16, 20, 24, 28, 32, or 64.', example: 'steps: 32' },
      { term: '/4 beat', description: 'Four sixteenth-note cells.', example: '1 · e · & · a' },
      { term: '/8 beat', description: 'Two sixteenth-note cells.', example: '1 · &' },
      { term: 'Swing', description: 'Delays alternating steps without moving the loop anchor.', example: 'swing: 0.14' },
      { term: 'Length', description: 'How many sixteenth-note steps a Chord or Bass event is held.' },
    ],
  },
  {
    id: 'notation', title: 'Notation', intro: 'Sparse assignments name musical positions explicitly.',
    items: [
      { term: 'Style', description: 'Name the primary production vocabulary.', example: 'style: witch-house' },
      { term: 'Influence', description: 'Blend a second style at a bounded amount.', example: 'influences: ambient=0.25' },
      { term: 'Single note', description: 'Place C4 at step 05.', example: 'notes A: 05=C4' },
      { term: 'Chord', description: 'Join pitches with +.', example: '05=C4+Eb4+G4' },
      { term: 'Held chord', description: 'Use ~ followed by a step length.', example: '05=C4+Eb4+G4~4' },
      { term: 'Bass', description: 'One pitch per assignment.', example: 'bass A: 01=C2~4' },
      { term: 'Pulse', description: 'List the steps that should strike.', example: 'pulse A: 01 05 09 13' },
      { term: 'Texture', description: 'List procedural-noise events.', example: 'texture A: 03 11' },
      { term: 'Chance', description: 'Probability that every event on a step plays.', example: 'chance A: 07=0.65' },
      { term: 'Ratchet', description: 'Repeat a step event from one to four times.', example: 'ratchet A: 15=3' },
      { term: 'Shift', description: 'Move one step earlier or later by a fraction of its duration.', example: 'shift A: 03=-0.08' },
      { term: 'Automation', description: 'Assign control points and Hold them or interpolate Linearly.', example: 'automate mask A linear: 01=1200 09=4200' },
      { term: 'Effect motion', description: 'Veil and Fracture can move smoothly within a pattern.', example: 'automate fracture A linear: 01=0.08 13=0.68' },
      { term: 'Silence', description: 'Use none when a sparse lane has no events.', example: 'pulse B: none' },
    ],
  },
  {
    id: 'styles', title: 'Styles', intro: 'Each style is a data-driven starting grammar, not a rulebook.',
    items: [
      { term: 'Witch house', description: 'Slow half-time weight, long minor harmony, cavernous space, damaged haze.', example: 'Veil Communion · 68 bpm' },
      { term: 'Darksynth', description: 'Driven saw motion, short envelopes, regular machine pulse, controlled pressure.', example: 'Midnight Vector · 112 bpm' },
      { term: 'Darkwave', description: 'Cold modulated width, minor chord movement, restrained drum-machine rhythm.', example: 'Cold Circuit · 104 bpm' },
      { term: 'Glitch', description: 'Short fragments, deterministic chance, irregular accents, reduced digital detail.', example: 'Fractured Broadcast · 136 bpm' },
      { term: 'Club', description: 'House, techno, acid, and trance recipes cover swing, resonance, glide, and longer patterns.' },
      { term: 'Breakbeat', description: 'Electro, drum & bass, and hip-hop recipes emphasize syncopation, sub movement, and ratchets.' },
      { term: 'Beyond genre', description: 'Ambient, Berlin School, synthpop, new wave, chiptune, industrial, and cinematic recipes broaden the palette.' },
      { term: 'Cross-pollinate', description: 'Blend one influence, then use preserve controls to keep the identity that matters.' },
    ],
  },
  {
    id: 'keys', title: 'Keyboard', intro: 'Shortcuts stay deliberately small and discoverable.',
    items: [
      { term: 'A S D F G H J K', description: 'Play and assign the eight visible touch keys.' },
      { term: 'Ctrl + Space', description: 'Open notation suggestions inside Code.' },
      { term: 'Ctrl/Cmd + Z', description: 'Undo text while the Code editor is focused.' },
      { term: 'Tab / Shift + Tab', description: 'Move through controls and sequencer cells.' },
      { term: 'Enter', description: 'Activate focused buttons; save a snapshot from its name field.' },
      { term: 'Escape', description: 'Close the tutorial, cheatsheet, or Style Lab.' },
    ],
  },
  {
    id: 'terms', title: 'Blacklight terms', intro: 'The fiction is always paired with the conventional synthesis idea.',
    items: [
      { term: 'Sound', description: 'A versioned voice patch copied into editable composition settings.' },
      { term: 'Primary', description: 'The required main synthesis layer.' },
      { term: 'Shadow', description: 'An optional second synthesis layer triggered by the same events.' },
      { term: 'Character', description: 'A bounded macro for the selected engine tone.' },
      { term: 'Body', description: 'ADSR envelope, velocity, and note duration.' },
      { term: 'Mask', description: 'Selectable low-, band-, or high-pass filter, cutoff, and resonance.' },
      { term: 'Memory', description: 'Delay, repetition, and retained fragments.' },
      { term: 'Veil', description: 'Stereo chorus and modulated width.' },
      { term: 'Fracture', description: 'Bit-depth reduction and digital erosion.' },
      { term: 'Ghost', description: 'Seeded probability for altered or unexpected events.' },
      { term: 'Environment', description: 'Generated reverb and spatial depth.' },
      { term: 'Overclock', description: 'Brightness, drive, activity, instability, and recovery.' },
    ],
  },
  {
    id: 'projects', title: 'Projects & capture', intro: 'Everything remains local unless you export it.',
    items: [
      { term: 'Recover', description: 'Restore the latest automatic IndexedDB save.' },
      { term: 'Snapshot', description: 'Store a named local version of the complete composition.' },
      { term: '.violet', description: 'Portable, human-readable project notation.' },
      { term: 'Capture', description: 'Record live output, including gestures and chance, to WebM.' },
      { term: 'WAV', description: 'Render the written arrangement as deterministic stereo PCM, peak-normalized to −1 dBFS.' },
    ],
  },
]
