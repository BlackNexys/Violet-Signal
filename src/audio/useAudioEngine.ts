import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../state/store'
import { VioletAudioEngine } from './engine'

export function useAudioEngine() {
  const engineRef = useRef<VioletAudioEngine | null>(null)
  const composition = useAppStore((state) => state.composition)
  const performancePressure = useAppStore((state) => state.performancePressure)
  const memoryFreeze = useAppStore((state) => state.memoryFreeze)

  if (!engineRef.current) {
    engineRef.current = new VioletAudioEngine({
      getComposition: () => useAppStore.getState().composition,
      getPerformance: () => ({ pressure: useAppStore.getState().performancePressure, freeze: useAppStore.getState().memoryFreeze }),
      applyBoundary: (boundary) => useAppStore.getState().applyPending(boundary),
      onPosition: (step, pattern, arrangementIndex) => useAppStore.getState().setPosition(step, pattern, arrangementIndex),
      onExhaustion: (amount) => useAppStore.getState().setExhaustion(amount),
    })
  }

  useEffect(() => { engineRef.current?.update(composition) }, [composition, performancePressure, memoryFreeze])
  useEffect(() => () => engineRef.current?.dispose(), [])
  const enable = useCallback(async () => { await engineRef.current?.initialize(useAppStore.getState().composition); useAppStore.getState().setAudioReady(true) }, [])
  const play = useCallback(async () => { await enable(); engineRef.current?.start(); useAppStore.getState().setPlaying(true) }, [enable])
  const pause = useCallback(() => { engineRef.current?.pause(); useAppStore.getState().setPlaying(false) }, [])
  const stop = useCallback(() => { engineRef.current?.stop(); useAppStore.getState().setPlaying(false) }, [])
  const panic = useCallback(() => { engineRef.current?.panic(); useAppStore.getState().setPlaying(false) }, [])
  const audition = useCallback(async (note: string) => { await enable(); engineRef.current?.audition(note) }, [enable])
  const startCapture = useCallback(async () => { await enable(); await engineRef.current?.startRecording() }, [enable])
  const stopCapture = useCallback(async () => engineRef.current?.stopRecording() ?? null, [])
  return { enable, play, pause, stop, panic, audition, startCapture, stopCapture }
}
