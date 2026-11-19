import { describe, expect, it } from 'vitest'
import { programs, runEventLoop } from '../../src/components/simulations/event-loop/model'
import { httpSteps, layers } from '../../src/components/simulations/http-request/model'
import {
  buildIsolationSteps,
  getOutcome,
  levels as isoLevels,
  type Anomaly,
  type Dbms,
  type Outcome,
} from '../../src/components/simulations/isolation/model'
import { buildLockSteps } from '../../src/components/simulations/locking/model'
import { initialCounts, initialState, simulateUpdate } from '../../src/components/simulations/react-rendering/model'
import { accumulate } from '../../src/lib/simulation/accumulate'

describe('accumulate', () => {
  it('변경분을 누적하고 중첩 객체는 얕게 병합한다', () => {
    const states = accumulate<{ a: { x: number; y: number }; n: number }, object>({ a: { x: 1, y: 1 }, n: 0 }, [{}, { a: { x: 2 } }, { n: 5 }])
    expect(states).toEqual([
      { a: { x: 1, y: 1 }, n: 0 },
      { a: { x: 2, y: 1 }, n: 0 },
      { a: { x: 2, y: 1 }, n: 5 },
    ])
  })
})

describe('락 시뮬레이션', () => {
  it('낙관적 락: B가 버전 충돌로 실패한 뒤 재시도해 최종 재고 5', () => {
    const steps = buildLockSteps('optimistic')
    const conflict = steps.find((s) => s.b.status === 'conflict')!
    expect(conflict.db).toMatchObject({ stock: 7, version: 1 }) // A의 변경이 덮어써지지 않았다
    expect(steps.some((s) => s.db.lockHolder !== null)).toBe(false) // 잠금을 쓰지 않는다
    expect(steps.at(-1)!.db).toMatchObject({ stock: 5, version: 2 })
    expect(steps.at(-1)!.a.status).toBe('committed')
    expect(steps.at(-1)!.b.status).toBe('committed')
  })

  it('비관적 락: B는 A가 커밋할 때까지 대기하고, 최신 값(7)을 읽어 최종 재고 5', () => {
    const steps = buildLockSteps('pessimistic')
    const waiting = steps.filter((s) => s.b.status === 'waiting')
    expect(waiting.length).toBeGreaterThan(0)
    for (const s of waiting) {
      // A가 잠금을 보유 중이거나, 막 해제되어 B가 잠금을 얻기 직전
      expect(['A', null]).toContain(s.db.lockHolder)
      expect(s.db.waiting).toContain('B')
    }
    expect(waiting.some((s) => s.db.lockHolder === 'A')).toBe(true)
    const bLocked = steps.find((s) => s.b.status === 'locked')!
    expect(bLocked.a.status).toBe('committed')
    expect(bLocked.b.seen?.stock).toBe(7)
    expect(steps.some((s) => s.b.status === 'conflict')).toBe(false)
    expect(steps.at(-1)!.db).toMatchObject({ stock: 5, lockHolder: null, waiting: [] })
  })

  it('비관적 락 시나리오는 일반 SELECT가 막히지 않는다는 점을 보여 준다', () => {
    const steps = buildLockSteps('pessimistic')
    expect(steps.some((s) => s.db.plainRead && s.db.lockHolder === 'A')).toBe(true)
  })
})

describe('이벤트 루프 시뮬레이션', () => {
  const output = (id: string) => runEventLoop(programs.find((p) => p.id === id)!).at(-1)!.output

  it('동기 → 마이크로태스크 → 태스크 순서로 출력한다', () => {
    expect(output('basic')).toEqual(['A', 'D', 'C', 'B'])
  })

  it('태스크 하나가 끝날 때마다 마이크로태스크를 모두 처리한다', () => {
    expect(output('nested')).toEqual(['start', 'end', 'micro 1', 'timeout 1', 'micro in timeout', 'timeout 2', 'timeout 3'])
  })

  it('처리 중 추가된 마이크로태스크도 같은 체크포인트에서 처리하고, 타이머는 만료 순서를 따른다', () => {
    expect(output('chain')).toEqual(['sync', 'micro 1', 'micro 2', 'timeout 0ms', 'timeout 100ms'])
  })

  it('모든 스냅샷이 일관된 상태다', () => {
    for (const p of programs) {
      const snaps = runEventLoop(p)
      expect(snaps[0].output).toEqual([])
      const last = snaps.at(-1)!
      expect([last.stack, last.tasks, last.microtasks, last.webApis].every((q) => q.length === 0)).toBe(true)
      // 출력은 줄어들지 않는다
      snaps.reduce((prev, s) => (expect(s.output.length).toBeGreaterThanOrEqual(prev), s.output.length), 0)
      // 마이크로태스크가 남아 있는 동안 태스크를 실행하지 않는다
      for (const s of snaps) if (s.phase === 'task') expect(s.microtasks.length === 0 || s.stack.length > 0).toBe(true)
      // 강조하는 줄은 코드 범위 안에 있다
      const lines = p.code.split('\n').length
      for (const s of snaps) if (s.line !== null) expect(s.line).toBeLessThanOrEqual(lines)
    }
  })
})

describe('React 렌더링 시뮬레이션', () => {
  it('count 변경: Counter 하위만 렌더링하고, DOM은 CountLabel만 바뀐다', () => {
    const { steps, next } = simulateUpdate(initialState, 'increment', false, initialCounts())
    expect(next.count).toBe(1)
    const render = steps.find((s) => s.phase === 'render')!
    expect(Object.entries(render.status).filter(([, v]) => v === 'rendered').map(([k]) => k)).toEqual(['Counter', 'CountLabel', 'IncrementButton'])
    const commit = steps.find((s) => s.phase === 'commit')!
    expect(commit.domChanges.map((c) => c.id)).toEqual(['CountLabel'])
    expect(commit.status.IncrementButton).toBe('unchanged') // 렌더링 ≠ DOM 변경
    expect(commit.ui.count).toBe(0) // 페인트 전에는 화면이 이전 상태
    expect(steps.at(-1)!.ui.count).toBe(1)
  })

  it('같은 값으로 set하면 렌더링을 건너뛴다', () => {
    const { steps, counts } = simulateUpdate(initialState, 'same', false, initialCounts())
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'bailout'])
    expect(counts).toEqual(initialCounts())
  })

  it('테마 변경: memo 없으면 Sidebar도 렌더링, memo면 하위 트리까지 건너뛴다', () => {
    const noMemo = simulateUpdate(initialState, 'theme', false, initialCounts())
    expect(noMemo.counts.Sidebar).toBe(2)
    expect(noMemo.counts.SidebarItem).toBe(2)

    const withMemo = simulateUpdate(initialState, 'theme', true, initialCounts())
    const render = withMemo.steps.find((s) => s.phase === 'render')!
    expect(render.status.Sidebar).toBe('skipped')
    expect(render.status.SidebarItem).toBeUndefined()
    expect(withMemo.counts.Sidebar).toBe(1)
    expect(withMemo.counts.Header).toBe(2)
    const commit = withMemo.steps.find((s) => s.phase === 'commit')!
    expect(commit.domChanges.map((c) => c.id).sort()).toEqual(['App', 'Header'])
  })
})

describe('HTTP 요청 시뮬레이션', () => {
  it('요청은 Browser → Database, 응답은 반대 방향으로 이동한다', () => {
    const order = layers.map((l) => l.id)
    const req = httpSteps.filter((s) => s.direction === 'request').map((s) => s.layer)
    const res = httpSteps.filter((s) => s.direction === 'response').map((s) => s.layer)
    expect(req).toEqual(order)
    expect(res).toEqual([...order].reverse().slice(1))
  })

  it('모든 계층에 역할 설명과 코드 예시가 있다', () => {
    for (const l of layers) {
      expect(l.role.length).toBeGreaterThan(20)
      expect(l.code.source.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('트랜잭션 격리 수준 시뮬레이션', () => {
  // [RU, RC, RR, SER] — 공식 문서 기준 기대 결과
  const expected: Record<Anomaly, Record<Dbms, Outcome[]>> = {
    'dirty-read': {
      postgresql: ['committed-read', 'committed-read', 'committed-read', 'committed-read'], // PG의 RU = RC
      mysql: ['anomaly', 'committed-read', 'committed-read', 'lock-wait'],
    },
    'non-repeatable-read': {
      postgresql: ['anomaly', 'anomaly', 'snapshot', 'snapshot'],
      mysql: ['anomaly', 'anomaly', 'snapshot', 'lock-wait'],
    },
    'phantom-read': {
      postgresql: ['anomaly', 'anomaly', 'snapshot', 'snapshot'], // PG는 RR에서도 Phantom 없음
      mysql: ['anomaly', 'anomaly', 'snapshot', 'lock-wait'], // InnoDB RR 일반 SELECT는 스냅샷
    },
  }
  const combos = (Object.keys(expected) as Anomaly[]).flatMap((a) =>
    (['postgresql', 'mysql'] as Dbms[]).flatMap((d) => isoLevels.map((l, i) => [a, l, d, expected[a][d][i]] as const)),
  )

  it.each(combos)('%s / %s / %s → %s', (anomaly, level, dbms, outcome) => {
    expect(getOutcome(anomaly, level, dbms)).toBe(outcome)
    const steps = buildIsolationSteps(anomaly, level, dbms)
    const last = steps.at(-1)!

    // 이상 현상일 때만 T1이 "잘못된" 값을 읽는다
    expect(steps.some((s) => s.t1.tone === 'bad')).toBe(outcome === 'anomaly')
    // 잠금 대기는 lock-wait일 때만
    expect(steps.some((s) => s.t1.status === 'waiting' || s.t2.status === 'waiting')).toBe(outcome === 'lock-wait')

    // 끝나면 잠금과 미커밋 변경이 남지 않는다
    expect(last.locks).toEqual([])
    expect(last.pending).toBeNull()
    expect(last.t1.status).toBe('committed')
    if (anomaly === 'dirty-read') {
      expect(last.t2.status).toBe('rolledback')
      expect(last.rows[0].price).toBe(10000)
    } else {
      expect(last.t2.status).toBe('committed')
      if (anomaly === 'phantom-read') expect(last.rows.filter((r) => r.price < 20000)).toHaveLength(3)
      else expect(last.rows[0].price).toBe(12000)
    }
  })
})
