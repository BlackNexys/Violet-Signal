export type PitchedLifecycleMode = 'none' | 'trigger' | 'attack' | 'change'

export interface PitchedLifecycleDecision {
  mode: PitchedLifecycleMode
  releasePrevious: boolean
  held: boolean
}

export interface PendingReleaseDecision {
  releaseTime: number | null
  pendingAt: number | null
}

/** Defers a terminal tie release until its gate expires, unless a replacement note arrives first. */
export function resolvePendingRelease(pendingAt: number | null, boundaryTime: number, replacementTime: number | null): PendingReleaseDecision {
  if (pendingAt === null) return { releaseTime: null, pendingAt: null }
  if (replacementTime !== null) return { releaseTime: replacementTime, pendingAt: null }
  if (boundaryTime >= pendingAt) return { releaseTime: boundaryTime, pendingAt: null }
  return { releaseTime: null, pendingAt }
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
