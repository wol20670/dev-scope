import { accumulate } from '../../../lib/simulation/accumulate'

/**
 * 트랜잭션 격리 수준 시뮬레이션 모델.
 *
 * 각 DBMS 공식 문서에 기술된 동작을 따른다.
 * - PostgreSQL: READ UNCOMMITTED는 READ COMMITTED처럼 동작한다. READ COMMITTED는 문장마다,
 *   REPEATABLE READ·SERIALIZABLE은 트랜잭션의 첫 문장 시점의 스냅샷을 읽는다.
 * - MySQL InnoDB: READ UNCOMMITTED는 커밋되지 않은 값을 읽을 수 있다(Dirty Read). READ COMMITTED는 읽을 때마다 새 스냅샷,
 *   REPEATABLE READ는 첫 읽기 시점 스냅샷을 쓴다. SERIALIZABLE은 autocommit이 꺼진 트랜잭션에서
 *   일반 SELECT를 SELECT ... FOR SHARE(잠금 읽기)로 바꾼다.
 *
 * 여기서 다루는 것은 "읽기" 쪽 이상 현상이다. 쓰기 충돌(갱신 손실, 직렬화 실패)은 다루지 않는다.
 */

export type Anomaly = 'dirty-read' | 'non-repeatable-read' | 'phantom-read'
export type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'
export type Dbms = 'postgresql' | 'mysql'

export const levels: IsolationLevel[] = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']

export const anomalyInfo: Record<Anomaly, { label: string; summary: string }> = {
  'dirty-read': {
    label: 'Dirty Read',
    summary: '다른 트랜잭션이 아직 커밋하지 않은 값을 읽는 것. 그 트랜잭션이 롤백하면 존재한 적 없는 값을 읽은 셈이 된다.',
  },
  'non-repeatable-read': {
    label: 'Non-repeatable Read',
    summary: '같은 트랜잭션에서 같은 행을 두 번 읽었는데, 그사이 다른 트랜잭션이 수정·커밋해서 값이 달라지는 것.',
  },
  'phantom-read': {
    label: 'Phantom Read',
    summary: '같은 조건으로 두 번 조회했는데, 그사이 다른 트랜잭션이 조건에 맞는 행을 추가·커밋해서 결과 행 집합이 달라지는 것.',
  },
}

export const dbmsLabel: Record<Dbms, string> = { postgresql: 'PostgreSQL', mysql: 'MySQL InnoDB' }

/**
 * - anomaly: 이상 현상 발생
 * - snapshot: 트랜잭션 스냅샷(MVCC)을 읽어서 방지
 * - committed-read: 커밋된 값만 읽어서 방지 (Dirty Read 한정)
 * - lock-wait: 잠금 충돌로 한쪽이 대기해서 방지
 */
export type Outcome = 'anomaly' | 'snapshot' | 'committed-read' | 'lock-wait'

export const outcomeLabel: Record<Outcome, string> = {
  anomaly: '발생',
  snapshot: '방지 · 스냅샷 읽기',
  'committed-read': '방지 · 커밋된 값만 읽음',
  'lock-wait': '방지 · 잠금 대기',
}

export function getOutcome(anomaly: Anomaly, level: IsolationLevel, dbms: Dbms): Outcome {
  if (anomaly === 'dirty-read') {
    if (dbms === 'mysql' && level === 'READ UNCOMMITTED') return 'anomaly'
    if (dbms === 'mysql' && level === 'SERIALIZABLE') return 'lock-wait'
    return 'committed-read'
  }
  if (level === 'READ UNCOMMITTED' || level === 'READ COMMITTED') return 'anomaly'
  if (level === 'REPEATABLE READ') return 'snapshot'
  return dbms === 'mysql' ? 'lock-wait' : 'snapshot'
}

/** T1의 일반 SELECT가 무엇을 읽는지 한 줄 설명 */
export function readRule(level: IsolationLevel, dbms: Dbms): string {
  if (dbms === 'postgresql') {
    if (level === 'READ UNCOMMITTED') return 'PostgreSQL에서는 READ COMMITTED와 같다: 문장마다 그 시점에 커밋된 데이터를 읽는다'
    if (level === 'READ COMMITTED') return '문장(SELECT)마다 그 시점에 커밋된 데이터의 스냅샷을 읽는다'
    return '트랜잭션의 첫 문장 시점 스냅샷을 끝까지 읽는다'
  }
  if (level === 'READ UNCOMMITTED') return '잠금 없이 읽으며, 커밋되지 않은 최신 값을 읽을 수 있다'
  if (level === 'READ COMMITTED') return '읽을 때마다 새 스냅샷을 만들어 커밋된 데이터를 읽는다'
  if (level === 'REPEATABLE READ') return '첫 읽기 시점에 만든 스냅샷을 트랜잭션 끝까지 읽는다'
  return '일반 SELECT가 SELECT ... FOR SHARE(공유 잠금 읽기)로 바뀐다 (autocommit이 꺼진 트랜잭션)'
}

export interface Row {
  id: number
  name: string
  price: number
}

export type TxStatus = 'idle' | 'active' | 'waiting' | 'committed' | 'rolledback'

export interface TxView {
  status: TxStatus
  sql?: string
  result?: string
  tone?: 'neutral' | 'bad' | 'good'
}

export interface IsoState {
  t1: TxView
  t2: TxView
  /** 커밋된 테이블 상태 */
  rows: Row[]
  /** T2의 커밋되지 않은 변경 */
  pending: { kind: 'update' | 'insert'; row: Row } | null
  locks: string[]
}

export interface IsoStep extends IsoState {
  title: string
  description: string
  focus: 'T1' | 'T2' | 'db' | 'all'
}

type Meta = Pick<IsoStep, 'title' | 'description' | 'focus'>

function beginSql(level: IsolationLevel, dbms: Dbms) {
  return dbms === 'postgresql'
    ? `BEGIN ISOLATION LEVEL ${level};`
    : `SET TRANSACTION ISOLATION LEVEL ${level};\nSTART TRANSACTION;`
}

function verdictText(outcome: Outcome, anomaly: Anomaly) {
  const name = anomalyInfo[anomaly].label
  switch (outcome) {
    case 'anomaly':
      return `결과: ${name} 발생.`
    case 'snapshot':
      return `결과: ${name} 방지. T1은 처음 읽은 스냅샷을 계속 읽었다. 대기는 없었지만, T1이 본 값이 최신 커밋 값과 다를 수 있다는 점도 기억하자.`
    case 'committed-read':
      return `결과: ${name} 방지. 커밋되지 않은 값은 보이지 않고, 대기도 없었다.`
    case 'lock-wait':
      return `결과: ${name} 방지. 대신 한 트랜잭션이 다른 트랜잭션이 끝날 때까지 기다렸다. 동시성이 낮아지는 비용이 있다.`
  }
}

function dirtyRead(level: IsolationLevel, dbms: Dbms): IsoStep[] {
  const outcome = getOutcome('dirty-read', level, dbms)
  const select = 'SELECT price FROM product WHERE id = 1;'
  const initial: IsoState = {
    t1: { status: 'idle' },
    t2: { status: 'idle' },
    rows: [{ id: 1, name: '키보드', price: 10000 }],
    pending: null,
    locks: [],
  }
  const read: Partial<IsoStep> & Meta =
    outcome === 'anomaly'
      ? {
          title: 'T1이 같은 행을 조회',
          focus: 'T1',
          description: `${readRule(level, dbms)}. T1은 T2가 아직 커밋하지 않은 가격 0원을 읽는다.`,
          t1: { status: 'active', sql: select, result: '0원 ← 커밋되지 않은 값', tone: 'bad' },
        }
      : outcome === 'lock-wait'
        ? {
            title: 'T1의 조회가 잠금 대기',
            focus: 'T1',
            description: `${readRule(level, dbms)}. T1의 공유 잠금(S) 요청이 T2의 배타 잠금(X)과 충돌해서 T1이 기다린다.`,
            t1: { status: 'waiting', sql: `${select}\n-- 내부적으로 ... FOR SHARE`, result: '잠금 대기 중…', tone: 'neutral' },
          }
        : {
            title: 'T1이 같은 행을 조회',
            focus: 'T1',
            description: `${readRule(level, dbms)}. 그래서 T2의 미커밋 변경은 보이지 않고, 마지막으로 커밋된 10,000원을 대기 없이 읽는다.`,
            t1: { status: 'active', sql: select, result: '10,000원 (커밋된 값)', tone: 'good' },
          }
  const rollback: Partial<IsoStep> & Meta =
    outcome === 'lock-wait'
      ? {
          title: 'T2 롤백 → T1 진행',
          focus: 'T2',
          description: 'T2가 롤백하며 잠금을 풀자, 대기하던 T1이 공유 잠금을 얻고 원래 값 10,000원을 읽는다.',
          t2: { status: 'rolledback', sql: 'ROLLBACK;', result: '변경 취소', tone: 'neutral' },
          t1: { status: 'active', result: '10,000원 (롤백 후 원래 값)', tone: 'good' },
          pending: null,
          locks: ['T1: id=1 공유 잠금(S)'],
        }
      : {
          title: 'T2 롤백',
          focus: 'T2',
          description:
            outcome === 'anomaly'
              ? 'T2가 실수를 깨닫고 롤백한다. 가격 0원은 한 번도 커밋된 적 없는 값인데, T1은 이미 그 값을 읽어서 사용했다. 이것이 Dirty Read다.'
              : 'T2가 롤백한다. T1은 처음부터 커밋된 값만 읽었으므로 영향이 없다.',
          t2: { status: 'rolledback', sql: 'ROLLBACK;', result: '변경 취소', tone: 'neutral' },
          pending: null,
          locks: [],
        }
  return accumulate<IsoState, Meta>(initial, [
    {
      title: '초기 상태',
      focus: 'all',
      description: `${anomalyInfo['dirty-read'].summary} 키보드 가격은 10,000원이다. T2가 가격을 실수로 0원으로 바꿨다가 롤백하는 상황에서, T1이 무엇을 읽는지 보자.`,
    },
    {
      title: '두 트랜잭션 시작',
      focus: 'all',
      description: `두 트랜잭션 모두 ${level} 격리 수준(${dbmsLabel[dbms]})으로 시작한다.`,
      t1: { status: 'active', sql: beginSql(level, dbms) },
      t2: { status: 'active', sql: beginSql(level, dbms) },
    },
    {
      title: 'T2가 가격 수정 (커밋 전)',
      focus: 'T2',
      description: 'T2가 가격을 0원으로 바꾼다. 아직 커밋하지 않았고, 수정한 행에는 T2의 배타 잠금(X)이 걸린다.',
      t2: { status: 'active', sql: 'UPDATE product SET price = 0 WHERE id = 1;', result: '1 row (미커밋)' },
      pending: { kind: 'update', row: { id: 1, name: '키보드', price: 0 } },
      locks: ['T2: id=1 배타 잠금(X)'],
    },
    read,
    rollback,
    {
      title: 'T1 커밋 · 결과',
      focus: 'all',
      description: verdictText(outcome, 'dirty-read'),
      t1: { status: 'committed', sql: 'COMMIT;' },
      locks: [],
    },
  ])
}

/** Non-repeatable Read와 Phantom Read는 "T1 두 번 읽기 사이에 T2가 변경·커밋"이라는 같은 구조다 */
function readTwice(anomaly: 'non-repeatable-read' | 'phantom-read', level: IsolationLevel, dbms: Dbms): IsoStep[] {
  const outcome = getOutcome(anomaly, level, dbms)
  const phantom = anomaly === 'phantom-read'

  const rows: Row[] = phantom
    ? [
        { id: 1, name: '키보드', price: 45000 },
        { id: 2, name: 'USB 케이블', price: 8000 },
        { id: 3, name: '마우스패드', price: 12000 },
      ]
    : [{ id: 1, name: '키보드', price: 10000 }]
  const changed: Row = phantom ? { id: 4, name: '마우스', price: 15000 } : { id: 1, name: '키보드', price: 12000 }
  const after: Row[] = phantom ? [...rows, changed] : [changed]

  const select = phantom ? 'SELECT COUNT(*) FROM product\n WHERE price < 20000;' : 'SELECT price FROM product WHERE id = 1;'
  const write = phantom ? "INSERT INTO product\nVALUES (4, '마우스', 15000);" : 'UPDATE product SET price = 12000\n WHERE id = 1;'
  const first = phantom ? '2건' : '10,000원'
  const second = phantom ? '3건' : '12,000원'
  const t1Lock = phantom ? 'T1: price < 20000 범위에 공유 next-key 잠금' : 'T1: id=1 공유 잠금(S)'
  const t2Lock = phantom ? 'T2: id=4 배타 잠금(X)' : 'T2: id=1 배타 잠금(X)'
  const pendingKind = phantom ? 'insert' : 'update'
  const wait = outcome === 'lock-wait'

  const initial: IsoState = { t1: { status: 'idle' }, t2: { status: 'idle' }, rows, pending: null, locks: [] }

  const intro: Meta[] = [
    {
      title: '초기 상태',
      focus: 'all',
      description: phantom
        ? `${anomalyInfo[anomaly].summary} 2만 원 미만 상품은 2건이다. T1이 개수를 두 번 세는 사이에 T2가 15,000원짜리 상품을 추가한다.`
        : `${anomalyInfo[anomaly].summary} 키보드 가격은 10,000원이다. T1이 가격을 두 번 읽는 사이에 T2가 12,000원으로 올린다.`,
    },
  ]

  const steps: (Partial<IsoStep> & Meta)[] = [
    ...intro,
    {
      title: '두 트랜잭션 시작',
      focus: 'all',
      description: `두 트랜잭션 모두 ${level} 격리 수준(${dbmsLabel[dbms]})으로 시작한다. T1의 읽기 규칙: ${readRule(level, dbms)}.`,
      t1: { status: 'active', sql: beginSql(level, dbms) },
      t2: { status: 'active', sql: beginSql(level, dbms) },
    },
    {
      title: 'T1 첫 번째 조회',
      focus: 'T1',
      description: wait
        ? phantom
          ? `T1의 SELECT가 잠금 읽기로 바뀌어, 조건(price < 20000)으로 스캔한 인덱스 범위에 next-key 잠금을 건다. 결과는 ${first}이다. (잠기는 범위는 인덱스와 실행 계획에 따라 다르다)`
          : `T1의 SELECT가 잠금 읽기로 바뀌어 id=1 행에 공유 잠금(S)을 건다. 결과는 ${first}이다.`
        : level === 'REPEATABLE READ' || level === 'SERIALIZABLE'
          ? `결과는 ${first}이다. 이 첫 조회 시점의 스냅샷이 트랜잭션 끝까지 유지된다.`
          : `결과는 ${first}이다. 이 격리 수준에서는 다음 조회 때 그 시점의 데이터를 다시 읽는다.`,
      t1: { status: 'active', sql: select, result: first, tone: 'neutral' },
      locks: wait ? [t1Lock] : [],
    },
  ]

  if (wait) {
    steps.push(
      {
        title: phantom ? 'T2의 INSERT가 대기' : 'T2의 UPDATE가 대기',
        focus: 'T2',
        description: phantom
          ? 'T2가 T1이 잠근 범위에 새 행을 넣으려 하지만, next-key(갭) 잠금과 충돌해서 기다린다.'
          : 'T2가 같은 행을 수정하려 하지만, T1의 공유 잠금과 배타 잠금이 충돌해서 기다린다.',
        t2: { status: 'waiting', sql: write, result: '잠금 대기 중…', tone: 'neutral' },
      },
      {
        title: 'T1 두 번째 조회',
        focus: 'T1',
        description: `T2가 아직 대기 중이라 데이터가 바뀌지 않았다. T1은 다시 ${first}을 읽는다.`,
        t1: { status: 'active', sql: select, result: `${first} (첫 조회와 같음)`, tone: 'good' },
      },
      {
        title: 'T1 커밋 → T2 진행',
        focus: 'all',
        description: `T1이 커밋하며 잠금을 풀자 T2의 ${phantom ? 'INSERT' : 'UPDATE'}가 실행된다.`,
        t1: { status: 'committed', sql: 'COMMIT;' },
        t2: { status: 'active', result: '1 row (미커밋)', tone: 'neutral' },
        pending: { kind: pendingKind, row: changed },
        locks: [t2Lock],
      },
      {
        title: 'T2 커밋 · 결과',
        focus: 'all',
        description: verdictText(outcome, anomaly),
        t2: { status: 'committed', sql: 'COMMIT;', result: '커밋 완료' },
        rows: after,
        pending: null,
        locks: [],
      },
    )
    return accumulate<IsoState, Meta>(initial, steps)
  }

  steps.push(
    {
      title: phantom ? 'T2가 행 추가 (커밋 전)' : 'T2가 가격 수정 (커밋 전)',
      focus: 'T2',
      description: `T2가 ${phantom ? '조건에 맞는 새 상품을 추가' : '가격을 12,000원으로 수정'}한다. T1은 일반 SELECT(잠금 없는 읽기)만 했으므로 T2는 기다리지 않는다.`,
      t2: { status: 'active', sql: write, result: '1 row (미커밋)', tone: 'neutral' },
      pending: { kind: pendingKind, row: changed },
      locks: [t2Lock],
    },
    {
      title: 'T2 커밋',
      focus: 'T2',
      description: `T2가 커밋한다. 이제 데이터베이스에 커밋된 ${phantom ? '2만 원 미만 상품은 3건' : '가격은 12,000원'}이다.`,
      t2: { status: 'committed', sql: 'COMMIT;', result: '커밋 완료' },
      rows: after,
      pending: null,
      locks: [],
    },
    outcome === 'anomaly'
      ? {
          title: 'T1 두 번째 조회',
          focus: 'T1',
          description: `T1이 같은 조회를 다시 한다. 다시 읽는 시점에는 T2의 커밋이 반영되어 있어서 ${second}이 나온다. 같은 트랜잭션 안에서 결과가 달라졌다 — ${anomalyInfo[anomaly].label}.`,
          t1: { status: 'active', sql: select, result: `${second} ← 첫 조회(${first})와 다름`, tone: 'bad' },
        }
      : {
          title: 'T1 두 번째 조회',
          focus: 'T1',
          description: `T1은 첫 조회 때의 스냅샷을 그대로 읽으므로, 이미 커밋된 T2의 변경이 보이지 않는다. 결과는 여전히 ${first}이다.${
            phantom && dbms === 'postgresql' && level === 'REPEATABLE READ'
              ? ' SQL 표준은 REPEATABLE READ에서 Phantom Read를 허용하지만, PostgreSQL은 스냅샷 덕분에 발생하지 않는다.'
              : ''
          }`,
          t1: { status: 'active', sql: select, result: `${first} (스냅샷 기준, 커밋된 값은 ${second})`, tone: 'good' },
        },
    {
      title: 'T1 커밋 · 결과',
      focus: 'all',
      description: verdictText(outcome, anomaly),
      t1: { status: 'committed', sql: 'COMMIT;' },
    },
  )
  return accumulate<IsoState, Meta>(initial, steps)
}

export function buildIsolationSteps(anomaly: Anomaly, level: IsolationLevel, dbms: Dbms): IsoStep[] {
  return anomaly === 'dirty-read' ? dirtyRead(level, dbms) : readTwice(anomaly, level, dbms)
}

