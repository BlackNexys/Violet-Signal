export const WAV_PEAK_CEILING_DB = -1
const SILENCE_FLOOR = 1e-7

export function decibelsToGain(decibels: number): number {
  return 10 ** (decibels / 20)
}

export function measurePeak(buffer: Pick<AudioBuffer, 'numberOfChannels' | 'getChannelData'>): number {
  let peak = 0
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index]))
  }
  return peak
}

export function peakNormalizationGain(peak: number, ceilingDb = WAV_PEAK_CEILING_DB): number {
  if (!Number.isFinite(peak) || peak <= SILENCE_FLOOR) return 1
  return decibelsToGain(ceilingDb) / peak
}
