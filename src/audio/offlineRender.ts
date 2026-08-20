import * as Tone from 'tone'
import { clamp, getPattern, stepsPerBeat, type Composition } from '../model/composition'
import { occurrenceAllowsVoice, occurrenceLayerSelection, resolveArrangementOccurrence, transposeOccurrenceNote, transposeOccurrenceNotes } from '../model/arrangement'
import { measurePeak, peakNormalizationGain } from './normalization'
import { mapOverclock } from './overclock'
import { advanceFatigue, resolveSequencerStep, type FatigueState } from './sequencing'
import { LIMITER_CEILING_DB, masterOutputDb } from './signalPath'
import { LayeredVoiceSource } from './instrumentSource'
import { resolvePitchedLifecycle } from './legato'
import { createParallelEffectRouting, createVoiceSendRoute, setParallelEffectRoutingAtTime } from './effectRouting'

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
    const routing = createParallelEffectRouting(composition.sound, mapped.drive, masterOutputDb(composition.masterVolume, mapped.outputTrimDb), secondsPerStep * 3, limiter)
    await routing.reverb.ready
    const chordVoice = composition.voices.chords
    const chordVolume = new Tone.Volume(chordVoice.volume)
    const chordFilter = new Tone.Filter({ frequency: chordVoice.cutoff, type: chordVoice.filterType, rolloff: -24, Q: chordVoice.resonance }).connect(chordVolume)
    createVoiceSendRoute(chordVolume, routing, chordVoice.sends)
    const chords = new LayeredVoiceSource('chords', chordFilter, chordVoice, { envelopeScale: mapped.envelopeScale, pitchDriftCents: mapped.pitchDriftCents })
    const bassVoice = composition.voices.bass
    const bassVolume = new Tone.Volume(bassVoice.volume)
    const bassFilter = new Tone.Filter({ frequency: bassVoice.cutoff, type: bassVoice.filterType, rolloff: -24, Q: bassVoice.resonance }).connect(bassVolume)
    createVoiceSendRoute(bassVolume, routing, bassVoice.sends)
    const bass = new LayeredVoiceSource('bass', bassFilter, bassVoice)
    const pulseVoice = composition.voices.pulse
    const pulseVolume = new Tone.Volume(pulseVoice.volume)
    const pulseFilter = new Tone.Filter({ frequency: pulseVoice.cutoff, type: pulseVoice.filterType, rolloff: -24, Q: pulseVoice.resonance }).connect(pulseVolume)
    createVoiceSendRoute(pulseVolume, routing, pulseVoice.sends)
    const pulse = new LayeredVoiceSource('pulse', pulseFilter, pulseVoice)
    const textureVoice = composition.voices.texture
    const textureVolume = new Tone.Volume(textureVoice.volume)
    const textureFilter = new Tone.Filter({ frequency: textureVoice.cutoff, type: textureVoice.filterType, rolloff: -24, Q: textureVoice.resonance }).connect(textureVolume)
    createVoiceSendRoute(textureVolume, routing, textureVoice.sends)
    const texture = new LayeredVoiceSource('texture', textureFilter, textureVoice)

    let lastChord = ['C4', 'Eb4', 'G4']
    let chordTied = false
    let bassTied = false
    let chordReleasePending = false
    let bassReleasePending = false
    let fatigue: FatigueState = { heat: 0, exhaustion: 0 }
    let stepCursor = 0
    composition.arrangement.forEach((_, bar) => {
      const { occurrence, pattern } = resolveArrangementOccurrence(composition, bar)
      pattern.steps.forEach((step, index) => {
        const time = (stepCursor + index) * secondsPerStep
        const resolved = resolveSequencerStep(composition, pattern, index, bar, fatigue.exhaustion, false, secondsPerStep, occurrence)
        const eventTime = time + resolved.timingOffset
        const ratchetSpacing = secondsPerStep / resolved.ratchets
        const triggerTimes = Array.from({ length: resolved.ratchets }, (_, ratchet) => eventTime + ratchet * ratchetSpacing)
        chordFilter.frequency.setValueAtTime(clamp(resolved.mask * resolved.mapped.brightness, 80, 12000), time)
        setParallelEffectRoutingAtTime(routing, resolved.memory, resolved.veil, resolved.fracture, time)
        const chordAllowed = occurrenceAllowsVoice(composition, occurrence, 'chords')
        const chordCanSound = step.notes.length > 0 && resolved.shouldPlay && chordAllowed
        if (chordReleasePending) chords.release(chordCanSound ? eventTime : time)
        chordReleasePending = false
        const chordLifecycle = resolvePitchedLifecycle(chordTied, chordCanSound, step.chordTie, resolved.ratchets)
        if (chordLifecycle.releasePrevious) chords.release(chordCanSound ? eventTime : time)
        if (step.notes.length && resolved.shouldPlay && chordAllowed) lastChord = [...step.notes]
        if (chordCanSound) {
          const chord = transposeOccurrenceNotes(step.notes, occurrence)
          const velocity = clamp(step.velocity * 0.72, 0.08, 0.78)
          const selection = occurrenceLayerSelection(occurrence, 'chords')
          const intendedDuration = secondsPerStep * step.chordLength * 0.94
          const noteDuration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
          if (chordLifecycle.mode === 'attack') chords.attack(chord, eventTime, velocity, selection)
          else if (chordLifecycle.mode === 'change') {
            chords.change(chord, eventTime, velocity, selection)
            if (!chordLifecycle.held) chordReleasePending = true
          } else for (const triggerTime of triggerTimes) chords.trigger(chord, noteDuration, triggerTime, velocity, selection)
        } else if (resolved.shouldPlay && chordAllowed && resolved.isGhostChord) {
          const chord = transposeOccurrenceNotes(lastChord, occurrence)
          chords.trigger(chord, secondsPerStep * 0.45, eventTime, clamp(step.velocity * 0.3, 0.08, 0.78), occurrenceLayerSelection(occurrence, 'chords'))
        }
        chordTied = chordLifecycle.held

        const bassAllowed = occurrenceAllowsVoice(composition, occurrence, 'bass')
        const bassCanSound = Boolean(step.bass) && resolved.shouldPlay && bassAllowed
        if (bassReleasePending) bass.release(bassCanSound ? eventTime : time)
        bassReleasePending = false
        const bassLifecycle = resolvePitchedLifecycle(bassTied, bassCanSound, step.bassTie, resolved.ratchets)
        if (bassLifecycle.releasePrevious) bass.release(bassCanSound ? eventTime : time)
        if (bassCanSound && step.bass) {
          const intendedDuration = secondsPerStep * step.bassLength * 0.92
          const noteDuration = resolved.ratchets > 1 ? Math.min(intendedDuration, ratchetSpacing * 0.82) : intendedDuration
          const bassNote = transposeOccurrenceNote(step.bass, occurrence)
          const velocity = clamp(step.velocity * 0.72, 0.12, 0.72)
          const selection = occurrenceLayerSelection(occurrence, 'bass')
          if (bassLifecycle.mode === 'attack') bass.attack(bassNote, eventTime, velocity, selection)
          else if (bassLifecycle.mode === 'change') {
            bass.change(bassNote, eventTime, velocity, selection)
            if (!bassLifecycle.held) bassReleasePending = true
          } else for (const triggerTime of triggerTimes) bass.trigger(bassNote, noteDuration, triggerTime, velocity, selection)
        }
        bassTied = bassLifecycle.held
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
    chords.release(stepCursor * secondsPerStep)
    bass.release(stepCursor * secondsPerStep)
  }, duration, 2, 44_100)
  const audioBuffer = rendered.get()
  if (!audioBuffer) throw new Error('Offline render produced no audio buffer.')
  return encodeWav(audioBuffer, peakNormalizationGain(measurePeak(audioBuffer)))
}
