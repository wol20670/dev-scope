import { lazy, type LazyExoticComponent } from 'react'
import type { MDXContent } from 'mdx/types'

/**
 * 개념 본문 MDX. 저장소에 포함된 파일만 빌드 시점에 컴파일되며,
 * 브라우저에서 임의의 MDX 문자열을 평가하지 않는다.
 */
const loaders = import.meta.glob<{ default: MDXContent }>('../concepts/*/content.mdx')

const cache = new Map<string, LazyExoticComponent<MDXContent>>()

export function getConceptContent(slug: string): LazyExoticComponent<MDXContent> | undefined {
  const loader = loaders[`../concepts/${slug}/content.mdx`]
  if (!loader) return undefined
  let component = cache.get(slug)
  if (!component) {
    component = lazy(loader)
    cache.set(slug, component)
  }
  return component
}
