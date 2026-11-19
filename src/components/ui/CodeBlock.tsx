import { useEffect, useState } from 'react'
import { CopyButton } from './CopyButton'

/** 런타임 하이라이트에 쓰는 언어만 개별 청크로 불러온다 */
const languages = {
  java: () => import('@shikijs/langs/java'),
  typescript: () => import('@shikijs/langs/typescript'),
  sql: () => import('@shikijs/langs/sql'),
  yaml: () => import('@shikijs/langs/yaml'),
}

export type CodeLang = keyof typeof languages

/**
 * 시뮬레이터처럼 런타임에 코드가 바뀌는 곳에서 쓰는 코드 블록.
 * (MDX 본문의 코드 블록은 빌드 시점에 하이라이트되므로 이 컴포넌트를 쓰지 않는다.)
 * Shiki는 처음 필요할 때만 불러오고, 그 전에는 일반 텍스트로 보여 준다.
 */
type Highlighter = Awaited<ReturnType<typeof import('shiki/core').createHighlighterCore>>
let highlighterPromise: Promise<Highlighter> | undefined
const loadedLangs = new Set<string>()

async function highlight(code: string, lang: CodeLang): Promise<string> {
  highlighterPromise ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ])
    return createHighlighterCore({ themes: [import('@shikijs/themes/github-dark-default')], engine: createJavaScriptRegexEngine() })
  })()
  const highlighter = await highlighterPromise
  if (!loadedLangs.has(lang)) {
    await highlighter.loadLanguage(languages[lang]())
    loadedLangs.add(lang)
  }
  return highlighter.codeToHtml(code, { lang, theme: 'github-dark-default' })
}

export function CodeBlock({ code, lang, title }: { code: string; lang: CodeLang; title?: string }) {
  const [html, setHtml] = useState<{ code: string; html: string }>()

  useEffect(() => {
    let cancelled = false
    highlight(code, lang)
      .then((h) => !cancelled && setHtml({ code, html: h }))
      .catch(() => {}) // 하이라이트 실패 시 일반 텍스트로 남긴다
    return () => {
      cancelled = true
    }
  }, [code, lang])

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#0a0f1a]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[11px] text-subtle">
        <span className="font-mono">{title ?? lang}</span>
        <CopyButton text={code} className="ml-auto" />
      </div>
      {html?.code === code ? (
        <div
          className="overflow-x-auto p-3.5 text-[12.5px] leading-relaxed [&_pre]:!bg-transparent"
          // Shiki가 생성한 HTML. 입력은 저장소에 포함된 코드 문자열뿐이다.
          dangerouslySetInnerHTML={{ __html: html.html }}
        />
      ) : (
        <pre className="overflow-x-auto p-3.5 text-[12.5px] leading-relaxed text-fg/85">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
