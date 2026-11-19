import { ArrowLeft, ArrowRight, BookMarked, Calendar, ChevronRight, ExternalLink, ListTree } from 'lucide-react'
import { Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { categoryIcons, categoryLabel, ConceptCard, DifficultyBadge, SimulatorBadge } from '../components/concepts/ConceptCard'
import { ConceptContext, mdxComponents } from '../components/mdx/mdx-components'
import { getConceptContent } from '../content/registry/mdx'
import { getAdjacentConcepts, getConceptBySlug, getPrerequisites, getRelatedConcepts } from '../lib/content'
import type { ConceptMeta } from '../types/concept'
import { NotFoundPage } from './NotFoundPage'

interface TocItem {
  id: string
  text: string
}

const TAIL_SECTIONS: TocItem[] = [
  { id: 'related', text: '관련 개념' },
  { id: 'references', text: '공식 문서 및 출처' },
]

export function ConceptPage() {
  const { slug = '' } = useParams()
  const concept = getConceptBySlug(slug)
  if (!concept) return <NotFoundPage message={`'${slug}' 개념을 찾을 수 없습니다.`} />
  // key: 다른 개념으로 이동하면 목차 등 페이지 상태를 새로 시작
  return <ConceptView key={concept.id} concept={concept} />
}

function ConceptView({ concept }: { concept: ConceptMeta }) {
  // slug별로 캐시된 같은 lazy 컴포넌트를 돌려주므로 렌더마다 새로 만들어지지 않는다
  const Content = getConceptContent(concept.slug)
  const prerequisites = getPrerequisites(concept.id)
  const related = getRelatedConcepts(concept.id)
  const { prev, next } = getAdjacentConcepts(concept.id)
  const [toc, setToc] = useState<TocItem[]>([])
  const articleRef = useRef<HTMLDivElement>(null)
  const CategoryIcon = categoryIcons[concept.category]

  const allToc = [...toc, ...TAIL_SECTIONS]

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <title>{`${concept.title} — DevScope`}</title>
      {/* 경로 */}
      <nav aria-label="현재 위치" className="mb-6 flex items-center gap-1 text-xs text-subtle">
        <Link to="/concepts" className="hover:text-fg">
          개념 탐색
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <Link to={`/concepts?category=${concept.category}`} className="hover:text-fg">
          {categoryLabel(concept.category)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0 max-w-3xl">
          {/* 1. 제목과 요약 */}
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">
                <CategoryIcon aria-hidden className="size-3" />
                {categoryLabel(concept.category)}
              </span>
              <DifficultyBadge difficulty={concept.difficulty} />
              {concept.visualizationType !== 'static' && <SimulatorBadge />}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{concept.title}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{concept.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
              <span className="inline-flex items-center gap-1">
                <Calendar aria-hidden className="size-3.5" /> {concept.updatedAt} 검토
              </span>
              {concept.aliases.length > 0 && <span>다른 이름: {concept.aliases.slice(0, 4).join(', ')}</span>}
            </div>

            {prerequisites.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-subtle">먼저 보면 좋은 개념</span>
                {prerequisites.map((p) => (
                  <Link key={p.id} to={`/concepts/${p.slug}`} className="chip hover:border-line-strong hover:text-fg">
                    {p.title}
                  </Link>
                ))}
              </div>
            )}

            <section aria-label="핵심 요약" className="mt-7 rounded-2xl border border-accent/25 bg-accent-soft/50 p-5">
              <p className="mb-3 font-mono text-xs tracking-wider text-accent uppercase">Key points</p>
              <ul className="space-y-2">
                {concept.keyPoints.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[14.5px] leading-relaxed text-fg/90">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          </header>

          <MobileToc items={allToc} />

          {/* 2~8. 본문 (MDX) */}
          <div ref={articleRef} className="prose-ds mt-12">
            {Content ? (
              <ConceptContext value={concept}>
                <Suspense fallback={<ArticleSkeleton />}>
                  {/* oxlint-disable-next-line react/static-components -- 위 getConceptContent 주석 참고 */}
                  <Content components={mdxComponents} />
                  <ContentMounted containerRef={articleRef} onHeadings={setToc} />
                </Suspense>
              </ConceptContext>
            ) : (
              <p className="text-muted">본문이 아직 준비되지 않았습니다.</p>
            )}
          </div>

          {/* 9. 관련 개념 */}
          <TailSection id="related" title="관련 개념">
            {related.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((c) => (
                  <ConceptCard key={c.id} concept={c} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">아직 연결된 개념이 없습니다.</p>
            )}
          </TailSection>

          {/* 10. 공식 문서 및 출처 */}
          <TailSection id="references" title="공식 문서 및 출처">
            <ul className="space-y-2">
              {concept.references.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-raised"
                  >
                    <BookMarked aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{r.title}</span>
                      <span className="block text-xs text-subtle">{r.publisher}</span>
                    </span>
                    <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0 text-subtle group-hover:text-fg" />
                    <span className="sr-only">(새 창에서 열림)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-subtle">
              본문은 위 문서를 바탕으로 DevScope가 이해하기 쉽게 다시 설명한 것입니다. 버전·구현체에 따라 다를 수 있는 내용은 원문을
              확인하세요.
            </p>
          </TailSection>

          {/* 이전·다음 개념 */}
          <nav aria-label="이전·다음 개념" className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {prev ? (
              <Link to={`/concepts/${prev.slug}`} className="group card p-4 transition-colors hover:border-line-strong" rel="prev">
                <span className="flex items-center gap-1 text-xs text-subtle">
                  <ArrowLeft aria-hidden className="size-3.5" /> 이전 개념
                </span>
                <span className="mt-1 block font-medium text-fg">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/concepts/${next.slug}`} className="group card p-4 text-right transition-colors hover:border-line-strong" rel="next">
                <span className="flex items-center justify-end gap-1 text-xs text-subtle">
                  다음 개념 <ArrowRight aria-hidden className="size-3.5" />
                </span>
                <span className="mt-1 block font-medium text-fg">{next.title}</span>
              </Link>
            )}
          </nav>
        </article>

        <DesktopToc items={allToc} />
      </div>
    </div>
  )
}

/** MDX가 렌더링된 뒤 실행: 목차 수집 + URL 해시 위치로 스크롤 */
function ContentMounted({ containerRef, onHeadings }: { containerRef: RefObject<HTMLDivElement | null>; onHeadings: (t: TocItem[]) => void }) {
  const { hash } = useLocation()
  useEffect(() => {
    const headings = containerRef.current?.querySelectorAll('h2[id]') ?? []
    onHeadings([...headings].map((h) => ({ id: h.id, text: h.firstChild?.textContent ?? '' })))
  }, [containerRef, onHeadings])
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])
  return null
}

function TailSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-16 scroll-mt-24" id={id}>
      <h2 id={`${id}-heading`} className="mb-5 flex items-center gap-3 text-2xl font-bold tracking-tight text-fg">
        <span aria-hidden className="h-6 w-1 rounded-full bg-accent" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string>()
  const key = ids.join('|')
  useEffect(() => {
    const elements = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => e !== null)
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    elements.forEach((e) => observer.observe(e))
    return () => observer.disconnect()
  }, [key])
  return active
}

function DesktopToc({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items.map((i) => i.id))
  return (
    <aside className="hidden lg:block" aria-label="목차">
      <div className="sticky top-24">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-subtle uppercase">
          <ListTree aria-hidden className="size-3.5" /> 목차
        </p>
        <ul className="space-y-0.5 border-l border-line">
          {items.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={active === i.id ? 'location' : undefined}
                className={`-ml-px block border-l py-1 pl-3 text-[13px] transition-colors ${
                  active === i.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                {i.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function MobileToc({ items }: { items: TocItem[] }) {
  return (
    <details className="group mt-6 rounded-xl border border-line bg-surface lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg">
        <ListTree aria-hidden className="size-4 text-accent" /> 목차
        <ChevronRight aria-hidden className="ml-auto size-4 text-subtle transition-transform group-open:rotate-90" />
      </summary>
      <ul className="border-t border-line px-2 py-2">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="block rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-raised hover:text-fg">
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function ArticleSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="본문을 불러오는 중">
      {[80, 95, 70, 88, 60].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-raised" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}
