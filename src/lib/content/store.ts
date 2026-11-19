import { categories } from '../../content/categories.ts'
import type { ConceptMeta, ConceptSummary, SearchFilters, SearchResult } from '../../types/concept.ts'
import { indexConcepts, matchesFilters, search, type SearchOptions } from './search.ts'

/**
 * 개념 데이터 조회·검색 API. React나 Vite에 의존하지 않으므로
 * 향후 MCP 서버(Node)에서도 같은 함수를 그대로 쓸 수 있다.
 * 테스트에서는 임의의 개념 배열로 독립된 store를 만들 수 있다.
 */
export function createConceptStore(concepts: ConceptMeta[]) {
  const byId = new Map(concepts.map((c) => [c.id, c]))
  const bySlug = new Map(concepts.map((c) => [c.slug, c]))
  const index = indexConcepts(concepts)

  const resolve = (ids: string[]) => ids.map((id) => byId.get(id)).filter((c): c is ConceptMeta => c !== undefined)

  function getRelatedConcepts(id: string): ConceptMeta[] {
    const concept = byId.get(id)
    if (!concept) return []
    // 명시한 관련 개념 + 이 개념을 관련 개념으로 지정한 다른 개념 (양방향)
    const reverse = concepts.filter((c) => c.relatedConcepts.includes(id)).map((c) => c.id)
    const ids = [...new Set([...concept.relatedConcepts, ...reverse])].filter((x) => x !== id)
    return resolve(ids)
  }

  return {
    listConcepts(filters?: SearchFilters): ConceptMeta[] {
      return concepts.filter((c) => matchesFilters(c, filters))
    },
    getConceptById(id: string): ConceptMeta | undefined {
      return byId.get(id)
    },
    getConceptBySlug(slug: string): ConceptMeta | undefined {
      return bySlug.get(slug)
    },
    searchConcepts(query: string, filters?: SearchFilters, options?: SearchOptions): SearchResult[] {
      return search(index, query, filters, options)
    },
    getRelatedConcepts,
    getPrerequisites(id: string): ConceptMeta[] {
      return resolve(byId.get(id)?.prerequisites ?? [])
    },
    /** 목록 순서 기준 이전·다음 개념 */
    getAdjacentConcepts(id: string): { prev?: ConceptMeta; next?: ConceptMeta } {
      const i = concepts.findIndex((c) => c.id === id)
      if (i === -1) return {}
      return { prev: concepts[i - 1], next: concepts[i + 1] }
    },
    getConceptSummary(id: string): ConceptSummary | undefined {
      const c = byId.get(id)
      if (!c) return undefined
      const ref = (x: ConceptMeta) => ({ id: x.id, title: x.title })
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        category: categories.find((cat) => cat.id === c.category)!,
        difficulty: c.difficulty,
        tags: c.tags,
        keyPoints: c.keyPoints,
        hasSimulator: c.visualizationType !== 'static',
        prerequisites: resolve(c.prerequisites).map(ref),
        related: getRelatedConcepts(id).map(ref),
        references: c.references,
        path: `/concepts/${c.slug}`,
      }
    },
    /** 태그별 개념 수, 많은 순 */
    listTags(): { tag: string; count: number }[] {
      const counts = new Map<string, number>()
      for (const c of concepts) for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
      return [...counts]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    },
    countByCategory(): Partial<Record<ConceptMeta['category'], number>> {
      const counts: Partial<Record<ConceptMeta['category'], number>> = {}
      for (const c of concepts) counts[c.category] = (counts[c.category] ?? 0) + 1
      return counts
    },
  }
}

export type ConceptStore = ReturnType<typeof createConceptStore>
