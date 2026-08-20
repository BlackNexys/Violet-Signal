import type { AutomationMode } from './composition'

export function resolveAutomationValue(
  lane: Array<number | null>,
  step: number,
  fallback: number,
  mode: AutomationMode = 'hold',
): number {
  if (lane.length === 0) return fallback
  const current = ((step % lane.length) + lane.length) % lane.length
  if (lane[current] !== null) return lane[current]!

  let previousIndex = -1
  let previousDistance = 0
  for (let distance = 1; distance <= lane.length; distance += 1) {
    const index = (current - distance + lane.length) % lane.length
    if (lane[index] !== null) {
      previousIndex = index
      previousDistance = distance
      break
    }
  }
  if (previousIndex < 0) return fallback
  const previous = lane[previousIndex]!
  if (mode === 'hold') return previous

  for (let distance = 1; distance <= lane.length; distance += 1) {
    const index = (current + distance) % lane.length
    if (lane[index] === null) continue
    if (index === previousIndex) return previous
    const progress = previousDistance / (previousDistance + distance)
    return previous + (lane[index]! - previous) * progress
  }
  return previous
}
