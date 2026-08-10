import { clamp } from '../model/composition'

export const MAX_HUMANIZED_OFFSET_SECONDS = 0.028

/**
 * Returns a deterministic late-only performance offset for a sequencer step.
 * Step zero stays on the transport grid so a loop can never acquire a gap at
 * its seam; the remaining steps can still carry the requested human feel.
 */
export function humanizedStepOffset(
  step: number,
  humanize: number,
  timingInstability: number,
  bipolarVariation: number,
): number {
  if (step === 0) return 0
  const window = clamp(humanize * 0.045 + timingInstability, 0, MAX_HUMANIZED_OFFSET_SECONDS)
  return Math.max(0, clamp(bipolarVariation, -1, 1) * window)
}
