import { useEffect, useState } from 'react'
import { bodyText, prepareBodies } from '../../lib/content'
import type { ContentExport } from '../../types/concept'

export interface ConceptBodies {
  /** 개념 id → 원문 본문 (스니펫 표시용) */
  raw: Record<string, string>
  /** 개념 id → 정규화된 본문 (검색용) */
  normalized: Record<string, string>
}

// ponytail: 모든 본문을 JSON 하나로 받는다(현재 gzip 약 70KB). 개념이 수백 개를 넘으면 빌드 시 역색인을 만들어 나눠 받는다.
let cache: Promise<ConceptBodies> | undefined

function load(): Promise<ConceptBodies> {
  cache ??= fetch(`${import.meta.env.BASE_URL}content/concepts.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`content/concepts.json: HTTP ${res.status}`)
      return res.json() as Promise<ContentExport>
    })
    .then((data) => ({
      raw: Object.fromEntries(data.concepts.map((c) => [c.id, bodyText(c)])),
      normalized: prepareBodies(data.concepts),
    }))
  // 실패하면 다음 검색 때 다시 시도
  cache.catch(() => (cache = undefined))
  return cache
}

/**
 * 본문 검색용 데이터를 필요할 때(enabled) 한 번만 불러온다.
 * 불러오기 전이나 실패했을 때는 undefined이고, 그동안 검색은 메타데이터만으로 동작한다.
 */
export function useConceptBodies(enabled: boolean): ConceptBodies | undefined {
  const [bodies, setBodies] = useState<ConceptBodies>()
  useEffect(() => {
    if (!enabled) return
    let alive = true
    load()
      .then((b) => alive && setBodies(b))
      .catch(() => {}) // 본문 검색 없이도 메타데이터 검색은 동작한다
    return () => {
      alive = false
    }
  }, [enabled])
  return bodies
}
