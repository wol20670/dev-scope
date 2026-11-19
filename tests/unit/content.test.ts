import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categories } from '../../src/content/categories'
import { concepts } from '../../src/content/concepts'
import { learningPaths } from '../../src/content/paths'
import { simulators } from '../../src/content/registry/simulators'

/**
 * 콘텐츠 검증 테스트. 새 개념을 추가했을 때 실수를 잡아낸다.
 * (docs/CONTENT_GUIDE.md의 규칙을 코드로 옮긴 것)
 */
const CONCEPTS_DIR = join(import.meta.dirname, '../../src/content/concepts')
const REQUIRED_SECTIONS = [
  '## 왜 필요한가?',
  '## 쉽게 이해하는 비유',
  '## 동작 원리',
  '## 시각화',
  '## 코드 예시',
  '## 언제 사용해야 할까?',
  '## 주의 사항과 흔한 오해',
]
const ids = new Set(concepts.map((c) => c.id))

describe('콘텐츠 메타데이터', () => {
  it('12개 이상의 개념이 등록되어 있다', () => {
    expect(concepts.length).toBeGreaterThanOrEqual(12)
  })

  it('id와 slug가 중복되지 않고 kebab-case다', () => {
    expect(ids.size).toBe(concepts.length)
    expect(new Set(concepts.map((c) => c.slug)).size).toBe(concepts.length)
    for (const c of concepts) {
      expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('폴더에 있는 모든 개념이 index.ts에 등록되어 있다', () => {
    const folders = readdirSync(CONCEPTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    expect(folders.sort()).toEqual(concepts.map((c) => c.slug).sort())
  })

  it.each(concepts.map((c) => [c.id, c] as const))('%s: 관계와 필드가 유효하다', (_, c) => {
    expect(categories.map((cat) => cat.id)).toContain(c.category)
    for (const id of [...c.prerequisites, ...c.relatedConcepts]) {
      expect(ids, `${c.id} → ${id}`).toContain(id)
      expect(id).not.toBe(c.id)
    }
    expect(c.description.length).toBeGreaterThan(20)
    expect(c.keyPoints.length).toBeGreaterThanOrEqual(3)
    expect(c.keyPoints.length).toBeLessThanOrEqual(6)
    expect(c.tags.length).toBeGreaterThan(0)
    expect(c.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(c.references.length).toBeGreaterThan(0)
    for (const r of c.references) {
      expect(r.url).toMatch(/^https:\/\//)
      expect(r.title && r.publisher).toBeTruthy()
    }
  })

  it('학습 경로가 존재하는 개념만 가리킨다', () => {
    for (const path of learningPaths) for (const id of path.conceptIds) expect(ids).toContain(id)
  })
})

describe('콘텐츠 본문 (MDX)', () => {
  it.each(concepts.map((c) => [c.slug, c] as const))('%s: content.mdx가 템플릿을 따른다', (slug, c) => {
    const file = join(CONCEPTS_DIR, slug, 'content.mdx')
    expect(existsSync(file)).toBe(true)
    const mdx = readFileSync(file, 'utf8')

    // 필수 섹션이 정해진 순서대로 있다
    const positions = REQUIRED_SECTIONS.map((h) => mdx.split('\n').findIndex((line) => line.trim() === h))
    expect(positions.every((p) => p >= 0), `누락된 섹션: ${REQUIRED_SECTIONS.filter((_, i) => positions[i] < 0)}`).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)

    // 시뮬레이터가 있는 개념만 <Simulator />를 쓴다
    if (c.visualizationType === 'static') {
      expect(mdx).not.toContain('<Simulator')
    } else {
      expect(Object.keys(simulators)).toContain(c.visualizationType)
      expect(mdx).toContain('<Simulator />')
    }
  })
})
