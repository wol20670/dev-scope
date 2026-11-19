import { AlertTriangle, Info, Lightbulb } from 'lucide-react'
import { createContext, Suspense, use, useRef, type ComponentProps, type ReactNode } from 'react'
import type { MDXComponents } from 'mdx/types'
import { Link } from 'react-router'
import { simulators } from '../../content/registry/simulators'
import type { ConceptMeta } from '../../types/concept'
import { CopyButton } from '../ui/CopyButton'

/** 현재 렌더링 중인 개념. <Simulator />가 어떤 시뮬레이터를 그릴지 결정한다. */
export const ConceptContext = createContext<ConceptMeta | null>(null)

export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node.props as { children?: ReactNode }).children)
  }
  return ''
}

export const headingId = (text: string) =>
  text
    .trim()
    .replace(/[?!.,:()'"`]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()

function Heading({ as: Tag, children }: { as: 'h2' | 'h3'; children?: ReactNode }) {
  const id = headingId(textOf(children))
  return (
    <Tag id={id} className="group">
      {children}
      <a
        href={`#${id}`}
        aria-label={`${textOf(children)} 섹션 링크`}
        className="ml-1 text-subtle no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        #
      </a>
    </Tag>
  )
}

function Pre(props: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  return (
    <div className="group relative">
      <pre ref={ref} {...props} />
      <CopyButton
        text={() => ref.current?.textContent ?? ''}
        className="absolute top-2 right-2 bg-raised/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  )
}

const calloutStyles = {
  info: { icon: Info, box: 'border-sky-400/25 bg-sky-400/[0.06]', icon_: 'text-sky-300', label: '참고' },
  tip: { icon: Lightbulb, box: 'border-emerald-400/25 bg-emerald-400/[0.06]', icon_: 'text-emerald-300', label: '팁' },
  warn: { icon: AlertTriangle, box: 'border-amber-400/30 bg-amber-400/[0.06]', icon_: 'text-amber-300', label: '주의' },
}

export function Callout({ type = 'info', title, children }: { type?: keyof typeof calloutStyles; title?: string; children?: ReactNode }) {
  const s = calloutStyles[type]
  const Icon = s.icon
  return (
    <aside className={`my-6 rounded-xl border px-4 py-3.5 ${s.box}`} aria-label={title ?? s.label}>
      <div className="flex gap-3">
        <Icon aria-hidden className={`mt-1 size-4 shrink-0 ${s.icon_}`} />
        <div className="min-w-0 text-[14.5px] leading-relaxed [&>p+p]:mt-2">
          {title && <p className="mb-1 font-semibold text-fg">{title}</p>}
          {children}
        </div>
      </div>
    </aside>
  )
}

/** 순서가 있는 단계 다이어그램 (정적) */
export function Flow({ title, steps }: { title?: string; steps: { title: string; detail?: string }[] }) {
  return (
    <figure className="not-prose my-6 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {title && <figcaption className="mb-4 text-sm font-semibold text-fg">{title}</figcaption>}
      <ol className="!list-none !space-y-0 !pl-0">
        {steps.map((step, i) => (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-line-strong" />}
            <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-xs text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14.5px] leading-snug font-medium text-fg">{step.title}</p>
              {step.detail && <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}

/** 참여자 사이의 메시지 순서 다이어그램 (정적) */
export function Sequence({
  title,
  actors,
  messages,
}: {
  title?: string
  actors: string[]
  messages: { from: string; to: string; label: string; note?: string }[]
}) {
  const col = (name: string) => Math.max(0, actors.indexOf(name))
  const n = actors.length
  return (
    <figure className="not-prose my-6 overflow-x-auto rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {title && <figcaption className="mb-4 text-sm font-semibold text-fg">{title}</figcaption>}
      <div className="min-w-[520px]">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {actors.map((a) => (
            <div key={a} className="rounded-lg border border-line-strong bg-raised px-2 py-1.5 text-center text-xs font-semibold text-fg">
              {a}
            </div>
          ))}
        </div>
        <ol className="relative mt-2 !list-none !space-y-0 !pl-0">
          {/* 생명선 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {actors.map((a) => (
              <div key={a} className="mx-auto w-px bg-line" />
            ))}
          </div>
          {messages.map((m, i) => {
            const from = col(m.from)
            const to = col(m.to)
            const left = Math.min(from, to)
            const right = Math.max(from, to)
            const self = from === to
            const toRight = to > from
            return (
              <li key={i} className="relative py-2">
                <span className="sr-only">
                  {i + 1}. {m.from} → {m.to}: {m.label}
                  {m.note ? ` (${m.note})` : ''}
                </span>
                <div
                  aria-hidden
                  className="relative"
                  style={{
                    marginLeft: `${((left + 0.5) / n) * 100}%`,
                    width: self ? `${(0.45 / n) * 100}%` : `${((right - left) / n) * 100}%`,
                  }}
                >
                  <div className={`text-center text-[12px] leading-tight font-medium text-fg ${self ? 'text-left pl-2' : ''}`}>
                    <span className="mr-1 font-mono text-[10px] text-accent">{i + 1}</span>
                    {m.label}
                  </div>
                  <div className="relative mt-1 h-2">
                    <div className={`absolute top-1/2 h-px w-full ${self ? 'border-t border-dashed border-accent/70' : 'bg-accent/70'}`} />
                    <div
                      className={`absolute top-1/2 size-0 -translate-y-1/2 border-y-4 border-y-transparent ${
                        toRight || self ? 'right-0 border-l-[7px] border-l-accent' : 'left-0 border-r-[7px] border-r-accent'
                      }`}
                    />
                  </div>
                  {m.note && <div className="mt-1 text-center text-[11px] leading-snug text-subtle">{m.note}</div>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </figure>
  )
}

export function Simulator() {
  const concept = use(ConceptContext)
  if (!concept || concept.visualizationType === 'static') return null
  const Component = simulators[concept.visualizationType]
  return (
    <div className="not-prose my-8 -mx-1 sm:mx-0" id="simulator">
      <Suspense fallback={<SimulatorSkeleton />}>
        <Component />
      </Suspense>
    </div>
  )
}

export function SimulatorSkeleton() {
  return (
    <div className="flex h-96 items-center justify-center rounded-2xl border border-line bg-surface text-sm text-subtle" role="status">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden />
      시뮬레이터를 불러오는 중…
    </div>
  )
}

export const mdxComponents: MDXComponents = {
  h2: (p) => <Heading as="h2">{p.children}</Heading>,
  h3: (p) => <Heading as="h3">{p.children}</Heading>,
  pre: Pre,
  a: ({ href = '', ...rest }) =>
    href.startsWith('http') ? (
      <a href={href} target="_blank" rel="noreferrer" {...rest} />
    ) : href.startsWith('/') ? (
      // 사이트 내부 링크는 전체 새로고침 없이 이동
      <Link to={href} {...rest} />
    ) : (
      <a href={href} {...rest} />
    ),
  Callout,
  Flow,
  Sequence,
  Simulator,
}
