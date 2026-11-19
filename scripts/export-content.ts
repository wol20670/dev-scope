/**
 * 개념 메타데이터 + 본문 평문을 하나의 JSON으로 내보낸다.
 *   node scripts/export-content.ts [출력 경로]
 * 기본 출력: public/content/concepts.json → 사이트에서 /content/concepts.json 으로 제공된다.
 * 웹의 본문 검색과, 이후 MCP 서버 같은 외부 도구가 이 파일을 사용한다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { concepts } from '../src/content/concepts/index.ts'
import type { ContentExport } from '../src/types/concept.ts'
import { extractSections } from './mdx-text.ts'

const root = join(import.meta.dirname, '..')

export function buildContentExport(): ContentExport {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    concepts: concepts.map((c) => ({
      ...c,
      path: `/concepts/${c.slug}`,
      sections: extractSections(readFileSync(join(root, 'src/content/concepts', c.slug, 'content.mdx'), 'utf8')),
    })),
  }
}

// CLI로 실행했을 때만 파일을 쓴다 (테스트에서는 buildContentExport만 import)
if (import.meta.filename === process.argv[1]) {
  const out = process.argv[2] ?? join(root, 'public/content/concepts.json')
  const data = buildContentExport()
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(data))
  const chars = data.concepts.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.text.length, 0), 0)
  console.log(`content export: ${data.concepts.length}개 개념, 본문 ${chars.toLocaleString()}자 → ${out}`)
}
