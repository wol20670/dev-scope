import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { StepPlayer } from '../../lib/simulation/useStepPlayer'

interface Props {
  title: string
  player: StepPlayer
  /** 단계 이름 목록 (진행 표시줄 툴팁·스크린 리더용) */
  stepTitles: string[]
  /** 현재 단계 설명 */
  description: ReactNode
  /** 시나리오 선택 등 상단 도구 */
  toolbar?: ReactNode
  /** 시뮬레이터가 단순화한 부분 안내 */
  note?: ReactNode
  children: ReactNode
}

/** 모든 시뮬레이터가 공유하는 프레임: 제목, 시각화 영역, 단계 설명, 재생 컨트롤 */
export function SimulatorShell({ title, player, stepTitles, description, toolbar, note, children }: Props) {
  const { index, total, playing, isFirst, isLast } = player

  // 시뮬레이터 안에 포커스가 있을 때 ←/→로 단계 이동
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [role="tablist"]')) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      player.next()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      player.prev()
    }
  }

  return (
    <section
      aria-label={`${title} 시뮬레이터`}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_0_0_1px_#38bdf810,0_24px_60px_-30px_#0ea5e940]"
      data-testid="simulator"
    >
      {/* 에디터 창을 닮은 상단 바 */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-raised/60 px-4 py-2.5">
        <div aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/70" />
          <span className="size-2.5 rounded-full bg-[#28c840]/70" />
        </div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-accent uppercase">
          interactive
        </span>
        {toolbar && <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>}
      </header>

      <div className="p-3 sm:p-5">{children}</div>

      {/* 단계 설명 */}
      <div className="border-t border-line bg-canvas/40 px-4 py-4 sm:px-5">
        <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] text-accent">
          <span data-testid="step-indicator">
            STEP {index + 1} / {total}
          </span>
          <span className="text-subtle">·</span>
          <span className="truncate text-muted">{stepTitles[index]}</span>
        </div>
        <div aria-live="polite" className="min-h-[3.5rem] text-[14.5px] leading-relaxed text-fg/90" data-testid="step-description">
          {description}
        </div>
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3 sm:px-5">
        <ControlButton label="처음부터 다시" onClick={player.reset} disabled={isFirst && !playing}>
          <RotateCcw className="size-4" />
        </ControlButton>
        <ControlButton label="이전 단계" onClick={player.prev} disabled={isFirst}>
          <ChevronLeft className="size-4" />
        </ControlButton>
        <button
          type="button"
          onClick={playing ? player.pause : player.play}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-canvas transition-colors hover:bg-sky-300"
          aria-label={playing ? '일시정지' : isLast ? '처음부터 자동 재생' : '자동 재생'}
        >
          {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          <span>{playing ? '일시정지' : '자동 재생'}</span>
        </button>
        <ControlButton label="다음 단계" onClick={player.next} disabled={isLast}>
          <ChevronRight className="size-4" />
        </ControlButton>

        {/* 진행 표시: 클릭으로 특정 단계 이동 */}
        <ol className="ml-auto flex max-w-full flex-wrap items-center gap-1" aria-label="단계 목록">
          {stepTitles.map((t, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => player.goto(i)}
                aria-label={`${i + 1}단계: ${t}`}
                aria-current={i === index ? 'step' : undefined}
                title={`${i + 1}. ${t}`}
                className="flex h-6 items-center px-0.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-accent' : i < index ? 'w-2.5 bg-accent/45' : 'w-2.5 bg-line-strong'
                  }`}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {note && <div className="border-t border-line px-4 py-3 text-xs leading-relaxed text-subtle sm:px-5">{note}</div>}
    </section>
  )
}

function ControlButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-raised text-fg transition-colors hover:border-line-strong hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/** 시나리오·예제 선택 탭 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  const move = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = options[(i + d + options.length) % options.length]
    onChange(next.value)
    const buttons = (e.currentTarget.parentElement?.querySelectorAll('button') ?? []) as NodeListOf<HTMLButtonElement>
    buttons[(i + d + options.length) % options.length]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap rounded-lg border border-line bg-canvas/60 p-0.5">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => move(e, i)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            o.value === value ? 'bg-overlay text-fg shadow-sm' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
