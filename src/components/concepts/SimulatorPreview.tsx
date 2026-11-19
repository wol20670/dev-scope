import { Database, Hourglass, Lock } from 'lucide-react'
import type { SimulatorId } from '../../types/concept'

/** 메인 페이지 카드에 쓰는 시뮬레이터 구성 요약 그림 (정적). 실제 시뮬레이터의 화면 구성을 축약한 것이다. */
export function SimulatorPreview({ id }: { id: SimulatorId }) {
  return (
    <div aria-hidden className="h-28 font-mono text-[10.5px] select-none">
      {id === 'locking' && <LockingPreview />}
      {id === 'isolation' && <IsolationPreview />}
      {id === 'event-loop' && <EventLoopPreview />}
      {id === 'react-rendering' && <ReactPreview />}
      {id === 'http-request' && <HttpPreview />}
    </div>
  )
}

const box = 'rounded-md border border-line-strong bg-raised px-2 py-1 text-muted'

function LockingPreview() {
  return (
    <div className="grid h-full grid-cols-3 items-center gap-2">
      <div className={`${box} space-y-1`}>
        <p className="text-fg">Tx A</p>
        <p className="flex items-center gap-1 text-sky-300">
          <Lock className="size-3" /> FOR UPDATE
        </p>
      </div>
      <div className={`${box} space-y-1 border-accent/40 text-center`}>
        <Database className="mx-auto size-4 text-accent" />
        <p className="text-fg">stock 10</p>
      </div>
      <div className={`${box} space-y-1`}>
        <p className="text-fg">Tx B</p>
        <p className="flex items-center gap-1 text-amber-300">
          <Hourglass className="size-3" /> waiting
        </p>
      </div>
    </div>
  )
}

function IsolationPreview() {
  const levels = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']
  return (
    <div className="grid h-full grid-cols-[1.3fr_1fr] gap-2">
      <div className={`${box} space-y-1`}>
        <p className="text-fg">T1</p>
        <p>SELECT price … → 10,000</p>
        <p className="text-rose-300">SELECT price … → 12,000</p>
      </div>
      <div className="flex flex-col justify-center gap-1">
        {levels.map((l, i) => (
          <span key={l} className={`${box} truncate py-0.5 ${i === 1 ? 'border-accent/60 text-sky-200' : ''}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

function EventLoopPreview() {
  return (
    <div className="grid h-full grid-cols-[1fr_1.4fr] gap-2">
      <div className={`${box} flex flex-col-reverse gap-1`}>
        <p className="rounded bg-overlay px-1 text-fg">main()</p>
        <p className="rounded bg-accent/15 px-1 text-sky-200">console.log</p>
        <p className="mt-auto text-subtle">Call Stack</p>
      </div>
      <div className="grid grid-rows-2 gap-2">
        <div className={box}>
          <p className="text-subtle">Microtask Queue</p>
          <p className="mt-0.5 inline-block rounded bg-violet-400/15 px-1 text-violet-200">then(cb)</p>
        </div>
        <div className={box}>
          <p className="text-subtle">Task Queue</p>
          <p className="mt-0.5 inline-block rounded bg-amber-400/15 px-1 text-amber-200">setTimeout cb</p>
        </div>
      </div>
    </div>
  )
}

function ReactPreview() {
  const node = (label: string, cls: string) => <span className={`rounded border px-1.5 py-0.5 ${cls}`}>{label}</span>
  const on = 'border-accent/60 bg-accent/15 text-sky-200'
  const off = 'border-line-strong bg-raised text-muted'
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      {node('App', off)}
      <div className="flex gap-2">
        {node('Header', off)}
        {node('Counter', on)}
        {node('memo(Sidebar)', off)}
      </div>
      <div className="flex gap-2">
        {node('CountLabel', on)}
        {node('Button', on)}
      </div>
    </div>
  )
}

function HttpPreview() {
  const layers = ['Browser', 'Controller', 'Service', 'Repository', 'DB']
  return (
    <div className="flex h-full items-center">
      {layers.map((l, i) => (
        <div key={l} className="flex flex-1 items-center">
          <span className={`${box} w-full truncate text-center ${i === 2 ? 'border-accent/60 text-sky-200' : ''}`}>{l}</span>
          {i < layers.length - 1 && <span className="mx-0.5 text-accent">→</span>}
        </div>
      ))}
    </div>
  )
}
