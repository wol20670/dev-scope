import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildContentExport } from '../../scripts/export-content'
import { extractSections } from '../../scripts/mdx-text'
import { concepts } from '../../src/content/concepts'
import { prepareBodies, searchConcepts, snippet } from '../../src/lib/content'
import type { ContentExport } from '../../src/types/concept'

const ROOT = join(import.meta.dirname, '../..')
const REQUIRED = ['왜 필요한가?', '쉽게 이해하는 비유', '동작 원리', '시각화', '코드 예시', '언제 사용해야 할까?', '주의 사항과 흔한 오해']

describe('extractSections (MDX → 평문)', () => {
  const mdx = `머리말 문단

## 첫 섹션

**굵게**와 \`code\`가 섞인 문단.

### 소제목

- 항목 하나
- 항목 둘

| 이름 | 값 |
| --- | --- |
| a | 1 |

<Callout type="warn" title="콜아웃 제목">
콜아웃 **본문**
</Callout>

## 둘째 섹션

<Flow title="흐름" steps={[{ title: '단계 하나', detail: \`설명 둘\` }]} />

\`\`\`java
@Version Long version;
\`\`\`
`
  const sections = extractSections(mdx)

  it('## 단위로 섹션을 나누고, 첫 ## 이전은 개요로 묶는다', () => {
    expect(sections.map((s) => s.heading)).toEqual(['개요', '첫 섹션', '둘째 섹션'])
    expect(sections[0].text).toBe('머리말 문단')
  })

  it('인라인 서식·소제목·목록·표·컴포넌트 자식을 평문으로 바꾼다', () => {
    const text = sections[1].text
    expect(text).toContain('굵게와 code가 섞인 문단.')
    expect(text).toContain('소제목')
    expect(text).toContain('- 항목 하나')
    expect(text).toContain('a | 1')
    expect(text).toContain('콜아웃 제목') // 문자열 속성
    expect(text).toContain('콜아웃 본문') // 자식 텍스트
    expect(text).not.toMatch(/[*`<>]/)
  })

  it('JSX 속성 표현식 안의 문자열과 코드 블록을 포함한다', () => {
    const text = sections[2].text
    expect(text).toContain('흐름')
    expect(text).toContain('단계 하나')
    expect(text).toContain('설명 둘')
    expect(text).toContain('@Version Long version;')
  })
})

describe('buildContentExport', () => {
  const data = buildContentExport()

  it('모든 개념을 메타데이터 + 섹션 본문으로 내보낸다', () => {
    expect(data.schemaVersion).toBe(1)
    expect(data.concepts.map((c) => c.id)).toEqual(concepts.map((c) => c.id))
    for (const c of data.concepts) {
      expect(c.path).toBe(`/concepts/${c.slug}`)
      expect(c.sections.map((s) => s.heading), c.id).toEqual(REQUIRED)
      for (const s of c.sections) expect(s.text.length, `${c.id} / ${s.heading}`).toBeGreaterThan(30)
    }
  })

  it('정적 다이어그램(<Flow>, <Sequence>)의 내용도 본문에 들어간다', () => {
    const ioc = data.concepts.find((c) => c.id === 'spring-ioc-di')!
    expect(ioc.sections.find((s) => s.heading === '시각화')!.text).toContain('빈 정의 수집')
  })
})

describe('본문 검색', () => {
  const data = buildContentExport()
  const bodies = prepareBodies(data.concepts)
  const raw = Object.fromEntries(data.concepts.map((c) => [c.id, c.sections.map((s) => s.text).join('\n')]))

  it('본문에만 있는 단어는 본문 인덱스가 있을 때만 찾는다', () => {
    expect(searchConcepts('화이트보드')).toEqual([])
    const results = searchConcepts('화이트보드', {}, { bodies })
    expect(results.map((r) => r.concept.id)).toEqual(['transaction-isolation'])
    expect(results[0].matchedFields).toEqual(['body'])
    expect(searchConcepts('HikariCP', {}, { bodies })[0].concept.id).toBe('http-request-lifecycle')
  })

  it('본문 가중치가 가장 낮아 메타데이터 일치가 앞에 온다', () => {
    const results = searchConcepts('트랜잭션', {}, { bodies })
    expect(results.length).toBeGreaterThan(searchConcepts('트랜잭션').length)
    expect(results[0].matchedFields).toContain('title')
  })

  it('snippet은 검색어 주변 문맥을 잘라 보여 준다', () => {
    const s = snippet(raw['transaction-isolation'], '화이트보드 비유')!
    expect(s.match).toBe('화이트보드')
    const text = s.before + s.match + s.after
    expect(text.length).toBeLessThan(140)
    expect(raw['transaction-isolation'].replace(/\s+/g, ' ')).toContain(text.replace(/…/g, ''))
    // 단어 중간에서 자르지 않는다: 잘린 앞부분은 원문에서 공백 바로 뒤에서 시작한다
    expect(s.before).toMatch(/^…\S/)
    expect(raw['transaction-isolation'].replace(/\s+/g, ' ')).toContain(` ${s.before.slice(1)}`)
    expect(snippet('Hello World Example', 'world')).toEqual({ before: 'Hello ', match: 'World', after: ' Example' })
    expect(snippet(raw['transaction-isolation'], 'kubernetes')).toBeUndefined()
  })
})

describe('Node 호환 (MCP 등 외부 도구에서 그대로 실행)', () => {
  const run = (args: string[]) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })

  it('콘텐츠 조회·검색 모듈을 번들러 없이 Node로 import할 수 있다', () => {
    const r = run([
      '--input-type=module',
      '-e',
      "const m = await import('./src/lib/content/index.ts'); console.log(JSON.stringify({ n: m.listConcepts().length, top: m.searchConcepts('event loop')[0].concept.id, s: m.getConceptSummary('cors').path }))",
    ])
    expect(r.status, r.stderr).toBe(0)
    expect(JSON.parse(r.stdout)).toEqual({ n: concepts.length, top: 'js-event-loop', s: '/concepts/cors' })
  })

  it('export 스크립트가 JSON 파일을 만든다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devscope-'))
    try {
      const out = join(dir, 'concepts.json')
      const r = run(['scripts/export-content.ts', out])
      expect(r.status, r.stderr).toBe(0)
      const json = JSON.parse(readFileSync(out, 'utf8')) as ContentExport
      expect(json.concepts).toHaveLength(concepts.length)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
