import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Database, Hourglass, Lock, Table2, Undo2, User, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStepPlayer } from '../../../lib/simulation/useStepPlayer'
import { SegmentedTabs, SimulatorShell } from '../SimulatorShell'
import {
  anomalyInfo,
  buildIsolationSteps,
  dbmsLabel,
  getOutcome,
  levels,
  outcomeLabel,
  type Anomaly,
  type Dbms,
  type IsolationLevel,
  type IsoStep,
  type Outcome,
  type TxStatus,
  type TxView,
} from './model'

interface Config {
  anomaly: Anomaly
  level: IsolationLevel
  dbms: Dbms
}

export default function IsolationSimulator() {
  const [config, setConfig] = useState<Config>({ anomaly: 'non-repeatable-read', level: 'READ COMMITTED', dbms: 'postgresql' })
  // 비교표 펼침 상태는 조합이 바뀌어도 유지
  const [showMatrix, setShowMatrix] = useState(false)
  const key = `${config.anomaly}|${config.level}|${config.dbms}`
  // 조합이 바뀌면 처음 단계부터 다시 시작
  return (
    <IsolationRun
      key={key}
      config={config}
      onChange={(c) => setConfig((prev) => ({ ...prev, ...c }))}
      showMatrix={showMatrix}
      onToggleMatrix={() => setShowMatrix((v) => !v)}
    />
  )
}

function IsolationRun({
  config,
  onChange,
  showMatrix,
  onToggleMatrix,
}: {
  config: Config
  onChange: (c: Partial<Config>) => void
  showMatrix: boolean
  onToggleMatrix: () => void
}) {
  const { anomaly, level, dbms } = config
  const steps = useMemo(() => buildIsolationSteps(anomaly, level, dbms), [anomaly, level, dbms])
  const player = useStepPlayer(steps.length)
  const step = steps[player.index]
  const outcome = getOutcome(anomaly, level, dbms)
  return (
    <SimulatorShell
      title="트랜잭션 격리 수준"
      player={player}
      stepTitles={steps.map((s) => s.title)}
      description={step.description}
      toolbar={
        <SegmentedTabs
          label="이상 현상"
          value={anomaly}
          onChange={(v) => onChange({ anomaly: v })}
          options={(Object.keys(anomalyInfo) as Anomaly[]).map((a) => ({ value: a, label: anomalyInfo[a].label }))}
        />
      }
      note="PostgreSQL과 MySQL InnoDB 공식 문서의 동작을 단순화한 모델이다. 읽기 이상 현상만 다루며, 쓰기 충돌(갱신 손실, 직렬화 실패로 인한 롤백)은 표현하지 않는다. 잠기는 범위와 세부 동작은 버전, 인덱스, 실행 계획, autocommit 설정에 따라 달라질 수 있다."
    >
      {/* 조합 선택 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle">격리 수준</span>
          <SegmentedTabs label="격리 수준" value={level} onChange={(v) => onChange({ level: v })} options={levels.map((l) => ({ value: l, label: l }))} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle">DBMS</span>
          <SegmentedTabs
            label="DBMS"
            value={dbms}
            onChange={(v) => onChange({ dbms: v })}
            options={(['postgresql', 'mysql'] as Dbms[]).map((d) => ({ value: d, label: dbmsLabel[d] }))}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1.15fr_1fr]">
        <TxCard name="T1" role="읽는 쪽" tx={step.t1} focused={step.focus === 'T1' || step.focus === 'all'} />
        <TableCard step={step} anomaly={anomaly} />
        <TxCard name="T2" role="쓰는 쪽" tx={step.t2} focused={step.focus === 'T2' || step.focus === 'all'} />
      </div>

      <AnimatePresence>
        {player.isLast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${outcomeStyle[outcome].box}`}
            data-testid="iso-verdict"
            data-outcome={outcome}
          >
            <OutcomeIcon outcome={outcome} />
            <span className="font-semibold">
              {anomalyInfo[anomaly].label} · {outcomeLabel[outcome]}
            </span>
            <span className="text-xs opacity-80">
              ({dbmsLabel[dbms]}, {level})
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 비교표: 처음엔 접어 두어 결과를 먼저 예상해 보게 한다 */}
      <div className="mt-3 rounded-xl border border-line">
        <button
          type="button"
          onClick={onToggleMatrix}
          aria-expanded={showMatrix}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted hover:text-fg"
        >
          <Table2 aria-hidden className="size-3.5" />
          {showMatrix ? '결과 비교표 숨기기' : `격리 수준별 결과 비교표 보기 (${anomalyInfo[anomaly].label})`}
        </button>
        {showMatrix && <OutcomeMatrix anomaly={anomaly} level={level} dbms={dbms} onPick={onChange} />}
      </div>
    </SimulatorShell>
  )
}

const statusUi: Record<TxStatus, { label: string; cls: string; icon?: typeof Lock }> = {
  idle: { label: '시작 전', cls: 'text-subtle border-line bg-raised' },
  active: { label: '진행 중', cls: 'text-sky-300 border-sky-400/30 bg-sky-400/10' },
  waiting: { label: '잠금 대기', cls: 'text-amber-300 border-amber-400/40 bg-amber-400/10', icon: Hourglass },
  committed: { label: '커밋', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10', icon: CheckCircle2 },
  rolledback: { label: '롤백', cls: 'text-violet-300 border-violet-400/40 bg-violet-400/10', icon: Undo2 },
}

const toneCls = { neutral: 'text-subtle', good: 'text-emerald-300', bad: 'text-rose-300' }

function TxCard({ name, role, tx, focused }: { name: 'T1' | 'T2'; role: string; tx: TxView; focused: boolean }) {
  const s = statusUi[tx.status]
  const Icon = s.icon
  return (
    <div
      className={`flex min-w-0 flex-col rounded-xl border p-3.5 transition-colors ${focused ? 'border-line-strong bg-raised' : 'border-line bg-surface opacity-75'}`}
      data-testid={`iso-${name}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-overlay text-accent">
          <User aria-hidden className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">트랜잭션 {name}</p>
          <p className="text-[11px] text-subtle">{role}</p>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
          data-testid={`iso-${name}-status`}
        >
          {Icon && <Icon aria-hidden className={`size-3 ${tx.status === 'waiting' ? 'motion-safe:animate-pulse' : ''}`} />}
          {s.label}
        </span>
      </div>
      <div className="mt-3 min-h-[5.5rem] flex-1 rounded-lg border border-line bg-[#0a0f1a] p-2.5 font-mono text-[11px] leading-relaxed">
        {tx.sql ? <pre className="whitespace-pre-wrap text-sky-200/90">{tx.sql}</pre> : <p className="text-subtle">-- 아직 실행한 SQL 없음</p>}
        {tx.result && (
          <p className={`mt-1.5 ${toneCls[tx.tone ?? 'neutral']}`} data-testid={`iso-${name}-result`}>
            → {tx.result}
          </p>
        )}
      </div>
    </div>
  )
}

function TableCard({ step, anomaly }: { step: IsoStep; anomaly: Anomaly }) {
  const focused = step.focus === 'db' || step.focus === 'all'
  const pending = step.pending
  const shownRows = pending?.kind === 'insert' ? [...step.rows, pending.row] : step.rows
  return (
    <div className={`flex min-w-0 flex-col rounded-xl border p-3.5 ${focused ? 'border-accent/50 bg-raised' : 'border-line-strong bg-surface'}`} data-testid="iso-db">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Database aria-hidden className="size-4" />
        </span>
        <p className="text-sm font-semibold text-fg">product</p>
        {anomaly === 'phantom-read' && <span className="ml-auto font-mono text-[10px] text-subtle">price &lt; 20000 → 강조</span>}
      </div>
      <table className="mt-3 w-full text-left font-mono text-[11.5px]">
        <thead className="text-subtle">
          <tr>
            <th className="pb-1 font-normal">id</th>
            <th className="pb-1 font-normal">name</th>
            <th className="pb-1 text-right font-normal">price</th>
          </tr>
        </thead>
        <tbody>
          {shownRows.map((row) => {
            const isPendingInsert = pending?.kind === 'insert' && pending.row.id === row.id
            const pendingUpdate = pending?.kind === 'update' && pending.row.id === row.id ? pending.row : null
            const inRange = anomaly === 'phantom-read' && row.price < 20000
            return (
              <motion.tr
                key={row.id}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`border-t border-line ${isPendingInsert ? 'bg-amber-400/10 text-amber-200' : inRange ? 'text-sky-200' : 'text-fg'}`}
              >
                <td className="py-1.5">{row.id}</td>
                <td className="py-1.5">
                  {row.name}
                  {isPendingInsert && <span className="ml-1 text-[10px] text-amber-300">(T2 미커밋)</span>}
                </td>
                <td className="py-1.5 text-right" data-testid={`iso-row-${row.id}-price`}>
                  {pendingUpdate ? (
                    <>
                      <span className="text-subtle line-through">{row.price.toLocaleString('ko-KR')}</span>
                      <span className="ml-1 text-amber-200">{pendingUpdate.price.toLocaleString('ko-KR')}</span>
                    </>
                  ) : (
                    row.price.toLocaleString('ko-KR')
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
      {pending && (
        <p className="mt-2 rounded-lg border border-dashed border-amber-400/40 px-2.5 py-1.5 text-[11px] text-amber-200/90">
          노란색 = T2의 커밋되지 않은 변경
        </p>
      )}
      <div className="mt-2 space-y-1 text-[11px]" data-testid="iso-locks">
        {step.locks.length ? (
          step.locks.map((l) => (
            <p key={l} className="flex items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-400/5 px-2.5 py-1.5 text-sky-200">
              <Lock aria-hidden className="size-3" /> {l}
            </p>
          ))
        ) : (
          <p className="px-0.5 text-subtle">잠금 없음</p>
        )}
      </div>
    </div>
  )
}

const outcomeStyle: Record<Outcome, { box: string; cell: string }> = {
  anomaly: { box: 'border-rose-400/40 bg-rose-400/10 text-rose-200', cell: 'text-rose-300' },
  snapshot: { box: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200', cell: 'text-emerald-300' },
  'committed-read': { box: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200', cell: 'text-emerald-300' },
  'lock-wait': { box: 'border-amber-400/40 bg-amber-400/10 text-amber-200', cell: 'text-amber-300' },
}

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  if (outcome === 'anomaly') return <XCircle aria-hidden className="size-4 shrink-0" />
  if (outcome === 'lock-wait') return <Hourglass aria-hidden className="size-4 shrink-0" />
  return <CheckCircle2 aria-hidden className="size-4 shrink-0" />
}

function OutcomeMatrix({ anomaly, level, dbms, onPick }: { anomaly: Anomaly; level: IsolationLevel; dbms: Dbms; onPick: (c: Partial<Config>) => void }) {
  return (
    <div className="overflow-x-auto border-t border-line p-3">
      <table className="w-full min-w-[480px] text-left text-[11.5px]" data-testid="iso-matrix">
        <caption className="sr-only">{anomalyInfo[anomaly].label} 격리 수준별 결과</caption>
        <thead className="text-subtle">
          <tr>
            <th className="pb-2 font-normal">격리 수준</th>
            {(['postgresql', 'mysql'] as Dbms[]).map((d) => (
              <th key={d} className="pb-2 font-normal">
                {dbmsLabel[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l} className="border-t border-line">
              <th scope="row" className="py-1.5 pr-3 font-mono font-normal text-muted">
                {l}
              </th>
              {(['postgresql', 'mysql'] as Dbms[]).map((d) => {
                const o = getOutcome(anomaly, l, d)
                const current = l === level && d === dbms
                return (
                  <td key={d} className="py-1">
                    <button
                      type="button"
                      onClick={() => onPick({ level: l, dbms: d })}
                      aria-pressed={current}
                      className={`rounded-md px-2 py-1 text-left transition-colors hover:bg-overlay ${outcomeStyle[o].cell} ${current ? 'bg-overlay ring-1 ring-accent/60' : ''}`}
                    >
                      {outcomeLabel[o]}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-subtle">셀을 누르면 해당 조합으로 시뮬레이션한다. SQL 표준은 "허용되는 현상"만 정의하며, 실제 방지 방식은 DBMS가 정한다.</p>
    </div>
  )
}
