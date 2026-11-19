import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Eye, EyeOff, Terminal } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useStepPlayer } from '../../../lib/simulation/useStepPlayer'
import { SegmentedTabs, SimulatorShell } from '../SimulatorShell'
import { programs, runEventLoop, type LoopPhase, type QueueItem } from './model'

const phaseLabel: Record<LoopPhase, string> = {
  idle: '대기',
  script: '스크립트 실행',
  microtask: '마이크로태스크 처리',
  timer: '타이머 만료',
  task: '태스크 실행',
  done: '완료',
}

export default function EventLoopSimulator() {
  const [programId, setProgramId] = useState(programs[0].id)
  return <EventLoopRun key={programId} programId={programId} onProgramChange={setProgramId} />
}

function EventLoopRun({ programId, onProgramChange }: { programId: string; onProgramChange: (id: string) => void }) {
  const program = programs.find((p) => p.id === programId) ?? programs[0]
  const snaps = useMemo(() => runEventLoop(program), [program])
  const player = useStepPlayer(snaps.length, 1800)
  const snap = snaps[player.index]
  const finalOutput = snaps[snaps.length - 1].output
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <SimulatorShell
      title="JavaScript 이벤트 루프"
      player={player}
      stepTitles={snaps.map((s) => s.title)}
      description={snap.description}
      toolbar={
        <SegmentedTabs label="예제" value={program.id} onChange={onProgramChange} options={programs.map((p) => ({ value: p.id, label: p.title }))} />
      }
      note="브라우저 기준의 단순화 모델이다. 렌더링 단계, requestAnimationFrame, 여러 태스크 소스의 우선순위는 표현하지 않는다. Node.js는 process.nextTick과 고유한 단계(phase)가 있어 순서가 다를 수 있다."
    >
      <LayoutGroup id={`event-loop-${program.id}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* 코드 */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-[#0a0f1a]">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[11px] text-subtle">
              <span className="font-mono">example.js</span>
              <span className="rounded bg-overlay px-1.5 py-0.5 font-mono text-[10px] text-muted" data-testid="loop-phase">
                {phaseLabel[snap.phase]}
                {snap.clock > 0 && ` · ${snap.clock}ms`}
              </span>
            </div>
            <pre className="overflow-x-auto py-2 font-mono text-[12px] leading-[1.7]">
              {program.code.split('\n').map((text, i) => {
                const active = snap.line === i + 1
                return (
                  <div
                    key={i}
                    className={`flex pr-3 transition-colors ${active ? 'bg-accent/15' : ''}`}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className={`w-9 shrink-0 pr-3 text-right select-none ${active ? 'text-accent' : 'text-subtle/60'}`}>{i + 1}</span>
                    <code className={active ? 'text-fg' : 'text-fg/70'}>{text || ' '}</code>
                  </div>
                )
              })}
            </pre>
          </div>

          {/* 런타임 */}
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <Panel title="Call Stack" hint="위가 현재 실행 중" testId="call-stack" className="row-span-2">
              <div className="flex min-h-[9rem] flex-col-reverse justify-start gap-1.5">
                <ItemList items={snap.stack} tone="stack" empty="비어 있음" />
              </div>
            </Panel>
            <Panel title="Web APIs" hint="타이머 관리" testId="web-apis">
              <ItemList
                items={snap.webApis.map((t) => ({ ...t, label: `${t.label} · ${t.delay}ms` }))}
                tone="timer"
                empty="등록된 타이머 없음"
              />
            </Panel>
            <Panel title="Microtask Queue" hint="먼저, 전부 처리" testId="microtask-queue">
              <ItemList items={snap.microtasks} tone="micro" empty="비어 있음" />
            </Panel>
            <Panel title="Task Queue" hint="한 번에 하나씩" testId="task-queue" className="col-span-2">
              <div className="flex flex-wrap gap-1.5">
                <ItemList items={snap.tasks} tone="task" empty="비어 있음" />
              </div>
            </Panel>
          </div>
        </div>
      </LayoutGroup>

      {/* 콘솔 */}
      <div className="mt-3 rounded-xl border border-line bg-[#0a0f1a]">
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[11px] text-subtle">
          <Terminal aria-hidden className="size-3.5" /> Console
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            aria-expanded={showAnswer}
            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-overlay hover:text-fg"
          >
            {showAnswer ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
            {showAnswer ? '정답 숨기기' : '최종 출력 순서 보기'}
          </button>
        </div>
        <ol className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 px-3 py-2 font-mono text-[12.5px]" data-testid="console-output" aria-label="콘솔 출력">
          {snap.output.length === 0 && <li className="text-subtle">// 아직 출력 없음</li>}
          <AnimatePresence initial={false}>
            {snap.output.map((o, i) => (
              <motion.li
                key={`${i}-${o}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-md border px-2 py-0.5 ${
                  i === snap.output.length - 1 && snap.line !== null && snap.phase !== 'done'
                    ? 'border-accent/50 bg-accent/10 text-sky-100'
                    : 'border-line text-fg/85'
                }`}
              >
                <span className="mr-1 text-subtle">{i + 1}.</span>
                {o}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        {showAnswer && (
          <p className="border-t border-line px-3 py-2 font-mono text-[12px] text-emerald-300" data-testid="final-output">
            최종: {finalOutput.join(' → ')}
          </p>
        )}
      </div>
    </SimulatorShell>
  )
}

function Panel({ title, hint, testId, className = '', children }: { title: string; hint: string; testId: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`min-w-0 rounded-xl border border-line bg-surface p-2.5 ${className}`} data-testid={testId}>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[12px] font-semibold text-fg">{title}</h4>
        <span className="truncate text-[10px] text-subtle">{hint}</span>
      </header>
      {children}
    </section>
  )
}

const toneCls = {
  stack: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
  timer: 'border-line-strong bg-raised text-muted',
  micro: 'border-violet-400/40 bg-violet-400/10 text-violet-100',
  task: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
}

function ItemList({ items, tone, empty }: { items: QueueItem[]; tone: keyof typeof toneCls; empty: string }) {
  if (items.length === 0) return <p className="py-1 text-[11px] text-subtle">{empty}</p>
  return (
    <>
      {items.map((item) => (
        <motion.div
          key={item.id}
          // 같은 콜백이 Web APIs → Task Queue → Call Stack으로 이동하는 모습을 이어서 보여 준다
          layoutId={item.id}
          layout="position"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className={`truncate rounded-md border px-2 py-1 font-mono text-[11px] ${toneCls[tone]}`}
          title={item.label}
        >
          {item.label}
        </motion.div>
      ))}
    </>
  )
}

