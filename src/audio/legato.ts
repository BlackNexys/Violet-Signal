export type PitchedLifecycleMode = 'none' | 'trigger' | 'attack' | 'change'

export interface PitchedLifecycleDecision {
  mode: PitchedLifecycleMode
  releasePrevious: boolean
  held: boolean
}

export function resolvePitchedLifecycle(
  wasTied: boolean,
  canSound: boolean,
  tieToNext: boolean,
  ratchets: number,
): PitchedLifecycleDecision {
  const legatoEligible = canSound && ratchets === 1
  if (wasTied && legatoEligible) {
    return { mode: 'change', releasePrevious: false, held: tieToNext }
  }
  if (!canSound) return { mode: 'none', releasePrevious: wasTied, held: false }
  if (tieToNext && ratchets === 1) return { mode: 'attack', releasePrevious: wasTied, held: true }
  return { mode: 'trigger', releasePrevious: wasTied, held: false }
}
