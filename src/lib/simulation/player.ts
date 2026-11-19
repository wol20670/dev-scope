/**
 * 단계형 시뮬레이터의 재생 상태. React와 무관한 순수 reducer라서 단위 테스트가 쉽다.
 * total(전체 단계 수)은 시나리오에 따라 바뀔 수 있으므로 상태가 아니라 액션으로 받는다.
 */
export interface PlayerState {
  index: number
  playing: boolean
}

export type PlayerAction =
  | { type: 'next'; total: number }
  | { type: 'prev' }
  | { type: 'reset' }
  | { type: 'goto'; index: number; total: number }
  | { type: 'play'; total: number }
  | { type: 'pause' }
  /** 자동 재생 타이머가 보내는 액션 */
  | { type: 'tick'; total: number }

export const initialPlayerState: PlayerState = { index: 0, playing: false }

const clamp = (i: number, total: number) => Math.max(0, Math.min(i, total - 1))

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    // 사용자가 직접 단계를 옮기면 자동 재생은 멈춘다
    case 'next':
      return { index: clamp(state.index + 1, action.total), playing: false }
    case 'prev':
      return { index: Math.max(0, state.index - 1), playing: false }
    case 'reset':
      return initialPlayerState
    case 'goto':
      return { index: clamp(action.index, action.total), playing: false }
    case 'play':
      if (action.total <= 1) return state
      // 마지막 단계에서 재생하면 처음부터 다시
      return { index: state.index >= action.total - 1 ? 0 : state.index, playing: true }
    case 'pause':
      return { ...state, playing: false }
    case 'tick': {
      if (!state.playing) return state
      const index = clamp(state.index + 1, action.total)
      return { index, playing: index < action.total - 1 }
    }
  }
}
