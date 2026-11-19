import type { ConceptDocument, ConceptMeta, SearchField, SearchFilters, SearchResult } from '../../types/concept.ts'

/** 필드별 가중치. 제목 > 별칭 > 태그 > 키워드 > 설명 > 본문 */
const FIELD_WEIGHTS: Record<SearchField, number> = {
  title: 10,
  aliases: 8,
  tags: 6,
  keywords: 5,
  description: 2,
  body: 1,
}

/** 검색 의도에는 영향이 없는 단어. "낙관적 락과 비관적 락의 차이" → "차이" 제거 */
const STOPWORDS = new Set([
  '차이', '차이점', '비교', '개념', '원리', '정리', '설명', '이란', '란', '뭐야', '무엇', '무엇인가', '방법', '사용법',
  'vs', 'what', 'is', 'the', 'a', 'an', 'how', 'and', 'or', 'of', 'in',
])

/** 토큰 끝에 붙은 한국어 조사. 원형으로 일치하지 않을 때만 떼어 본다. */
const TRAILING_PARTICLE = /(으로|에서|이란|란|의|과|와|은|는|이|가|을|를|도|로|에)$/

/** 대소문자·공백·구두점 차이를 없앤다. "낙관적 락" ≈ "낙관적락", "@Version" ≈ "version" */
export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s\-_./·,()@+:'"`?!]/g, '')
}

export function tokenize(query: string): string[] {
  const tokens = query.split(/\s+/).map(normalize).filter(Boolean)
  const meaningful = tokens.filter((t) => !STOPWORDS.has(t))
  return meaningful.length > 0 ? meaningful : tokens
}

type MetaField = Exclude<SearchField, 'body'>
/** 본문(body)은 선택. 본문 인덱스를 불러온 뒤에만 검색 대상에 들어간다. */
type Fields = Record<MetaField, string[]> & { body?: string[] }

export interface IndexedConcept {
  concept: ConceptMeta
  fields: Record<MetaField, string[]>
}

export function indexConcepts(concepts: ConceptMeta[]): IndexedConcept[] {
  return concepts.map((concept) => ({
    concept,
    fields: {
      title: [normalize(concept.title)],
      aliases: concept.aliases.map(normalize),
      tags: concept.tags.map(normalize),
      keywords: concept.keywords.map(normalize),
      description: [normalize(concept.description)],
    },
  }))
}

function scoreToken(fields: Fields, token: string) {
  let best = 0
  const matched: SearchField[] = []
  for (const field of Object.keys(FIELD_WEIGHTS) as SearchField[]) {
    let fieldScore = 0
    for (const value of fields[field] ?? []) {
      if (!value.includes(token)) continue
      // 완전 일치·접두 일치에 가산점
      const bonus = value === token ? 1.5 : value.startsWith(token) ? 1.2 : 1
      fieldScore = Math.max(fieldScore, FIELD_WEIGHTS[field] * bonus)
    }
    if (fieldScore > 0) matched.push(field)
    best = Math.max(best, fieldScore)
  }
  return { score: best, matched }
}

function scoreTokenWithParticles(fields: Fields, token: string) {
  const direct = scoreToken(fields, token)
  if (direct.score > 0) return direct
  const stem = token.replace(TRAILING_PARTICLE, '')
  if (stem === token || stem.length === 0) return direct
  const stemmed = scoreToken(fields, stem)
  return { score: stemmed.score * 0.8, matched: stemmed.matched }
}

export function matchesFilters(concept: ConceptMeta, filters: SearchFilters = {}): boolean {
  if (filters.category && concept.category !== filters.category) return false
  if (filters.difficulty && concept.difficulty !== filters.difficulty) return false
  if (filters.hasSimulator && concept.visualizationType === 'static') return false
  if (filters.tags?.length && !filters.tags.every((t) => concept.tags.includes(t))) return false
  return true
}

export interface SearchOptions {
  /** 'all' = 모든 토큰이 일치(기본), 'any' = 하나라도 일치 (빈 결과일 때 대안 제시용) */
  match?: 'all' | 'any'
  /** 개념 id → 정규화된 본문 텍스트 (prepareBodies 결과). 없으면 메타데이터만 검색한다. */
  bodies?: Record<string, string>
}

export function search(
  index: IndexedConcept[],
  query: string,
  filters: SearchFilters = {},
  { match = 'all', bodies }: SearchOptions = {},
): SearchResult[] {
  const tokens = tokenize(query)
  const candidates = index.filter((item) => matchesFilters(item.concept, filters))

  if (tokens.length === 0) {
    return candidates.map(({ concept }) => ({ concept, score: 0, matchedFields: [] }))
  }

  const phrase = normalize(query)
  const results: SearchResult[] = []
  for (const { concept, fields: meta } of candidates) {
    const body = bodies?.[concept.id]
    const fields: Fields = body ? { ...meta, body: [body] } : meta
    let score = 0
    let matchedTokens = 0
    const matched = new Set<SearchField>()
    for (const token of tokens) {
      const r = scoreTokenWithParticles(fields, token)
      if (r.score > 0) matchedTokens++
      score += r.score
      r.matched.forEach((f) => matched.add(f))
    }
    const ok = match === 'all' ? matchedTokens === tokens.length : matchedTokens > 0
    if (!ok) continue
    // 검색어 전체가 제목·별칭에 그대로 들어 있으면 가산점
    if (fields.title[0].includes(phrase) || fields.aliases.some((a) => a.includes(phrase))) score += 10
    results.push({ concept, score, matchedFields: [...matched] })
  }
  // 점수 내림차순. 같은 점수면 원래 순서 유지 (Array.prototype.sort는 안정 정렬)
  return results.sort((a, b) => b.score - a.score)
}

/* ---------- 본문 검색 보조 ---------- */

/** 본문 섹션을 하나의 평문으로 (제목 줄 포함) */
export function bodyText(doc: Pick<ConceptDocument, 'sections'>): string {
  return doc.sections.map((s) => `${s.heading}\n${s.text}`).join('\n')
}

/** 검색에 쓸 수 있게 본문을 미리 정규화한다. 한 번만 계산해서 재사용한다. */
export function prepareBodies(docs: Pick<ConceptDocument, 'id' | 'sections'>[]): Record<string, string> {
  return Object.fromEntries(docs.map((d) => [d.id, normalize(bodyText(d))]))
}

/**
 * 원문 본문에서 검색어가 처음 나오는 곳 주변을 잘라 보여 준다. 못 찾으면 undefined.
 * (정규화 텍스트는 공백이 없어 위치를 되돌릴 수 없으므로 원문에서 단어 단위로 찾는다)
 */
export interface Snippet {
  /** 일치 지점 앞의 문맥 (잘렸으면 '…'로 시작) */
  before: string
  /** 원문에서 일치한 부분 (대소문자 원문 그대로) */
  match: string
  /** 일치 지점 뒤의 문맥 (잘렸으면 '…'로 끝) */
  after: string
}

export function snippet(raw: string, query: string, radius = 48): Snippet | undefined {
  const lower = raw.toLowerCase()
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
  const flat = (s: string) => s.replace(/\s+/g, ' ')
  for (const word of words) {
    for (const candidate of [word, word.replace(TRAILING_PARTICLE, '')]) {
      if (!candidate) continue
      const at = lower.indexOf(candidate)
      if (at === -1) continue
      const matchEnd = at + candidate.length
      // 단어 중간에서 자르지 않도록 문맥 경계를 공백에 맞춘다
      let start = Math.max(0, at - radius)
      if (start > 0) start = Math.min(at, raw.indexOf(' ', start) + 1 || at)
      let end = Math.min(raw.length, matchEnd + radius)
      if (end < raw.length) end = Math.max(matchEnd, raw.lastIndexOf(' ', end))
      return {
        before: `${start > 0 ? '…' : ''}${flat(raw.slice(start, at)).trimStart()}`,
        match: raw.slice(at, matchEnd),
        after: `${flat(raw.slice(matchEnd, end)).trimEnd()}${end < raw.length ? '…' : ''}`,
      }
    }
  }
  return undefined
}
