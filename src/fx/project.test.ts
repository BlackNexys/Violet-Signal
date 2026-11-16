import { describe, expect, it } from 'vitest'
import { newFxProject, parseFxProject, serializeFxProject } from './project'

describe('FX v1 isolated project format', () => {
  it('round-trips its three independent layers', () => {
    const project = newFxProject()
    const loaded = parseFxProject(serializeFxProject(project))
    expect(loaded).toEqual(project)
    expect(loaded.layers.map((layer) => layer.id)).toEqual(['transient', 'body', 'tail'])
  })
  it('rejects malformed, unsupported, and out-of-range projects', () => {
    const project = newFxProject()
    expect(() => parseFxProject('{}')).toThrow('Not a supported')
    expect(() => parseFxProject('x')).toThrow()
    expect(() => parseFxProject(JSON.stringify({ ...project, version: 4 }))).toThrow()
    expect(() => parseFxProject(JSON.stringify({ ...project, layers: [{}, {}, {}] }))).toThrow()
    expect(() => parseFxProject(JSON.stringify({ ...project, durationMs: Infinity }))).toThrow()
    expect(() => parseFxProject(JSON.stringify({ ...project, layers: [
      { ...project.layers[0], durationMs: 900 }, ...project.layers.slice(1)] }))).toThrow('Layer duration')
    expect(() => parseFxProject(' '.repeat(65537))).toThrow('64 KiB')
  })
  it('does not mutate imported projects', () => {
    const project = newFxProject()
    const copy = structuredClone(project)
    serializeFxProject(project)
    expect(project).toEqual(copy)
  })
})
