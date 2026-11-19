import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { categoryIcons, ConceptCard } from '../components/concepts/ConceptCard'
import { categories, countByCategory, difficultyLabels, listTags, searchConcepts } from '../lib/content'
import type { CategoryId, Difficulty, SearchFilters } from '../types/concept'

const difficulties = Object.keys(difficultyLabels) as Difficulty[]

/** URL 쿼리 ↔ 필터. 새로고침·링크 공유해도 필터가 유지된다. */
function readFilters(params: URLSearchParams): { q: string; filters: SearchFilters } {
  const category = params.get('category') as CategoryId | null
  const difficulty = params.get('difficulty') as Difficulty | null
  return {
    q: params.get('q') ?? '',
    filters: {
      category: categories.some((c) => c.id === category) ? category! : undefined,
      difficulty: difficulty && difficulty in difficultyLabels ? difficulty : undefined,
      tags: params.getAll('tag'),
      hasSimulator: params.get('sim') === '1',
    },
  }
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const { q, filters } = readFilters(params)
  const results = searchConcepts(q, filters)
  const tags = listTags()
  const counts = countByCategory()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const update = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    fn(next)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const setSingle = (key: string, value?: string) =>
    update((p) => (value && p.get(key) !== value ? p.set(key, value) : p.delete(key)))
  const toggleTag = (tag: string) =>
    update((p) => {
      const current = p.getAll('tag')
      p.delete('tag')
      const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
      next.forEach((t) => p.append('tag', t))
    })

  const activeCount =
    (filters.category ? 1 : 0) + (filters.difficulty ? 1 : 0) + (filters.tags?.length ?? 0) + (filters.hasSimulator ? 1 : 0)

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <title>개념 탐색 — DevScope</title>
      <header className="mb-8">
        <p className="font-mono text-xs tracking-wider text-accent uppercase">Explore</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-fg">개념 탐색</h1>
        <p className="mt-2 text-sm text-muted">분야, 난이도, 태그로 좁혀 보고 키워드로 찾아보세요. 한국어와 영어 용어 모두 검색됩니다.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* 필터 */}
        <aside aria-label="필터">
          <div className="flex gap-2 lg:block">
            <label className="relative block flex-1">
              <span className="sr-only">키워드로 필터</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setSingle('q', e.target.value || undefined)}
                placeholder="키워드 (예: lock, 렌더링)"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:border-accent/60 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-muted lg:hidden"
            >
              <SlidersHorizontal aria-hidden className="size-4" /> 필터{activeCount > 0 && ` ${activeCount}`}
            </button>
          </div>

          <div id="filter-panel" className={`${filtersOpen ? 'block' : 'hidden'} mt-5 space-y-6 lg:block`}>
            <FilterGroup label="카테고리">
              {categories.map((c) => {
                const Icon = categoryIcons[c.id]
                return (
                  <FilterOption key={c.id} active={filters.category === c.id} onClick={() => setSingle('category', c.id)}>
                    <Icon aria-hidden className="size-3.5" />
                    <span className="flex-1">{c.label}</span>
                    <span className="font-mono text-[11px] text-subtle">{counts[c.id] ?? 0}</span>
                  </FilterOption>
                )
              })}
            </FilterGroup>

            <FilterGroup label="난이도">
              <div className="flex flex-wrap gap-1.5">
                {difficulties.map((d) => (
                  <Pill key={d} active={filters.difficulty === d} onClick={() => setSingle('difficulty', d)}>
                    {difficultyLabels[d]}
                  </Pill>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="시각화">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-raised">
                <input
                  type="checkbox"
                  checked={!!filters.hasSimulator}
                  onChange={(e) => setSingle('sim', e.target.checked ? '1' : undefined)}
                  className="size-4 accent-sky-400"
                />
                시뮬레이터가 있는 개념만
              </label>
            </FilterGroup>

            <FilterGroup label="태그">
              <div className="flex flex-wrap gap-1.5">
                {tags.map(({ tag, count }) => (
                  <Pill key={tag} active={!!filters.tags?.includes(tag)} onClick={() => toggleTag(tag)}>
                    #{tag} <span className="text-subtle">{count}</span>
                  </Pill>
                ))}
              </div>
            </FilterGroup>
          </div>
        </aside>

        {/* 결과 */}
        <section aria-label="개념 목록">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <p className="text-muted" aria-live="polite" data-testid="result-count">
              <span className="font-semibold text-fg">{results.length}</span>개 개념
            </p>
            {(activeCount > 0 || q) && (
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-raised hover:text-fg"
              >
                <X aria-hidden className="size-3.5" /> 필터 초기화
              </button>
            )}
          </div>

          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <ConceptCard key={r.concept.id} concept={r.concept} matchedFields={q ? r.matchedFields : undefined} />
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <SearchX aria-hidden className="size-8 text-subtle" />
              <p className="mt-4 font-semibold text-fg">조건에 맞는 개념이 없습니다</p>
              <p className="mt-1 text-sm text-muted">필터를 하나씩 해제하거나 다른 키워드로 찾아보세요.</p>
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="mt-5 rounded-lg border border-line px-3 py-1.5 text-sm text-fg hover:bg-raised"
              >
                필터 초기화
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-subtle uppercase">{label}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  )
}

function FilterOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active ? 'border-accent/50 bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
