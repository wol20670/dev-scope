import { accumulate } from '../../../lib/simulation/accumulate'

export type LockScenario = 'optimistic' | 'pessimistic'

export type TxStatus = 'idle' | 'read' | 'locked' | 'waiting' | 'updated' | 'committed' | 'conflict' | 'retrying'

export interface TxState {
  status: TxStatus
  /** 트랜잭션이 읽어 둔 값 */
  seen?: { stock: number; version?: number }
  /** 방금 실행한 SQL */
  sql?: string
  /** SQL 실행 결과 요약 */
  result?: string
}

export interface DbState {
  /** 커밋된 재고 */
  stock: number
  /** 낙관적 락의 버전 컬럼 (비관적 시나리오에서는 없음) */
  version?: number
  /** 행 잠금을 가진 트랜잭션 */
  lockHolder: 'A' | 'B' | null
  /** 잠금을 기다리는 트랜잭션 */
  waiting: ('A' | 'B')[]
  /** 아직 커밋되지 않은 변경 */
  uncommitted?: { by: 'A' | 'B'; stock: number } | null
  /** 잠금 없는 일반 SELECT 결과 (MVCC 설명용) */
  plainRead?: string | null
}

export interface LockSimState {
  a: TxState
  b: TxState
  db: DbState
}

export interface LockStep extends LockSimState {
  title: string
  description: string
  /** 이 단계에서 주목할 대상 */
  focus: 'A' | 'B' | 'db' | 'all'
}

type StepMeta = { title: string; description: string; focus: LockStep['focus'] }

const SELECT_VERSION = 'SELECT stock, version FROM product WHERE id = 1;'
const SELECT_FOR_UPDATE = 'SELECT stock FROM product WHERE id = 1 FOR UPDATE;'

export const PURCHASE = { a: 3, b: 2, initialStock: 10 } as const

function optimisticSteps(): LockStep[] {
  const initial: LockSimState = {
    a: { status: 'idle' },
    b: { status: 'idle' },
    db: { stock: 10, version: 0, lockHolder: null, waiting: [] },
  }
  return accumulate<LockSimState, StepMeta>(initial, [
    {
      title: '초기 상태',
      focus: 'all',
      description: '재고 10개, 버전 0인 상품이 있다. 트랜잭션 A는 3개, B는 2개를 구매하려 한다. 엔티티에는 @Version 필드가 있다.',
    },
    {
      title: 'A가 조회',
      focus: 'A',
      description: 'A가 재고와 함께 현재 버전(0)을 읽는다. 잠금은 걸지 않는다.',
      a: { status: 'read', seen: { stock: 10, version: 0 }, sql: SELECT_VERSION, result: 'stock=10, version=0' },
    },
    {
      title: 'B도 같은 데이터를 조회',
      focus: 'B',
      description: 'B도 같은 행을 읽는다. 잠금이 없으므로 대기 없이 바로 읽힌다. 두 트랜잭션 모두 version=0을 들고 있다.',
      b: { status: 'read', seen: { stock: 10, version: 0 }, sql: SELECT_VERSION, result: 'stock=10, version=0' },
    },
    {
      title: 'A가 수정하고 버전 증가',
      focus: 'A',
      description:
        'A가 10 - 3 = 7로 수정한다. WHERE 조건에 읽었던 버전(0)을 넣고 버전을 1로 올린다. 조건에 맞는 행이 있으므로 1행이 수정되고 커밋된다.',
      a: {
        status: 'committed',
        sql: 'UPDATE product SET stock = 7, version = 1\n WHERE id = 1 AND version = 0;',
        result: '1 row updated → COMMIT',
      },
      db: { stock: 7, version: 1 },
    },
    {
      title: 'B가 이전 버전으로 수정 시도',
      focus: 'B',
      description:
        'B는 자신이 읽은 값(10)으로 10 - 2 = 8을 저장하려 한다. 하지만 WHERE version = 0 조건에 맞는 행이 더 이상 없다. 현재 버전은 1이다.',
      b: {
        status: 'updated',
        sql: 'UPDATE product SET stock = 8, version = 1\n WHERE id = 1 AND version = 0;',
        result: '0 rows updated',
      },
    },
    {
      title: '버전 충돌 감지',
      focus: 'B',
      description:
        '수정된 행이 0개이므로 JPA 구현체가 충돌로 판단해 OptimisticLockException을 던진다(Spring에서는 보통 ObjectOptimisticLockingFailureException). B의 트랜잭션은 롤백된다. 덕분에 A의 변경(7)이 8로 덮어써지는 갱신 손실이 일어나지 않았다.',
      b: { status: 'conflict', result: 'OptimisticLockException → ROLLBACK' },
    },
    {
      title: '처리 방법 선택: 재시도',
      focus: 'B',
      description:
        '충돌 후에는 (1) 새 트랜잭션에서 최신 데이터를 다시 읽어 재시도하거나 (2) 사용자에게 "다른 사용자가 먼저 수정했습니다"(예: 409 Conflict)를 알린다. 재고 차감처럼 다시 계산하면 되는 작업은 재시도를 택한다.',
      b: { status: 'retrying', seen: undefined, sql: undefined, result: '새 트랜잭션으로 재시도' },
    },
    {
      title: 'B가 최신 버전을 다시 조회',
      focus: 'B',
      description: '재시도한 B는 A가 커밋한 최신 값(stock=7, version=1)을 읽는다.',
      b: { status: 'read', seen: { stock: 7, version: 1 }, sql: SELECT_VERSION, result: 'stock=7, version=1' },
    },
    {
      title: 'B 수정 성공',
      focus: 'B',
      description: '이번에는 WHERE version = 1 조건이 맞아 7 - 2 = 5로 수정되고 버전이 2가 된다. 최종 재고 5 — 두 구매가 모두 올바르게 반영되었다.',
      b: {
        status: 'committed',
        sql: 'UPDATE product SET stock = 5, version = 2\n WHERE id = 1 AND version = 1;',
        result: '1 row updated → COMMIT',
      },
      db: { stock: 5, version: 2 },
    },
  ])
}

function pessimisticSteps(): LockStep[] {
  const initial: LockSimState = {
    a: { status: 'idle' },
    b: { status: 'idle' },
    db: { stock: 10, lockHolder: null, waiting: [], uncommitted: null, plainRead: null },
  }
  return accumulate<LockSimState, StepMeta>(initial, [
    {
      title: '초기 상태',
      focus: 'all',
      description: '재고 10개인 상품이 있다. A는 3개, B는 2개를 구매하려 한다. 이번에는 읽는 시점에 행 잠금을 건다(PESSIMISTIC_WRITE).',
    },
    {
      title: 'A가 쓰기 잠금 획득',
      focus: 'A',
      description: 'A가 SELECT ... FOR UPDATE로 행을 읽으며 배타적 행 잠금을 얻는다. 이 잠금은 A의 트랜잭션이 끝날 때까지 유지된다.',
      a: { status: 'locked', seen: { stock: 10 }, sql: SELECT_FOR_UPDATE, result: 'stock=10 (잠금 획득)' },
      db: { lockHolder: 'A' },
    },
    {
      title: 'B는 충돌하는 잠금을 요청하고 대기',
      focus: 'B',
      description: 'B도 같은 행에 SELECT ... FOR UPDATE를 실행한다. A의 잠금과 충돌하므로 B는 결과를 받지 못하고 대기한다.',
      b: { status: 'waiting', sql: SELECT_FOR_UPDATE, result: '잠금 대기 중…' },
      db: { waiting: ['B'] },
    },
    {
      title: '참고: 잠금 없는 일반 SELECT',
      focus: 'db',
      description:
        '모든 읽기가 막히는 것은 아니다. PostgreSQL, MySQL InnoDB 같은 MVCC 기반 DBMS에서 잠금 없는 일반 SELECT는 대기 없이 커밋된 스냅샷(stock=10)을 읽는다. 대기하는 것은 FOR UPDATE처럼 충돌하는 잠금 요청과 수정이다. (DBMS·격리 수준에 따라 다를 수 있다)',
      db: { plainRead: '다른 세션의 SELECT stock … → 10 (대기 없음)' },
    },
    {
      title: 'A가 수정 (아직 커밋 전)',
      focus: 'A',
      description: 'A가 10 - 3 = 7로 수정한다. 아직 커밋 전이라 다른 트랜잭션에는 보이지 않고, 잠금도 계속 유지된다. B는 여전히 대기 중이다.',
      a: { status: 'updated', sql: 'UPDATE product SET stock = 7 WHERE id = 1;', result: '1 row updated (미커밋)' },
      db: { uncommitted: { by: 'A', stock: 7 }, plainRead: null },
    },
    {
      title: 'A 커밋 → 잠금 해제',
      focus: 'A',
      description: 'A가 커밋하면 변경이 확정되고 행 잠금이 해제된다. 대기하던 B가 이제 잠금을 얻을 수 있다.',
      a: { status: 'committed', sql: 'COMMIT;', result: '커밋 완료, 잠금 해제' },
      db: { stock: 7, lockHolder: null, uncommitted: null },
    },
    {
      title: 'B가 잠금을 얻고 최신 값을 읽음',
      focus: 'B',
      description:
        'B의 SELECT ... FOR UPDATE가 진행되어 잠금을 얻는다. 잠금 읽기는 A가 커밋한 최신 값(7)을 돌려준다. 그래서 B는 7을 기준으로 계산하고, 갱신 손실이 생기지 않는다.',
      b: { status: 'locked', seen: { stock: 7 }, result: 'stock=7 (잠금 획득)' },
      db: { lockHolder: 'B', waiting: [] },
    },
    {
      title: 'B 수정 후 커밋',
      focus: 'B',
      description: 'B가 7 - 2 = 5로 수정하고 커밋한다. 잠금이 해제되고 최종 재고는 5다. 실패나 재시도 없이 순서대로 처리되었다.',
      b: { status: 'committed', sql: 'UPDATE product SET stock = 5 WHERE id = 1;\nCOMMIT;', result: '커밋 완료, 잠금 해제' },
      db: { stock: 5, lockHolder: null },
    },
    {
      title: '대가: 대기 비용과 교착 상태',
      focus: 'all',
      description:
        'B는 A가 끝날 때까지 아무 일도 못 하고 기다렸다. 요청이 몰리면 대기가 길어지고 커넥션이 묶인다. 또 A가 행1→행2, B가 행2→행1 순서로 잠그면 서로를 기다리는 교착 상태(Deadlock)가 생길 수 있다. DBMS가 감지해 한쪽을 롤백시키므로, 잠금 순서를 통일하고 잠금 타임아웃과 재시도를 설계해야 한다.',
    },
  ])
}

export function buildLockSteps(scenario: LockScenario): LockStep[] {
  return scenario === 'optimistic' ? optimisticSteps() : pessimisticSteps()
}
