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
    id: 'location', eyebrow: '02 · Choose a location', title: 'Select before you write',
    body: 'Choose a Chord or Bass cell. The outlined cell becomes the destination for notes you play next.',
    detail: 'Each bar has four beats. Every beat is divided into 1, e, &, a—sixteen steps altogether.',
    selector: '.sequencer-scroll', view: 'sequence',
  },
  {
    id: 'notes', eyebrow: '03 · Give it a voice', title: 'Assign exact notes',
    body: 'Use the touch keys or A S D F G H J K. Pressing an assigned pitch again removes it.',
    detail: 'For chords, the Roman-numeral suggestions create scale-aware voicings. Length holds the note for several steps.',
    selector: '.touch-keyboard', view: 'instrument', mobileDialog: 'top',
  },
  {
    id: 'shape', eyebrow: '04 · Shape the material', title: 'Core, Body, and Afterimage',
    body: 'Select a voice, then shape its oscillator, filter, envelope, and channel level. Shared effects place it inside a dark electronic world.',
    detail: 'Veil adds modulated chorus width; Fracture reduces digital detail. Overclock adds pressure, while performance gestures remain unwritten.',
    selector: '.voice-tabs', view: 'instrument',
  },
  {
    id: 'patterns', eyebrow: '05 · Move beyond a loop', title: 'Patterns become a song',
    body: 'Patterns A–D are independent bars. Copy, rotate, or transpose one, then append pattern letters to the Song strip.',
    detail: 'Clicking a Song cell removes that bar. The glowing cell and pattern dot show what the transport is sounding.',
    selector: '.pattern-toolbar', view: 'sequence',
  },
  {
    id: 'code', eyebrow: '06 · Hear the abstraction', title: 'The notation is the same music',
    body: 'Visual edits regenerate code. Valid code edits update the visual instrument at the next chosen musical boundary.',
    detail: 'Try 05=C4+Eb4+G4~4: step 05, a three-note chord, held for four steps. Invalid text never destroys the last playable scene.',
    selector: '.code-panel', view: 'code',
  },
  {
    id: 'keep', eyebrow: '07 · Preserve the signal', title: 'Save, exchange, and capture',
    body: 'Automatic recovery uses IndexedDB. Save named snapshots, exchange .violet files, capture a performance, or render the arrangement to WAV.',
    detail: 'Live capture preserves temporary gestures. Offline WAV reproduces deterministic chance and automation, then peak-normalizes the written arrangement.',
    selector: '.project-tools',
  },
]

export const cheatSections: CheatSection[] = [
  {
    id: 'timing', title: 'Timing & steps', intro: 'One pattern is one bar of sixteen sixteenth notes.',
    items: [
      { term: 'Beat 1', description: 'Steps 01–04', example: '1 · e · & · a' },
      { term: 'Beat 2', description: 'Steps 05–08', example: '1 · e · & · a' },
      { term: 'Beat 3', description: 'Steps 09–12', example: '1 · e · & · a' },
      { term: 'Beat 4', description: 'Steps 13–16', example: '1 · e · & · a' },
      { term: 'Length', description: 'How many sixteenth-note steps a Chord or Bass event is held.' },
    ],
  },
  {
    id: 'notation', title: 'Notation', intro: 'Sparse assignments name musical positions explicitly.',
    items: [
      { term: 'Sound world', description: 'Name the intended production vocabulary.', example: 'world: witch-house' },
      { term: 'Single note', description: 'Place C4 at step 05.', example: 'notes A: 05=C4' },
      { term: 'Chord', description: 'Join pitches with +.', example: '05=C4+Eb4+G4' },
      { term: 'Held chord', description: 'Use ~ followed by a step length.', example: '05=C4+Eb4+G4~4' },
      { term: 'Bass', description: 'One pitch per assignment.', example: 'bass A: 01=C2~4' },
      { term: 'Pulse', description: 'List the steps that should strike.', example: 'pulse A: 01 05 09 13' },
      { term: 'Texture', description: 'List procedural-noise events.', example: 'texture A: 03 11' },
      { term: 'Automation', description: 'Assign a control value at a step.', example: 'automate mask A: 01=1200 09=4200' },
      { term: 'Effect motion', description: 'Veil and Fracture can move within a pattern.', example: 'automate fracture A: 01=0.08 13=0.68' },
      { term: 'Silence', description: 'Use none when a sparse lane has no events.', example: 'pulse B: none' },
    ],
  },
  {
    id: 'worlds', title: 'Sound worlds', intro: 'Each world is a starting grammar, not a rulebook.',
    items: [
      { term: 'Witch house', description: 'Slow half-time weight, long minor harmony, cavernous space, damaged haze.', example: 'Veil Communion · 68 bpm' },
      { term: 'Darksynth', description: 'Driven saw motion, short envelopes, regular machine pulse, controlled pressure.', example: 'Midnight Vector · 112 bpm' },
      { term: 'Darkwave', description: 'Cold modulated width, minor chord movement, restrained drum-machine rhythm.', example: 'Cold Circuit · 104 bpm' },
      { term: 'Glitch', description: 'Short fragments, deterministic chance, irregular accents, reduced digital detail.', example: 'Fractured Broadcast · 136 bpm' },
      { term: 'Cross-pollinate', description: 'Load a world, then borrow one trait at a time—tempo, Veil, Fracture, rhythm, or envelope.' },
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
      { term: 'Escape', description: 'Close this tutorial or the cheatsheet.' },
    ],
  },
  {
    id: 'terms', title: 'Blacklight terms', intro: 'The fiction is always paired with the conventional synthesis idea.',
    items: [
      { term: 'Core', description: 'Oscillator or source waveform.' },
      { term: 'Body', description: 'ADSR envelope, velocity, and note duration.' },
      { term: 'Mask', description: 'Low-pass filter cutoff and tonal color.' },
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
