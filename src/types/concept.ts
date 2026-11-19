/** 콘텐츠 메타데이터 타입. UI/Vite에 의존하지 않으므로 Node(MCP 서버 등)에서도 그대로 쓸 수 있다. */

export type CategoryId = 'backend' | 'frontend' | 'database-infra' | 'network-web'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

/** src/content/registry/simulators.ts 에 등록된 인터랙티브 시뮬레이터 id */
export type SimulatorId = 'locking' | 'isolation' | 'event-loop' | 'react-rendering' | 'http-request'

/** 'static' = 시뮬레이터 없이 글·코드·정적 다이어그램만 제공 */
export type VisualizationType = SimulatorId | 'static'

export interface Reference {
  title: string
  url: string
  /** 문서 발행 주체. 예: 'Spring Framework Reference', 'MDN', 'PostgreSQL Docs' */
  publisher: string
}

export interface ConceptMeta {
  /** 관계(prerequisites, relatedConcepts)에서 참조하는 고유 id. 한번 정하면 바꾸지 않는다. */
  id: string
  /** URL 경로: /concepts/:slug */
  slug: string
  title: string
  /** 한두 문장 요약. 카드·검색 결과·MCP 요약에 쓰인다. */
  description: string
  category: CategoryId
  tags: string[]
  /** 다른 이름·영문 표기·약어. 검색 대상이다. */
  aliases: string[]
  /** 본문의 핵심 용어. 검색 대상이다. */
  keywords: string[]
  difficulty: Difficulty
  /** 먼저 알면 좋은 개념 id */
  prerequisites: string[]
  /** 함께 보면 좋은 개념 id */
  relatedConcepts: string[]
  visualizationType: VisualizationType
  /** 3~5개의 핵심 요약 문장. 상세 페이지 상단과 getConceptSummary()에 쓰인다. */
  keyPoints: string[]
  references: Reference[]
  /** YYYY-MM-DD */
  updatedAt: string
  /** 메인 페이지의 대표 개념으로 노출 */
  featured?: boolean
}

export interface Category {
  id: CategoryId
  label: string
  description: string
}

export interface SearchFilters {
  category?: CategoryId
  difficulty?: Difficulty
  tags?: string[]
  /** true면 인터랙티브 시뮬레이터가 있는 개념만 */
  hasSimulator?: boolean
}

export interface SearchResult {
  concept: ConceptMeta
  score: number
  /** 어느 필드에서 일치했는지 (UI 표시용) */
  matchedFields: SearchField[]
}

export type SearchField = 'title' | 'aliases' | 'tags' | 'keywords' | 'description'

export interface ConceptSummary {
  id: string
  slug: string
  title: string
  description: string
  category: Category
  difficulty: Difficulty
  tags: string[]
  keyPoints: string[]
  hasSimulator: boolean
  prerequisites: { id: string; title: string }[]
  related: { id: string; title: string }[]
  references: Reference[]
  /** 사이트 기준 상대 경로 */
  path: string
}
