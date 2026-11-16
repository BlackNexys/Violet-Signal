/** Separate, bounded one-shot project. Existing .violet compositions are not affected. */
export type FxEngine = 'fm' | 'noise' | 'metal'
export type FxLayerId = 'transient' | 'body' | 'tail'

export interface FxLayer {
  id: FxLayerId
  enabled: boolean
  engine: FxEngine
  startMs: number
  durationMs: number
  attackMs: number
  frequency: number
  endFrequency: number
  filterHz: number
  levelDb: number
  bits: number
}

export interface FxProject {
  format: 'violetfx'
  version: 1
  name: string
  durationMs: number
  masterDb: number
  layers: [FxLayer, FxLayer, FxLayer]
}

export function newFxProject(): FxProject {
  return {
    format: 'violetfx', version: 1, name: 'Flicker — Magenta Snap',
    durationMs: 240, masterDb: -9,
    layers: [
      { id: 'transient', enabled: true, engine: 'noise', startMs: 0, durationMs: 28, attackMs: 1,
        frequency: 5000, endFrequency: 2500, filterHz: 5500, levelDb: -13, bits: 12 },
      { id: 'body', enabled: true, engine: 'fm', startMs: 8, durationMs: 116, attackMs: 3,
        frequency: 1200, endFrequency: 620, filterHz: 4200, levelDb: -15, bits: 10 },
      { id: 'tail', enabled: true, engine: 'metal', startMs: 67, durationMs: 151, attackMs: 2,
        frequency: 2100, endFrequency: 850, filterHz: 3800, levelDb: -24, bits: 9 },
    ],
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function numberIn(value: unknown, low: number, high: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) {
    throw new Error(name + ' must be between ' + low + ' and ' + high)
  }
  return value
}

export function parseFxProject(json: string): FxProject {
  if (json.length > 64 * 1024) throw new Error('FX project exceeds the 64 KiB limit')
  const value: unknown = JSON.parse(json)
  if (!record(value) || value.format !== 'violetfx' || value.version !== 1) {
    throw new Error('Not a supported Violet FX v1 project')
  }
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80) {
    throw new Error('FX project name must contain 1–80 characters')
  }
  const durationMs = numberIn(value.durationMs, 60, 1500, 'Duration')
  const masterDb = numberIn(value.masterDb, -36, 0, 'Master level')
  if (!Array.isArray(value.layers) || value.layers.length !== 3) {
    throw new Error('An FX project requires transient, body and tail layers')
  }
  const ids: FxLayerId[] = ['transient', 'body', 'tail']
  const layers = value.layers.map((item: unknown, index: number): FxLayer => {
    if (!record(item) || item.id !== ids[index]) throw new Error('Unexpected FX layer or layer order')
    if (typeof item.enabled !== 'boolean') throw new Error('Invalid layer enabled state')
    if (item.engine !== 'fm' && item.engine !== 'noise' && item.engine !== 'metal') {
      throw new Error('Unsupported synthesis engine')
    }
    const startMs = numberIn(item.startMs, 0, durationMs - 10, 'Layer start')
    const layerDuration = numberIn(item.durationMs, 10, durationMs - startMs, 'Layer duration')
    return {
      id: ids[index], enabled: item.enabled, engine: item.engine,
      startMs, durationMs: layerDuration,
      attackMs: numberIn(item.attackMs, 0, Math.min(100, layerDuration / 2), 'Attack'),
      frequency: numberIn(item.frequency, 30, 10000, 'Start frequency'),
      endFrequency: numberIn(item.endFrequency, 30, 10000, 'End frequency'),
      filterHz: numberIn(item.filterHz, 100, 16000, 'Filter'),
      levelDb: numberIn(item.levelDb, -48, 0, 'Layer level'),
      bits: numberIn(item.bits, 4, 16, 'Bit depth'),
    }
  })
  return { format: 'violetfx', version: 1, name: value.name, durationMs, masterDb,
    layers: layers as FxProject['layers'] }
}

export function serializeFxProject(project: FxProject): string {
  return JSON.stringify(parseFxProject(JSON.stringify(project)), null, 2) + '\n'
}
