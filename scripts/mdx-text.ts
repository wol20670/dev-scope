import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import type { ConceptSection } from '../src/types/concept.ts'

/**
 * MDX 본문을 `##` 섹션 단위의 평문으로 바꾼다. (Node 전용, 브라우저 번들에 포함하지 않음)
 * MDX를 실행하지 않고 문법 트리(mdast)만 읽는다.
 *
 * - 문단·목록·표·인용·코드 블록의 텍스트를 순서대로 모은다.
 * - JSX 컴포넌트는 자식 텍스트와, 속성 표현식 안의 문자열(예: <Flow steps={[{ title: '…' }]} />)을 모은다.
 * - `###` 소제목은 섹션 안의 한 줄로 남긴다.
 */

interface Node {
  type: string
  value?: unknown
  depth?: number
  children?: Node[]
  attributes?: { type: string; value?: unknown }[]
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] })

/** estree(속성 표현식의 JS 문법 트리)에서 문자열 리터럴만 모은다 */
function estreeStrings(node: unknown, out: string[]) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const n of node) estreeStrings(n, out)
    return
  }
  const n = node as Record<string, unknown>
  if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value)
  else if (n.type === 'TemplateElement') out.push(String((n.value as { cooked?: string })?.cooked ?? ''))
  for (const [key, value] of Object.entries(n)) if (key !== 'loc' && key !== 'range') estreeStrings(value, out)
}

/** 인라인 요소를 한 줄 텍스트로 */
function inline(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') return String(node.value ?? '')
  if (node.type === 'break') return ' '
  return (node.children ?? []).map(inline).join('')
}

/** 블록 요소를 줄 단위 텍스트로 */
function blocks(node: Node, out: string[]) {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      out.push(inline(node))
      return
    case 'code':
      out.push(String(node.value ?? ''))
      return
    case 'list':
      for (const item of node.children ?? []) {
        const lines: string[] = []
        for (const child of item.children ?? []) blocks(child, lines)
        if (lines.length) out.push(`- ${lines.join(' ')}`)
      }
      return
    case 'table':
      for (const row of node.children ?? []) out.push((row.children ?? []).map(inline).join(' | '))
      return
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement': {
      const strings: string[] = []
      for (const attr of node.attributes ?? []) {
        if (typeof attr.value === 'string') strings.push(attr.value)
        else if (attr.value && typeof attr.value === 'object') estreeStrings((attr.value as { data?: { estree?: unknown } }).data?.estree, strings)
      }
      out.push(...strings.filter((s) => s.trim()))
      for (const child of node.children ?? []) blocks(child, out)
      return
    }
    case 'mdxjsEsm':
    case 'mdxFlowExpression':
    case 'thematicBreak':
    case 'html':
      return
    default:
      for (const child of node.children ?? []) blocks(child, out)
  }
}

export function extractSections(mdx: string): ConceptSection[] {
  const root = processor.parse(mdx) as unknown as Node
  const sections: ConceptSection[] = []
  let current: { heading: string; lines: string[] } | null = null

  for (const node of root.children ?? []) {
    if (node.type === 'heading' && node.depth === 2) {
      if (current) sections.push({ heading: current.heading, text: current.lines.join('\n') })
      current = { heading: inline(node).trim(), lines: [] }
      continue
    }
    // 첫 ## 이전의 내용은 '개요'로 묶는다
    current ??= { heading: '개요', lines: [] }
    blocks(node, current.lines)
  }
  if (current) sections.push({ heading: current.heading, text: current.lines.join('\n') })
  return sections.map((s) => ({ heading: s.heading, text: s.text.replace(/\n{2,}/g, '\n').trim() }))
}
