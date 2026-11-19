import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

/** 큰 검색창. 제출하면 /search?q= 로 이동한다. */
export function SearchForm({ initial = '', autoFocus = false, size = 'lg' }: { initial?: string; autoFocus?: boolean; size?: 'md' | 'lg' }) {
  const [query, setQuery] = useState(initial)
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const h = size === 'lg' ? 'h-14 text-base' : 'h-11 text-sm'
  return (
    <form role="search" onSubmit={submit} className="w-full">
      <label className="relative flex items-center">
        <span className="sr-only">개념 검색</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 size-5 text-subtle" />
        <input
          type="search"
          name="q"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 낙관적 락, event loop, CORS, N+1"
          className={`${h} w-full rounded-xl border border-line-strong bg-surface pr-24 pl-12 text-fg shadow-[0_8px_30px_-12px_#000] placeholder:text-subtle focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10`}
        />
        <button
          type="submit"
          className="absolute right-2 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-canvas transition-colors hover:bg-sky-300"
        >
          검색
        </button>
      </label>
    </form>
  )
}
