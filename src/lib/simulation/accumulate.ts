/**
 * 단계별 "변경분"을 누적해 단계별 "전체 상태" 배열을 만든다.
 * 최상위 키는 객체 단위로 얕게 병합한다: { a: { status } } 는 a의 다른 필드를 유지한다.
 */
type Patch<S> = { [K in keyof S]?: S[K] extends object ? Partial<S[K]> : S[K] }

export function accumulate<S extends object, E>(initial: S, deltas: (Patch<S> & E)[]): (S & E)[] {
  const out: (S & E)[] = []
  let prev: S = initial
  for (const delta of deltas) {
    const next = { ...prev } as Record<string, unknown>
    for (const [k, v] of Object.entries(delta)) {
      const cur = next[k]
      next[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? { ...cur, ...v } : v
    }
    out.push(next as S & E)
    prev = next as S
  }
  return out
}
