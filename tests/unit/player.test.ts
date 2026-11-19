import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialPlayerState, playerReducer, type PlayerState } from '../../src/lib/simulation/player'
import { useStepPlayer } from '../../src/lib/simulation/useStepPlayer'

const total = 4
const at = (index: number, playing = false): PlayerState => ({ index, playing })

describe('playerReducer', () => {
  it('next/prev는 범위를 벗어나지 않는다', () => {
    expect(playerReducer(at(0), { type: 'prev' })).toEqual(at(0))
    expect(playerReducer(at(3), { type: 'next', total })).toEqual(at(3))
    expect(playerReducer(at(1), { type: 'next', total })).toEqual(at(2))
  })

  it('직접 단계를 옮기면 자동 재생이 멈춘다', () => {
    expect(playerReducer(at(1, true), { type: 'next', total }).playing).toBe(false)
    expect(playerReducer(at(1, true), { type: 'prev' }).playing).toBe(false)
    expect(playerReducer(at(1, true), { type: 'goto', index: 3, total })).toEqual(at(3))
  })

  it('reset은 처음으로 돌아가고 재생을 멈춘다', () => {
    expect(playerReducer(at(2, true), { type: 'reset' })).toEqual(initialPlayerState)
  })

  it('마지막 단계에서 play하면 처음부터 재생한다', () => {
    expect(playerReducer(at(3), { type: 'play', total })).toEqual(at(0, true))
    expect(playerReducer(at(1), { type: 'play', total })).toEqual(at(1, true))
  })

  it('tick은 재생 중일 때만 진행하고 마지막 단계에서 멈춘다', () => {
    expect(playerReducer(at(1), { type: 'tick', total })).toEqual(at(1))
    expect(playerReducer(at(1, true), { type: 'tick', total })).toEqual(at(2, true))
    expect(playerReducer(at(2, true), { type: 'tick', total })).toEqual(at(3, false))
  })
})

describe('useStepPlayer 자동 재생', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('간격마다 한 단계씩 진행하고 끝에서 멈춘다', () => {
    const { result } = renderHook(() => useStepPlayer(total, 1000))
    act(() => result.current.play())
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.index).toBe(1)
    // 다음 타이머는 렌더 후 effect에서 걸리므로 한 단계씩 진행시킨다
    act(() => vi.advanceTimersByTime(1000))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.index).toBe(3)
    expect(result.current.playing).toBe(false)
    expect(result.current.isLast).toBe(true)
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(3)
  })

  it('일시정지하면 더 이상 진행하지 않고 타이머가 정리된다', () => {
    const { result } = renderHook(() => useStepPlayer(total, 1000))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.pause())
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(1)
  })

  it('언마운트하면 대기 중인 타이머가 정리된다', () => {
    const { result, unmount } = renderHook(() => useStepPlayer(total, 1000))
    act(() => result.current.play())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('autoPlay 옵션은 마운트 즉시 재생한다', () => {
    const { result } = renderHook(() => useStepPlayer(total, 1000, { autoPlay: true }))
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.index).toBe(1)
  })
})
