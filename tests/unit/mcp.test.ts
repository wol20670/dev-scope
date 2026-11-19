import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDevScopeServer } from '../../mcp/server'
import { concepts } from '../../src/content/concepts'

type TextResult = { content: { type: string; text?: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean }
const text = (r: TextResult) => r.content.map((c) => c.text ?? '').join('\n')

describe('MCP 서버 도구 (in-memory)', () => {
  const client = new Client({ name: 'devscope-test', version: '0.0.0' })
  const call = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args }) as Promise<TextResult>

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await createDevScopeServer().connect(serverTransport)
    await client.connect(clientTransport)
  })
  afterAll(() => client.close())

  it('읽기 전용 도구 4개를 제공한다', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['get_concept', 'get_related_concepts', 'list_concepts', 'search_concepts'])
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true)
  })

  it('search_concepts: 한·영 키워드와 본문으로 검색한다', async () => {
    const lock = await call('search_concepts', { query: '낙관적 락과 비관적 락의 차이' })
    expect((lock.structuredContent!.results as { id: string }[])[0].id).toBe('optimistic-pessimistic-lock')

    const body = await call('search_concepts', { query: 'HikariCP' })
    const results = body.structuredContent!.results as { id: string; matchedFields: string[]; snippet?: string; url: string }[]
    expect(results[0]).toMatchObject({ id: 'http-request-lifecycle', matchedFields: ['body'] })
    expect(results[0].snippet).toContain('HikariCP')
    expect(results[0].url).toBe('https://wol20670.github.io/dev-scope/concepts/http-request-lifecycle')
    expect(text(body)).toContain('본문:')
  })

  it('search_concepts: 필터와 limit, 일부 일치 대체 결과', async () => {
    const r = await call('search_concepts', { query: 'React', hasSimulator: true, limit: 1 })
    expect(r.structuredContent!.results).toHaveLength(1)
    expect((r.structuredContent!.results as { id: string }[])[0].id).toBe('react-rendering')

    const partial = await call('search_concepts', { query: 'kubernetes 이벤트 루프' })
    expect(partial.structuredContent!.partialMatch).toBe(true)
    expect(text(partial)).toContain('Partial matches')

    const none = await call('search_concepts', { query: 'kubernetes' })
    expect(none.structuredContent!.results).toEqual([])
  })

  it('get_concept: 전체 또는 선택한 섹션을 마크다운으로 돌려준다', async () => {
    const full = text(await call('get_concept', { id: 'transaction-isolation' }))
    expect(full).toMatch(/^# 트랜잭션 격리 수준/)
    for (const h of ['## 핵심 요약', '## 왜 필요한가?', '## 주의 사항과 흔한 오해', '## 관련 개념', '## 공식 문서 및 출처']) expect(full).toContain(h)
    expect(full).toContain('https://www.postgresql.org/docs/current/transaction-iso.html')

    const part = text(await call('get_concept', { id: 'cors', sections: ['코드 예시'] }))
    expect(part).toContain('## 코드 예시')
    expect(part).not.toContain('## 왜 필요한가?')
  })

  it('get_concept: 없는 id·섹션은 isError와 함께 대안을 안내한다', async () => {
    const missing = await call('get_concept', { id: 'event-loop' })
    expect(missing.isError).toBe(true)
    expect(text(missing)).toContain('js-event-loop')

    const badSection = await call('get_concept', { id: 'cors', sections: ['없는 섹션'] })
    expect(badSection.isError).toBe(true)
    expect(text(badSection)).toContain('Available:')
  })

  it('list_concepts / get_related_concepts', async () => {
    const all = await call('list_concepts')
    expect(all.structuredContent!.concepts).toHaveLength(concepts.length)
    const frontend = await call('list_concepts', { category: 'frontend' })
    expect((frontend.structuredContent!.concepts as { category: string }[]).every((c) => c.category === 'Frontend')).toBe(true)

    const rel = await call('get_related_concepts', { id: 'transaction-isolation' })
    expect((rel.structuredContent!.prerequisites as { id: string }[]).map((c) => c.id)).toEqual(['spring-transaction'])
    expect((rel.structuredContent!.related as { id: string }[]).map((c) => c.id)).toContain('optimistic-pessimistic-lock')
  })

  it('잘못된 입력은 스키마 검증으로 거절된다', async () => {
    const r = await call('search_concepts', { query: '' })
    expect(r.isError).toBe(true)
  })
})

describe('MCP 서버 (실제 stdio 프로세스)', () => {
  it('node mcp/server.ts로 실행해 클라이언트가 연결·호출할 수 있다', async () => {
    const client = new Client({ name: 'devscope-stdio-test', version: '0.0.0' })
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['mcp/server.ts'],
      cwd: join(import.meta.dirname, '../..'),
      stderr: 'pipe',
    })
    await client.connect(transport)
    try {
      const { tools } = await client.listTools()
      expect(tools).toHaveLength(4)
      const r = (await client.callTool({ name: 'search_concepts', arguments: { query: 'event loop', limit: 1 } })) as TextResult
      expect((r.structuredContent!.results as { id: string }[])[0].id).toBe('js-event-loop')
    } finally {
      await client.close()
    }
  }, 30_000)
})
