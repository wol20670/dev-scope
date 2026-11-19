import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Database, Hourglass, Lock, LockOpen, RefreshCw, User, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStepPlayer } from '../../../lib/simulation/useStepPlayer'
import { SegmentedTabs, SimulatorShell } from '../SimulatorShell'
import { buildLockSteps, PURCHASE, type LockScenario, type LockStep, type TxState, type TxStatus } from './model'

const statusUi: Record<TxStatus, { label: string; cls: string; icon?: typeof Lock }> = {
  idle: { label: '대기 전', cls: 'text-subtle border-line bg-raised' },
  read: { label: '조회함', cls: 'text-sky-300 border-sky-400/30 bg-sky-400/10' },
  locked: { label: '잠금 보유', cls: 'text-sky-200 border-sky-300/40 bg-sky-400/15', icon: Lock },
  waiting: { label: '잠금 대기', cls: 'text-amber-300 border-amber-400/40 bg-amber-400/10', icon: Hourglass },
  updated: { label: '수정 실행', cls: 'text-sky-300 border-sky-400/30 bg-sky-400/10' },
  committed: { label: '커밋 성공', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10', icon: CheckCircle2 },
  conflict: { label: '버전 충돌', cls: 'text-rose-300 border-rose-400/45 bg-rose-400/10', icon: XCircle },
  retrying: { label: '재시도 준비', cls: 'text-violet-300 border-violet-400/40 bg-violet-400/10', icon: RefreshCw },
}

export default function LockingSimulator() {
  const [scenario, setScenario] = useState<LockScenario>('optimistic')
  return (
    // 시나리오가 바뀌면 재생 상태를 새로 시작한다
    <LockingRun key={scenario} scenario={scenario} onScenarioChange={setScenario} />
  )
}

function LockingRun({ scenario, onScenarioChange }: { scenario: LockScenario; onScenarioChange: (s: LockScenario) => void }) {
  const steps = useMemo(() => buildLockSteps(scenario), [scenario])
  const player = useStepPlayer(steps.length)
  const step = steps[player.index]

  return (
    <SimulatorShell
      title="낙관적 락 vs 비관적 락"
      player={player}
      stepTitles={steps.map((s) => s.title)}
      description={step.description}
      toolbar={
        <SegmentedTabs
          label="시나리오"
          value={scenario}
          onChange={onScenarioChange}
          options={[
            { value: 'optimistic', label: '낙관적 락' },
            { value: 'pessimistic', label: '비관적 락' },
          ]}
        />
      }
      note={
        <>
          단순화한 모델이다. 실제 대기·조회 동작은 DBMS(PostgreSQL, MySQL InnoDB, Oracle 등)와 격리 수준에 따라 다르다. 비관적
          시나리오는 MVCC 기반 DBMS의 READ COMMITTED 수준을 가정했다.
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1.1fr_1fr]">
        <TxCard name="A" qty={PURCHASE.a} tx={step.a} focused={step.focus === 'A' || step.focus === 'all'} />
        <DbCard step={step} scenario={scenario} />
        <TxCard name="B" qty={PURCHASE.b} tx={step.b} focused={step.focus === 'B' || step.focus === 'all'} />
      </div>
    </SimulatorShell>
  )
}

function TxCard({ name, qty, tx, focused }: { name: 'A' | 'B'; qty: number; tx: TxState; focused: boolean }) {
  const s = statusUi[tx.status]
  const Icon = s.icon
  return (
    <div
      className={`flex min-w-0 flex-col rounded-xl border p-3.5 transition-colors ${
        focused ? 'border-line-strong bg-raised' : 'border-line bg-surface opacity-75'
      }`}
      data-testid={`tx-${name}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-overlay text-accent">
          <User aria-hidden className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">트랜잭션 {name}</p>
          <p className="text-[11px] text-subtle">{qty}개 구매</p>
        </div>
        <motion.span
          key={tx.status}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
          data-testid={`tx-${name}-status`}
        >
          {Icon && <Icon aria-hidden className={`size-3 ${tx.status === 'waiting' ? 'motion-safe:animate-pulse' : ''}`} />}
          {s.label}
        </motion.span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-canvas/60 px-2.5 py-1.5">
          <dt className="text-subtle">읽은 재고</dt>
          <dd className="font-mono text-sm text-fg">{tx.seen ? tx.seen.stock : '—'}</dd>
        </div>
        <div className="rounded-lg bg-canvas/60 px-2.5 py-1.5">
          <dt className="text-subtle">읽은 버전</dt>
          <dd className="font-mono text-sm text-fg">{tx.seen?.version ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-2.5 min-h-[4.5rem] rounded-lg border border-line bg-[#0a0f1a] p-2.5 font-mono text-[11px] leading-relaxed">
        {tx.sql ? (
          <>
            <pre className="whitespace-pre-wrap text-sky-200/90">{tx.sql}</pre>
            {tx.result && <p className={`mt-1.5 ${tx.status === 'conflict' ? 'text-rose-300' : 'text-subtle'}`}>→ {tx.result}</p>}
          </>
        ) : (
          <p className="text-subtle">{tx.result ?? '-- 실행한 SQL 없음'}</p>
        )}
      </div>
    </div>
  )
}

function DbCard({ step, scenario }: { step: LockStep; scenario: LockScenario }) {
  const { db } = step
  const focused = step.focus === 'db' || step.focus === 'all'
  return (
    <div
      className={`flex min-w-0 flex-col rounded-xl border p-3.5 ${focused ? 'border-accent/50 bg-raised' : 'border-line-strong bg-surface'}`}
      data-testid="db"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Database aria-hidden className="size-4" />
        </span>
        <p className="text-sm font-semibold text-fg">Database · product</p>
      </div>

      <table className="mt-3 w-full text-left font-mono text-xs">
        <thead className="text-subtle">
          <tr>
            <th className="pb-1 font-normal">id</th>
            <th className="pb-1 font-normal">stock</th>
            {scenario === 'optimistic' && <th className="pb-1 font-normal">version</th>}
          </tr>
        </thead>
        <tbody>
          <tr className="text-base text-fg">
            <td>1</td>
            <td>
              <AnimatedValue value={db.stock} testId="db-stock" />
            </td>
            {scenario === 'optimistic' && (
              <td>
                <AnimatedValue value={db.version ?? 0} testId="db-version" />
              </td>
            )}
          </tr>
        </tbody>
      </table>

      {scenario === 'pessimistic' && (
        <div className="mt-3 space-y-2 text-xs">
          <div
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
              db.lockHolder ? 'border-sky-300/40 bg-sky-400/10 text-sky-200' : 'border-line bg-canvas/50 text-subtle'
            }`}
            data-testid="db-lock"
          >
            {db.lockHolder ? <Lock aria-hidden className="size-3.5" /> : <LockOpen aria-hidden className="size-3.5" />}
            {db.lockHolder ? `행 잠금: 트랜잭션 ${db.lockHolder} 보유` : '행 잠금 없음'}
          </div>
          <div className="rounded-lg border border-line bg-canvas/50 px-2.5 py-2 text-muted">
            대기열:{' '}
            {db.waiting.length ? (
              <span className="font-semibold text-amber-300">{db.waiting.map((w) => `트랜잭션 ${w}`).join(', ')}</span>
            ) : (
              '없음'
            )}
          </div>
          <AnimatePresence>
            {db.uncommitted && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-dashed border-line-strong px-2.5 py-2 text-muted"
              >
                커밋 전 변경: stock = {db.uncommitted.stock} (트랜잭션 {db.uncommitted.by}에게만 보임)
              </motion.p>
            )}
            {db.plainRead && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-2 text-emerald-200"
              >
                {db.plainRead}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {scenario === 'optimistic' && (
        <p className="mt-3 rounded-lg border border-line bg-canvas/50 px-2.5 py-2 text-xs text-muted">
          잠금 없음 — 수정 시 <code className="text-sky-200">WHERE version = ?</code> 조건으로 충돌을 감지한다.
        </p>
      )}
    </div>
  )
}

function AnimatedValue({ value, testId }: { value: number; testId: string }) {
  return (
    <span className="relative inline-block min-w-[2ch]" data-testid={testId} data-value={value}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0, color: '#7dd3fc' }}
          animate={{ y: 0, opacity: 1, color: '#e6ecf5' }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
