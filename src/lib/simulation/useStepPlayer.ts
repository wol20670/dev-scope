import { useEffect, useReducer } from 'react'
import { initialPlayerState, playerReducer } from './player'

export const DEFAULT_STEP_INTERVAL_MS = 2200

/**
 * 이전/다음/처음/자동 재생을 제공하는 훅.
 * 자동 재생 타이머는 단계마다 새로 걸고, 일시정지·언마운트 시 정리된다.
 */
export function useStepPlayer(total: number, intervalMs = DEFAULT_STEP_INTERVAL_MS, { autoPlay = false } = {}) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState, (s) => ({ ...s, playing: autoPlay && total > 1 }))

  useEffect(() => {
    if (!state.playing) return
    const id = setTimeout(() => dispatch({ type: 'tick', total }), intervalMs)
    return () => clearTimeout(id)
  }, [state.playing, state.index, total, intervalMs])

  return {
    index: Math.min(state.index, total - 1),
    total,
    playing: state.playing,
    isFirst: state.index === 0,
    isLast: state.index >= total - 1,
    next: () => dispatch({ type: 'next', total }),
    prev: () => dispatch({ type: 'prev' }),
    reset: () => dispatch({ type: 'reset' }),
    goto: (index: number) => dispatch({ type: 'goto', index, total }),
    play: () => dispatch({ type: 'play', total }),
    pause: () => dispatch({ type: 'pause' }),
  }
}

export type StepPlayer = ReturnType<typeof useStepPlayer>
