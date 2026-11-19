import { SearchX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { categoryIcons, ConceptCard } from '../components/concepts/ConceptCard'
import { SearchForm } from '../components/ui/SearchForm'
import { useConceptBodies } from '../features/search/useConceptBodies'
import { categories, listTags, searchConcepts, snippet } from '../lib/content'
import type { SearchResult } from '../types/concept'

const suggestions = ['낙관적 락', '이벤트 루프', 'React 렌더링', 'transaction', 'CORS', 'index']

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  // 본문은 검색어가 생길 때 불러오며, 그 전에는 메타데이터만으로 검색한다
  const bodies = useConceptBodies(!!q)
  const results = q ? searchConcepts(q, {}, { bodies: bodies?.normalized }) : []
  // 정확히 일치하는 결과가 없을 때: 일부 키워드만 일치하는 개념을 대안으로 제시
  const partial = q && results.length === 0 ? searchConcepts(q, {}, { match: 'any', bodies: bodies?.normalized }) : []
  /** 본문에서만 찾은 결과는 어디에서 일치했는지 문맥을 보여 준다 */
  const snippetOf = (r: SearchResult) =>
    bodies && r.matchedFields.every((f) => f === 'body') ? snippet(bodies.raw[r.concept.id] ?? '', q) : undefined

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <title>{q ? `"${q}" 검색 — DevScope` : "검색 — DevScope"}</title>
      {/* key: 검색어가 바뀌면 입력값도 새 검색어로 */}
      <SearchForm key={q} initial={q} size="md" />

      {!q ? (
        <div className="mt-10">
          <h1 className="text-2xl font-bold text-fg">무엇을 찾고 있나요?</h1>
          <p className="mt-2 text-sm text-muted">개념 이름, 영어 용어, 어노테이션, 태그, 본문 내용으로 검색할 수 있습니다.</p>
          <SuggestionChips />
        </div>
      ) : (
        <>
          <h1 className="mt-10 text-xl font-semibold text-fg">
            <span className="text-accent">“{q}”</span> 검색 결과{' '}
            <span className="text-base font-normal text-muted" data-testid="result-count">
              {results.length}개
            </span>
          </h1>

          {results.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {results.map((r) => (
                <ConceptCard key={r.concept.id} concept={r.concept} matchedFields={r.matchedFields} snippet={snippetOf(r)} />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-10" data-testid="empty-state">
              <div className="card flex items-start gap-4 p-6">
                <SearchX aria-hidden className="mt-0.5 size-6 shrink-0 text-subtle" />
                <div>
                  <p className="font-semibold text-fg">모든 키워드가 일치하는 개념을 찾지 못했습니다</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    더 짧은 키워드로 검색하거나, 영어·한국어 표기를 바꿔 보세요. (예: “락” 대신 “lock”)
                  </p>
                </div>
              </div>

              {partial.length > 0 && (
                <section aria-labelledby="partial-heading">
                  <h2 id="partial-heading" className="mb-4 text-sm font-semibold text-muted">
                    일부 키워드가 일치하는 개념
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {partial.slice(0, 4).map((r) => (
                      <ConceptCard key={r.concept.id} concept={r.concept} matchedFields={r.matchedFields} snippet={snippetOf(r)} />
                    ))}
                  </div>
                </section>
              )}

              <section aria-labelledby="cat-suggest">
                <h2 id="cat-suggest" className="mb-4 text-sm font-semibold text-muted">
                  카테고리에서 찾아보기
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((c) => {
                    const Icon = categoryIcons[c.id]
                    return (
                      <Link
                        key={c.id}
                        to={`/concepts?category=${c.id}`}
                        className="card flex items-center gap-3 p-4 transition-colors hover:border-line-strong hover:bg-raised"
                      >
                        <Icon aria-hidden className="size-4 text-accent" />
                        <span className="text-sm font-medium text-fg">{c.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </section>

              <SuggestionChips />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SuggestionChips() {
  const tags = listTags().slice(0, 10)
  return (
    <section aria-labelledby="suggest-heading" className="mt-8">
      <h2 id="suggest-heading" className="mb-3 text-sm font-semibold text-muted">
        이런 키워드는 어떤가요?
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-line-strong hover:text-fg">
            {s}
          </Link>
        ))}
        {tags.map(({ tag }) => (
          <Link key={tag} to={`/concepts?tag=${encodeURIComponent(tag)}`} className="chip hover:border-line-strong hover:text-fg">
            #{tag}
          </Link>
        ))}
      </div>
    </section>
  )
}
