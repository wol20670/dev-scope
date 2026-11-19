import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export function CopyButton({ text, className = '' }: { text: string | (() => string); className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(typeof text === 'function' ? text() : text)
          .then(() => setCopied(true))
          .catch(() => {})
      }}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-subtle transition-colors hover:bg-overlay hover:text-fg ${className}`}
      aria-label={copied ? '복사됨' : '코드 복사'}
    >
      {copied ? <Check aria-hidden className="size-3.5 text-ok" /> : <Copy aria-hidden className="size-3.5" />}
      <span aria-hidden>{copied ? '복사됨' : '복사'}</span>
    </button>
  )
}
