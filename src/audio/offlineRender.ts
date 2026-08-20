import * as Tone from 'tone'
import { clamp, getPattern, stepsPerBeat, type Composition } from '../model/composition'
import { occurrenceAllowsVoice, occurrenceLayerSelection, resolveArrangementOccurrence, transposeOccurrenceNote, transposeOccurrenceNotes } from '../model/arrangement'
import { measurePeak, peakNormalizationGain } from './normalization'
import { mapOverclock } from './overclock'
import { advanceFatigue, resolveSequencerStep, type FatigueState } from './sequencing'
import { delayFeedback, delayWet, INPUT_GAIN, LIMITER_CEILING_DB, masterOutputDb, reverbWet } from './signalPath'
import { mapFracture, mapVeil } from './soundverse'
import { LayeredVoiceSource } from './instrumentSource'

function encodeWav(buffer: AudioBuffer, gain: number): Blob {
  const channels = Math.min(2, buffer.numberOfChannels)
  const frameCount = buffer.length
  const bytesPerSample = 2
  const dataLength = frameCount * channels * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)
  const writeText = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, dataLength, true)
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel))
  let offset = 44
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] * gain))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

export async function renderCompositionToWav(composition: Composition): Promise<Blob> {
  const secondsPerStep = 60 / composition.bpm / 4
  const totalSteps = composition.arrangement.reduce((sum, occurrence) => sum + getPattern(composition, occurrence.pattern).steps.length, 0)
  const duration = totalSteps * secondsPerStep + 4
  const rendered = await Tone.Offline(async () => {
    const mapped = mapOverclock(composition.sound.overclock)
    const limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
    const master = new Tone.Volume(masterOutputDb(composition.masterVolume, mapped.outputTrimDb)).connect(limiter)
    const reverb = new Tone.Reverb({ decay: 3.2, preDelay: 0.035, wet: reverbWet(composition.sound.environment) }).connect(master)
    const delay = new Tone.FeedbackDelay({ delayTime: secondsPerStep * 3, feedback: delayFeedback(composition.sound.memory), wet: delayWet(composition.sound.memory) }).connect(reverb)
    const veil = mapVeil(composition.sound.veil)
    const fracture = mapFracture(composition.sound.fracture)
    const chorus = new Tone.Chorus({ frequency: veil.frequency, delayTime: veil.delayTime, depth: veil.depth, spread: 180, wet: veil.wet }).start().connect(delay)
    const crusher = new Tone.BitCrusher(fracture.bits).connect(chorus)
    crusher.wet.value = fracture.wet
    const drive = new Tone.Distortion({ distortion: mapped.drive, oversample: '2x' }).connect(crusher)
    const input = new Tone.Gain(INPUT_GAIN).connect(drive)
    await reverb.ready
    const chordVoice = composition.voices.chords
    const chordVolume = new Tone.Volume(chordVoice.volume).connect(input)
    const chordFilter = new Tone.Filter({ frequency: chordVoice.cutoff, type: chordVoice.filterType, rolloff: -24, Q: chordVoice.resonance }).connect(chordVolume)
    const chords = new LayeredVoiceSource('chords', chordFilter, chordVoice, { envelopeScale: mapped.envelopeScale, pitchDriftCents: mapped.pitchDriftCents })
    const bassVoice = composition.voices.bass
    const bassVolume = new Tone.Volume(bassVoice.volume).connect(input)
    const bassFilter = new Tone.Filter({ frequency: bassVoice.cutoff, type: bassVoice.filterType, rolloff: -24, Q: bassVoice.resonance }).connect(bassVolume)
    const bass = new LayeredVoiceSource('bass', bassFilter, bassVoice)
    const pulseVoice = composition.voices.pulse
    const pulseVolume = new Tone.Volume(pulseVoice.volume).connect(input)
    const pulseFilter = new Tone.Filter({ frequency: pulseVoice.cutoff, type: pulseVoice.filterType, rolloff: -24, Q: pulseVoice.resonance }).connect(pulseVolume)
    const pulse = new LayeredVoiceSource('pulse', pulseFilter, pulseVoice)
    const textureVoice = composition.voices.texture
    const textureVolume = new Tone.Volume(textureVoice.volume).connect(input)
    const textureFilter = new Tone.Filter({ frequency: textureVoice.cutoff, type: textureVoice.filterType, rolloff: -24, Q: textureVoice.resonance }).connect(textureVolume)
    const texture = new LayeredVoiceSource('texture', textureFilter, textureVoice)

    let lastChord = ['C4', 'Eb4', 'G4']
    let fatigue: FatigueState = { heat: 0, exhaustion: 0 }
    let stepCursor = 0
    composition.arrangement.forEach((_, bar) => {
      const { occurrence, pattern } = resolveArrangementOccurrence(composition, bar)
      pattern.steps.forEach((step, index) => {
        const time = (stepCursor + index) * secondsPerStep
        const resolved = resolveSequencerStep(composition, pattern, index, bar, fatigue.exhaustion, false, secondsPerStep)
        const automatedVeil = mapVeil(resolved.veil)
        const automatedFracture = mapFracture(resolved.fracture)
        const eventTime = time + resolved.timingOffset
        const ratchetSpacing = secondsPerStep / resolved.ratchets
        const triggerTimes = Array.from({ length: resolved.ratchets }, (_, ratchet) => eventTime + ratchet * ratchetSpacing)
        chordFilter.frequency.setValueAtTime(clamp(resolved.mask * resolved.mapped.brightness, 80, 12000), time)
        delay.wet.setValueAtTime(delayWet(resolved.memory), time)
        delay.feedback.setValueAtTime(delayFeedback(resolved.memory), time)
        chorus.wet.setValueAtTime(automatedVeil.wet, time)
        crusher.wet.setValueAtTime(automatedFracture.wet, time)
        crusher.bits.setValueAtTime(automatedFracture.bits, time)
        const chordAllowed = occurrenceAllowsVoice(composition, occurrence, 'chords')
        if (step.notes.length && resolved.shouldPlay && chordAllowed) lastChord = [...step.notes]
        if (resolved.shouldPlay && chordAllowed && (step.notes.length || resolved.isGhostChord)) {
          const chord = transposeOccurrenceNotes(step.notes.length ? step.notes : lastChord, occurrence)
          const intendedDuration = resolved.isGhostChord ? secondsPerStep * 0.45 : secondsPerStep * step.chordLength * 0.94
          const noteDuration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
          for (const triggerTime of triggerTimes) chords.trigger(chord, noteDuration, triggerTime, clamp(step.velocity * (resolved.isGhostChord ? 0.3 : 0.72), 0.08, 0.78), occurrenceLayerSelection(occurrence, 'chords'))
        }
        if (resolved.shouldPlay && step.bass && occurrenceAllowsVoice(composition, occurrence, 'bass')) {
          const intendedDuration = secondsPerStep * step.bassLength * 0.92
          const noteDuration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
          const bassNote = transposeOccurrenceNote(step.bass, occurrence)
          for (const triggerTime of triggerTimes) bass.trigger(bassNote, noteDuration, triggerTime, clamp(step.velocity * 0.72, 0.12, 0.72), occurrenceLayerSelection(occurrence, 'bass'))
        }
        if (resolved.shouldPlay && occurrenceAllowsVoice(composition, occurrence, 'pulse') && (step.drum || resolved.isGhostDrum)) {
          for (const triggerTime of triggerTimes) pulse.trigger(resolved.isGhostDrum ? 'C1' : index % stepsPerBeat(composition.meter) === 0 ? 'C1' : 'G1', Math.min(secondsPerStep * 0.5, ratchetSpacing * 0.72), triggerTime, clamp(step.velocity * (resolved.isGhostDrum ? 0.26 : 0.62), 0.08, 0.64), occurrenceLayerSelection(occurrence, 'pulse'))
        }
        if (resolved.shouldPlay && step.texture && occurrenceAllowsVoice(composition, occurrence, 'texture')) {
          for (const triggerTime of triggerTimes) texture.trigger(null, Math.min(secondsPerStep * 1.7, ratchetSpacing * 0.82), triggerTime, clamp(step.velocity * 0.28, 0.05, 0.28), occurrenceLayerSelection(occurrence, 'texture'))
        }
        fatigue = advanceFatigue(fatigue, resolved.overclock)
      })
      stepCursor += pattern.steps.length
    })
  }, duration, 2, 44_100)
  const audioBuffer = rendered.get()
  if (!audioBuffer) throw new Error('Offline render produced no audio buffer.')
  return encodeWav(audioBuffer, peakNormalizationGain(measurePeak(audioBuffer)))
}
