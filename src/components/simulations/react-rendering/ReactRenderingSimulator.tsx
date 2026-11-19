import { motion } from 'motion/react'
import { Minus, Plus, SunMoon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStepPlayer } from '../../../lib/simulation/useStepPlayer'
import { SimulatorShell } from '../SimulatorShell'
import {
  actionInfo,
  initialCounts,
  initialState,
  initialStep,
  simulateUpdate,
  tree,
  type Action,
  type AppState,
  type NodeId,
  type NodeStatus,
  type RenderStep,
} from './model'

interface Run {
  id: number
  steps: RenderStep[]
}

export default function ReactRenderingSimulator() {
  const [state, setState] = useState<AppState>(initialState)
  const [counts, setCounts] = useState(initialCounts)
  const [memoSidebar, setMemoSidebar] = useState(false)
  const [run, setRun] = useState<Run>(() => ({ id: 0, steps: [initialStep(initialState, initialCounts())] }))

  const dispatch = (action: Action) => {
    const r = simulateUpdate(state, action, memoSidebar, counts)
    setState(r.next)
    setCounts(r.counts)
    setRun((prev) => ({ id: prev.id + 1, steps: r.steps }))
  }

  const reset = () => {
    setState(initialState)
    setCounts(initialCounts())
    setRun((prev) => ({ id: prev.id + 1, steps: [initialStep(initialState, initialCounts())] }))
  }

  return (
    <RenderRun
      // 새 업데이트마다 플레이어를 새로 시작하고 자동 재생한다
      key={run.id}
      run={run}
      autoPlay={run.id > 0}
      memoSidebar={memoSidebar}
      onMemoChange={setMemoSidebar}
      onAction={dispatch}
      onResetAll={reset}
    />
  )
}

function RenderRun({
  run,
  autoPlay,
  memoSidebar,
  onMemoChange,
  onAction,
  onResetAll,
}: {
  run: Run
  autoPlay: boolean
  memoSidebar: boolean
  onMemoChange: (v: boolean) => void
  onAction: (a: Action) => void
  onResetAll: () => void
}) {
  const player = useStepPlayer(run.steps.length, 2000, { autoPlay })
  const step = run.steps[player.index]

  return (
    <SimulatorShell
      title="React 렌더링 과정"
      player={player}
      stepTitles={run.steps.map((s) => s.title)}
      description={step.description}
      note="단순화한 모델이다. 실제 React는 여러 업데이트를 배칭하고, 우선순위에 따라 렌더링을 나누거나 중단할 수 있다. React Compiler를 쓰면 memo 없이도 자동으로 건너뛰는 경우가 생긴다. 개발 모드의 Strict Mode는 컴포넌트를 두 번 호출할 수 있다."
    >
      {/* 조작 */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="state 변경">
        <ActionButton onClick={() => onAction('increment')} icon={<Plus aria-hidden className="size-3.5" />} code={actionInfo.increment.code} />
        <ActionButton onClick={() => onAction('same')} icon={<Minus aria-hidden className="size-3.5" />} code={actionInfo.same.code} />
        <ActionButton onClick={() => onAction('theme')} icon={<SunMoon aria-hidden className="size-3.5" />} code="setTheme(toggle)" />
        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted">
          <input type="checkbox" checked={memoSidebar} onChange={(e) => onMemoChange(e.target.checked)} className="size-3.5 accent-sky-400" />
          Sidebar를 <code className="text-sky-200">memo</code>로 감싸기
        </label>
        <button type="button" onClick={onResetAll} className="rounded-lg px-2 py-1.5 text-xs text-subtle hover:bg-raised hover:text-fg">
          state 초기화
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* 컴포넌트 트리 */}
        <div className="min-w-0 rounded-xl border border-line bg-surface p-3" aria-label="컴포넌트 트리">
          <p className="mb-3 flex items-center justify-between text-[12px] font-semibold text-fg">
            컴포넌트 트리
            <PhasePill phase={step.phase} />
          </p>
          <ul className="space-y-1.5" data-testid="component-tree">
            <TreeRow id="App" depth={0} step={step} memoSidebar={memoSidebar} />
          </ul>
          <Legend />
        </div>

        {/* DOM 변경 + 미리보기 */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-xl border border-line bg-[#0a0f1a] p-3">
            <p className="mb-2 text-[12px] font-semibold text-fg">커밋된 DOM 변경</p>
            {step.domChanges.length === 0 ? (
              <p className="font-mono text-[11px] text-subtle" data-testid="dom-changes">
                {step.phase === 'render' ? '// 렌더 단계: 아직 DOM 변경 없음' : '// DOM 변경 없음'}
              </p>
            ) : (
              <ul className="space-y-2 font-mono text-[11px]" data-testid="dom-changes">
                {step.domChanges.map((c) => (
                  <li key={c.id}>
                    <p className="text-subtle">{c.id}</p>
                    <p className="text-rose-300/90">- {c.before}</p>
                    <p className="text-emerald-300">+ {c.after}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <UiPreview ui={step.ui} />
        </div>
      </div>
    </SimulatorShell>
  )
}

function ActionButton({ onClick, icon, code }: { onClick: () => void; icon: ReactNode; code: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-2.5 py-1.5 font-mono text-[11.5px] text-sky-100 transition-colors hover:bg-accent/20"
    >
      {icon}
      {code}
    </button>
  )
}

const statusStyle: Record<NodeStatus, { cls: string; label: string }> = {
  idle: { cls: 'border-line bg-raised text-muted', label: '' },
  trigger: { cls: 'border-amber-400/60 bg-amber-400/10 text-amber-100', label: '업데이트 예약' },
  rendered: { cls: 'border-sky-400/60 bg-sky-400/15 text-sky-100', label: '렌더링' },
  skipped: { cls: 'border-dashed border-line-strong bg-transparent text-subtle', label: '건너뜀' },
  committed: { cls: 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100', label: 'DOM 변경' },
  unchanged: { cls: 'border-sky-400/30 bg-sky-400/5 text-sky-200/80', label: '렌더됨 · DOM 그대로' },
}

function TreeRow({ id, depth, step, memoSidebar, inheritedSkip = false }: { id: NodeId; depth: number; step: RenderStep; memoSidebar: boolean; inheritedSkip?: boolean }) {
  const node = tree[id]
  const status: NodeStatus = step.status[id] ?? (inheritedSkip ? 'skipped' : 'idle')
  const s = statusStyle[status]
  const name = id === 'Sidebar' && memoSidebar ? 'memo(Sidebar)' : id
  return (
    <li>
      <motion.div
        layout="position"
        animate={status === 'committed' || status === 'trigger' ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors ${s.cls}`}
        style={{ marginLeft: depth * 18 }}
        data-testid={`node-${id}`}
        data-status={status}
      >
        <span className="font-mono font-semibold">&lt;{name} /&gt;</span>
        {node.state && <span className="rounded bg-overlay px-1 font-mono text-[10px] text-amber-200/90">state: {node.state}</span>}
        {node.propsLabel && <span className="font-mono text-[10px] text-subtle">props: {node.propsLabel}</span>}
        {s.label && <span className="ml-auto shrink-0 text-[10.5px] font-medium">{s.label}</span>}
        <span className={`shrink-0 font-mono text-[10px] text-subtle ${s.label ? '' : 'ml-auto'}`} title="누적 렌더 횟수">
          ×{step.renderCounts[id]}
        </span>
      </motion.div>
      {node.children.length > 0 && (
        <ul className="mt-1.5 space-y-1.5">
          {node.children.map((c) => (
            <TreeRow key={c} id={c} depth={depth + 1} step={step} memoSidebar={memoSidebar} inheritedSkip={status === 'skipped'} />
          ))}
        </ul>
      )}
    </li>
  )
}

function PhasePill({ phase }: { phase: RenderStep['phase'] }) {
  const map: Record<RenderStep['phase'], string> = {
    initial: '대기',
    trigger: 'Trigger',
    render: 'Render phase',
    commit: 'Commit phase',
    paint: 'Paint',
    bailout: 'Bail out',
  }
  return <span className="rounded bg-overlay px-1.5 py-0.5 font-mono text-[10px] font-normal text-accent">{map[phase]}</span>
}

function Legend() {
  const items: NodeStatus[] = ['trigger', 'rendered', 'unchanged', 'committed', 'skipped']
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3" aria-label="범례">
      {items.map((k) => (
        <li key={k} className={`rounded-md border px-1.5 py-0.5 text-[10px] ${statusStyle[k].cls}`}>
          {statusStyle[k].label}
        </li>
      ))}
      <li className="px-1 text-[10px] text-subtle">×N = 누적 렌더 횟수</li>
    </ul>
  )
}

function UiPreview({ ui }: { ui: AppState }) {
  const light = ui.theme === 'light'
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-2 text-[12px] font-semibold text-fg">화면 (브라우저)</p>
      <div
        className={`rounded-lg border p-3 text-[12px] transition-colors ${light ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-line-strong bg-canvas text-fg'}`}
        data-testid="ui-preview"
      >
        <div className={`mb-2 border-b pb-1.5 font-semibold ${light ? 'border-slate-200' : 'border-line'}`}>테마: {light ? '라이트' : '다크'}</div>
        <div className="flex gap-3">
          <div className="flex-1">
            <p>
              count: <span className="font-mono font-semibold">{ui.count}</span>
            </p>
            <span className={`mt-1.5 inline-block rounded px-2 py-0.5 text-[11px] ${light ? 'bg-sky-600 text-white' : 'bg-accent text-canvas'}`}>+1</span>
          </div>
          <div className={`w-20 rounded border px-2 py-1 text-[11px] ${light ? 'border-slate-200' : 'border-line'}`}>메뉴</div>
        </div>
      </div>
    </div>
  )
}
