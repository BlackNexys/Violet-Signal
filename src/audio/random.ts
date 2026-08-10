/** A stateless seeded source: identical coordinates always produce identical variation. */
export function seededUnit(seed: number, ...coordinates: number[]): number {
  let state = (seed ^ 0x9e3779b9) >>> 0
  for (const coordinate of coordinates) {
    state ^= Math.imul((coordinate + 1) | 0, 0x85ebca6b)
    state = Math.imul(state ^ (state >>> 16), 0x7feb352d)
    state = Math.imul(state ^ (state >>> 15), 0x846ca68b)
    state ^= state >>> 16
  }
  return (state >>> 0) / 4_294_967_296
}

export function seededBipolar(seed: number, ...coordinates: number[]): number {
  return seededUnit(seed, ...coordinates) * 2 - 1
}
