/**
 * DevScope MCP 서버 (stdio)
 *
 *   node mcp/server.ts
 *
 * 저장소의 개념 콘텐츠(메타데이터 + MDX 본문)를 시작할 때 한 번 읽어, 검색·조회 도구로 제공한다.
 * 웹 앱과 같은 조회·검색 모듈(src/lib/content)을 그대로 쓴다. 콘텐츠를 고쳤다면 서버를 다시 시작한다.
 *
 * stdout은 JSON-RPC 채널이므로 로그는 반드시 stderr(console.error)로 쓴다.
 */
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { buildContentExport } from '../scripts/export-content.ts'
import { bodyText, categories, createConceptStore, difficultyLabels, prepareBodies, snippet } from '../src/lib/content/index.ts'
import type { ConceptDocument, ConceptMeta, SearchFilters } from '../src/types/concept.ts'

const SITE_URL = (process.env.DEVSCOPE_SITE_URL ?? 'https://wol20670.github.io/dev-scope').replace(/\/$/, '')
const SECTION_HEADINGS = ['왜 필요한가?', '쉽게 이해하는 비유', '동작 원리', '시각화', '코드 예시', '언제 사용해야 할까?', '주의 사항과 흔한 오해']

const categoryIds = categories.map((c) => c.id) as [ConceptMeta['category'], ...ConceptMeta['category'][]]
const difficultyIds = Object.keys(difficultyLabels) as [ConceptMeta['difficulty'], ...ConceptMeta['difficulty'][]]

const filterShape = {
  category: z.enum(categoryIds).optional().describe('Category id'),
  difficulty: z.enum(difficultyIds).optional().describe('beginner | intermediate | advanced'),
  tags: z.array(z.string()).optional().describe('All of these tags must match (tags are mostly Korean, e.g. "트랜잭션", "React")'),
  hasSimulator: z.boolean().optional().describe('Only concepts that have an interactive simulator on the website'),
}

const conceptItem = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.string(),
  hasSimulator: z.boolean(),
  url: z.string(),
})

const readOnly = { readOnlyHint: true, openWorldHint: false } as const

export function createDevScopeServer(docs: ConceptDocument[] = buildContentExport().concepts) {
  const store = createConceptStore(docs)
  const byId = new Map(docs.map((d) => [d.id, d]))
  const bodies = prepareBodies(docs)
  const rawBodies = Object.fromEntries(docs.map((d) => [d.id, bodyText(d)]))

  const url = (c: ConceptMeta) => `${SITE_URL}/concepts/${c.slug}`
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id
  const item = (c: ConceptMeta) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: categoryLabel(c.category),
    difficulty: difficultyLabels[c.difficulty],
    hasSimulator: c.visualizationType !== 'static',
    url: url(c),
  })
  const line = (c: ConceptMeta) =>
    `- **${c.title}** (\`${c.id}\`) — ${categoryLabel(c.category)} · ${difficultyLabels[c.difficulty]}${
      c.visualizationType !== 'static' ? ' · 시뮬레이터' : ''
    }\n  ${c.description}`
  /** id 또는 slug로 찾는다 */
  const find = (key: string) => byId.get(key) ?? docs.find((d) => d.slug === key)
  const notFound = (key: string) => {
    const guesses = store.searchConcepts(key.replace(/-/g, ' '), {}, { match: 'any', bodies }).slice(0, 3)
    const hint = guesses.length ? ` Did you mean: ${guesses.map((g) => `\`${g.concept.id}\``).join(', ')}?` : ''
    return { content: [{ type: 'text' as const, text: `Concept "${key}" not found.${hint} Use list_concepts to see all ids.` }], isError: true }
  }

  const server = new McpServer({ name: 'devscope', version: '0.1.0' })

  server.registerTool(
    'search_concepts',
    {
      title: '개념 검색',
      description:
        'Search DevScope developer-concept articles (written in Korean) by keyword. Korean and English terms both work ' +
        '(e.g. "낙관적 락", "optimistic lock", "@Transactional", "event loop"). Searches title, aliases, tags, keywords, description and full body text. ' +
        'Returns the best matches; use get_concept to read one.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Search keywords'),
        ...filterShape,
        limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of results'),
      }),
      outputSchema: z.object({
        results: z.array(conceptItem.extend({ matchedFields: z.array(z.string()), snippet: z.string().optional() })),
        partialMatch: z.boolean().describe('true if no concept matched every keyword and results match only some of them'),
      }),
      annotations: readOnly,
    },
    async ({ query, limit, ...filters }) => {
      let results = store.searchConcepts(query, filters as SearchFilters, { bodies })
      const partialMatch = results.length === 0
      if (partialMatch) results = store.searchConcepts(query, filters as SearchFilters, { bodies, match: 'any' })
      const top = results.slice(0, limit).map((r) => {
        const s = r.matchedFields.every((f) => f === 'body') ? snippet(rawBodies[r.concept.id], query) : undefined
        return { ...item(r.concept), matchedFields: r.matchedFields, snippet: s ? `${s.before}${s.match}${s.after}` : undefined }
      })
      const header = top.length
        ? `${partialMatch ? 'No concept matched every keyword. Partial matches' : 'Results'} for "${query}" (${top.length} of ${results.length}):`
        : `No concepts found for "${query}". Try fewer or different keywords (Korean or English), or call list_concepts.`
      const body = top
        .map((r, i) => `${i + 1}. **${r.title}** (\`${r.id}\`) — ${r.category} · ${r.difficulty}\n   ${r.description}${r.snippet ? `\n   본문: ${r.snippet}` : ''}\n   ${r.url}`)
        .join('\n')
      return {
        content: [{ type: 'text', text: [header, body].filter(Boolean).join('\n\n') }],
        structuredContent: { results: top, partialMatch },
      }
    },
  )

  server.registerTool(
    'get_concept',
    {
      title: '개념 읽기',
      description:
        'Read one DevScope concept as Markdown (Korean): summary, key points, body sections, prerequisites, related concepts and official references. ' +
        `Body sections: ${SECTION_HEADINGS.map((h) => `"${h}"`).join(', ')}. Pass "sections" to read only some of them.`,
      inputSchema: z.object({
        id: z.string().describe('Concept id or slug, e.g. "optimistic-pessimistic-lock"'),
        sections: z.array(z.string()).optional().describe('Section headings to include. Omit to include all.'),
      }),
      annotations: readOnly,
    },
    async ({ id, sections }) => {
      const doc = find(id)
      if (!doc) return notFound(id)
      const unknown = (sections ?? []).filter((s) => !doc.sections.some((d) => d.heading === s))
      if (unknown.length) {
        return {
          content: [{ type: 'text', text: `Unknown section(s): ${unknown.join(', ')}. Available: ${doc.sections.map((s) => s.heading).join(', ')}` }],
          isError: true,
        }
      }
      const picked = sections?.length ? doc.sections.filter((s) => sections.includes(s.heading)) : doc.sections
      const refs = (ids: string[]) => ids.map((x) => byId.get(x)).filter((c): c is ConceptDocument => !!c)
      const text = [
        `# ${doc.title}`,
        doc.description,
        `- 분류: ${categoryLabel(doc.category)} · 난이도: ${difficultyLabels[doc.difficulty]} · 검토일: ${doc.updatedAt}`,
        `- 웹 페이지: ${url(doc)}${doc.visualizationType !== 'static' ? ' (인터랙티브 시뮬레이터 있음)' : ''}`,
        `## 핵심 요약\n${doc.keyPoints.map((p) => `- ${p}`).join('\n')}`,
        ...picked.map((s) => `## ${s.heading}\n${s.text}`),
        doc.prerequisites.length ? `## 선행 개념\n${refs(doc.prerequisites).map((c) => `- ${c.title} (\`${c.id}\`)`).join('\n')}` : '',
        `## 관련 개념\n${store.getRelatedConcepts(doc.id).map((c) => `- ${c.title} (\`${c.id}\`)`).join('\n') || '- 없음'}`,
        `## 공식 문서 및 출처\n${doc.references.map((r) => `- ${r.title} — ${r.publisher}: ${r.url}`).join('\n')}`,
      ]
        .filter(Boolean)
        .join('\n\n')
      return { content: [{ type: 'text', text }] }
    },
  )

  server.registerTool(
    'list_concepts',
    {
      title: '개념 목록',
      description: 'List DevScope concepts, optionally filtered by category, difficulty, tags or simulator availability. Returns ids for get_concept.',
      inputSchema: z.object(filterShape),
      outputSchema: z.object({ concepts: z.array(conceptItem) }),
      annotations: readOnly,
    },
    async (filters) => {
      const list = store.listConcepts(filters as SearchFilters)
      const cats = categories.map((c) => `\`${c.id}\` (${c.label})`).join(', ')
      return {
        content: [{ type: 'text', text: `${list.length} concepts. Categories: ${cats}\n\n${list.map(line).join('\n')}` }],
        structuredContent: { concepts: list.map(item) },
      }
    },
  )

  server.registerTool(
    'get_related_concepts',
    {
      title: '관련 개념',
      description: 'Get the prerequisites (learn first) and related concepts (learn next) of a DevScope concept.',
      inputSchema: z.object({ id: z.string().describe('Concept id or slug') }),
      outputSchema: z.object({ prerequisites: z.array(conceptItem), related: z.array(conceptItem) }),
      annotations: readOnly,
    },
    async ({ id }) => {
      const doc = find(id)
      if (!doc) return notFound(id)
      const prerequisites = store.getPrerequisites(doc.id)
      const related = store.getRelatedConcepts(doc.id)
      const text = [
        `# ${doc.title}`,
        `## 선행 개념 (먼저 보면 좋은 개념)\n${prerequisites.map(line).join('\n') || '- 없음'}`,
        `## 관련 개념\n${related.map(line).join('\n') || '- 없음'}`,
      ].join('\n\n')
      return {
        content: [{ type: 'text', text }],
        structuredContent: { prerequisites: prerequisites.map(item), related: related.map(item) },
      }
    },
  )

  return server
}

// 직접 실행했을 때만 stdio로 서비스한다 (테스트에서는 createDevScopeServer만 import)
if (import.meta.filename === process.argv[1]) {
  const docs = buildContentExport().concepts
  serveStdio(() => createDevScopeServer(docs))
  console.error(`DevScope MCP server ready on stdio (${docs.length} concepts)`)
}
