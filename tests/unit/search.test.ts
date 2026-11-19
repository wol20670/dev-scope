import { describe, expect, it } from 'vitest'
import { concepts } from '../../src/content/concepts'
import {
  conceptStore,
  createConceptStore,
  getAdjacentConcepts,
  getConceptSummary,
  getRelatedConcepts,
  listConcepts,
  searchConcepts,
} from '../../src/lib/content'
import { normalize, tokenize } from '../../src/lib/content/search'
import type { ConceptMeta } from '../../src/types/concept'

const topId = (q: string) => searchConcepts(q)[0]?.concept.id

describe('normalize / tokenize', () => {
  it('대소문자·공백·기호 차이를 없앤다', () => {
    expect(normalize('  @Version ')).toBe('version')
    expect(normalize('낙관적 락')).toBe(normalize('낙관적락'))
  })
  it('불용어를 제거하되, 불용어뿐이면 그대로 둔다', () => {
    expect(tokenize('낙관적 락과 비관적 락의 차이')).toEqual(['낙관적', '락과', '비관적', '락의'])
    expect(tokenize('차이')).toEqual(['차이'])
  })
})

describe('searchConcepts', () => {
  it('한국어 문장형 질의에서 조사와 불용어를 무시하고 찾는다', () => {
    expect(topId('낙관적 락과 비관적 락의 차이')).toBe('optimistic-pessimistic-lock')
  })

  it('영어 기술 용어(별칭)로도 찾는다', () => {
    expect(topId('optimistic lock')).toBe('optimistic-pessimistic-lock')
    expect(topId('event loop')).toBe('js-event-loop')
    expect(topId('CORS')).toBe('cors')
  })

  it('키워드·어노테이션으로 찾는다', () => {
    expect(searchConcepts('@Transactional').map((r) => r.concept.id)).toContain('spring-transaction')
    expect(searchConcepts('SELECT FOR UPDATE').map((r) => r.concept.id)).toContain('optimistic-pessimistic-lock')
  })

  it('공백 유무와 대소문자에 관계없이 찾는다', () => {
    expect(topId('이벤트루프')).toBe('js-event-loop')
    expect(topId('EVENT LOOP')).toBe('js-event-loop')
  })

  it('제목 일치가 설명 일치보다 앞선다', () => {
    const results = searchConcepts('트랜잭션')
    expect(results[0].concept.title).toContain('트랜잭션')
    expect(results[0].matchedFields).toContain('title')
  })

  it('일치하는 개념이 없으면 빈 배열, any 모드는 일부 일치를 돌려준다', () => {
    expect(searchConcepts('kubernetes')).toEqual([])
    expect(searchConcepts('kubernetes 이벤트 루프')).toEqual([])
    expect(searchConcepts('kubernetes 이벤트 루프', {}, { match: 'any' }).map((r) => r.concept.id)).toContain('js-event-loop')
  })

  it('빈 검색어는 필터만 적용한 전체 목록이다', () => {
    expect(searchConcepts('')).toHaveLength(concepts.length)
    expect(searchConcepts('   ', { category: 'frontend' }).every((r) => r.concept.category === 'frontend')).toBe(true)
  })

  it('카테고리·난이도·태그·시뮬레이터 필터를 함께 적용한다', () => {
    const sims = listConcepts({ hasSimulator: true })
    expect(sims.map((c) => c.id).sort()).toEqual(['http-request-lifecycle', 'js-event-loop', 'optimistic-pessimistic-lock', 'react-rendering', 'transaction-isolation'])
    expect(listConcepts({ category: 'frontend', hasSimulator: true }).every((c) => c.category === 'frontend' && c.visualizationType !== 'static')).toBe(true)
    const tagged = listConcepts({ tags: ['React'] })
    expect(tagged.length).toBeGreaterThan(0)
    expect(tagged.every((c) => c.tags.includes('React'))).toBe(true)
    const beginners = listConcepts({ difficulty: 'beginner' })
    expect(beginners.every((c) => c.difficulty === 'beginner')).toBe(true)
  })
})

describe('관계 조회', () => {
  it('관련 개념은 양방향이고 자기 자신을 포함하지 않는다', () => {
    for (const c of concepts) {
      const related = getRelatedConcepts(c.id).map((r) => r.id)
      expect(related).not.toContain(c.id)
      for (const id of c.relatedConcepts) expect(related).toContain(id)
      // 다른 개념이 c를 관련으로 지정했다면 c 쪽에서도 보인다
      for (const other of concepts.filter((o) => o.relatedConcepts.includes(c.id))) expect(related).toContain(other.id)
    }
  })

  it('이전·다음 개념은 목록 순서를 따른다', () => {
    expect(getAdjacentConcepts(concepts[0].id).prev).toBeUndefined()
    expect(getAdjacentConcepts(concepts[0].id).next?.id).toBe(concepts[1].id)
    expect(getAdjacentConcepts(concepts.at(-1)!.id).next).toBeUndefined()
    expect(getAdjacentConcepts('nope')).toEqual({})
  })

  it('getConceptSummary는 외부 도구(MCP)용 요약을 만든다', () => {
    const s = getConceptSummary('js-event-loop')!
    expect(s.path).toBe('/concepts/js-event-loop')
    expect(s.hasSimulator).toBe(true)
    expect(s.category.label).toBe('Frontend')
    expect(s.keyPoints.length).toBeGreaterThan(0)
    expect(getConceptSummary('nope')).toBeUndefined()
  })
})

describe('새 개념 추가', () => {
  const extra: ConceptMeta = {
    id: 'cache-stampede',
    slug: 'cache-stampede',
    title: '캐시 스탬피드',
    description: '캐시가 동시에 만료되어 요청이 한꺼번에 DB로 몰리는 현상과 대응 방법.',
    category: 'database-infra',
    tags: ['캐시', '성능'],
    aliases: ['Cache Stampede', 'Thundering Herd'],
    keywords: ['TTL', 'jitter'],
    difficulty: 'advanced',
    prerequisites: [],
    relatedConcepts: ['database-index'],
    visualizationType: 'static',
    keyPoints: ['a', 'b', 'c'],
    references: [{ title: 't', url: 'https://example.com', publisher: 'p' }],
    updatedAt: '2026-11-19',
  }
  const store = createConceptStore([...concepts, extra])

  it('목록·검색·관련 개념에 바로 반영된다', () => {
    expect(store.listConcepts()).toHaveLength(concepts.length + 1)
    expect(store.searchConcepts('thundering herd')[0].concept.id).toBe('cache-stampede')
    expect(store.searchConcepts('캐시')[0].concept.id).toBe('cache-stampede')
    expect(store.listConcepts({ category: 'database-infra' }).map((c) => c.id)).toContain('cache-stampede')
    expect(store.getRelatedConcepts('database-index').map((c) => c.id)).toContain('cache-stampede')
    expect(store.listTags().map((t) => t.tag)).toContain('캐시')
  })

  it('기본 store에는 영향을 주지 않는다', () => {
    expect(conceptStore.getConceptById('cache-stampede')).toBeUndefined()
  })
})
