import { Menu, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

const nav = [
  { to: '/concepts', label: '개념 탐색' },
  { to: '/about', label: '소개' },
]

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-fg" aria-label="DevScope 홈">
      <svg aria-hidden viewBox="0 0 32 32" className="size-7">
        <rect width="32" height="32" rx="8" fill="#111a2c" stroke="#2b3a5c" />
        <circle cx="14" cy="14" r="7" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
        <path d="M19 19l6 6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="14" cy="14" r="2" fill="#7dd3fc" />
      </svg>
      <span>
        Dev<span className="text-accent">Scope</span>
      </span>
    </Link>
  )
}

export function SiteHeader() {
  const location = useLocation()
  // 메뉴를 연 시점의 location.key. 페이지를 이동하면 key가 바뀌어 자동으로 닫힌다
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === location.key
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // Ctrl/⌘ + K 또는 / 로 검색창 포커스
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    inputRef.current?.blur()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-canvas"
      >
        본문으로 건너뛰기
      </a>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <form role="search" onSubmit={submit} className="ml-auto hidden w-full max-w-xs sm:block">
          <label className="group relative flex items-center">
            <span className="sr-only">개념 검색</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-subtle" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="개념 검색…"
              className="h-9 w-full rounded-lg border border-line bg-surface pr-12 pl-9 text-sm text-fg placeholder:text-subtle focus:border-accent/60 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-2 rounded border border-line px-1.5 text-[10px] text-subtle">Ctrl K</kbd>
          </label>
        </form>

        <button
          type="button"
          className="ml-auto inline-flex size-9 items-center justify-center rounded-lg border border-line text-muted sm:ml-0 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setOpenedAt(open ? null : location.key)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line px-4 py-3 md:hidden">
          <form role="search" onSubmit={submit} className="mb-3 sm:hidden">
            <label className="relative flex items-center">
              <span className="sr-only">개념 검색</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-subtle" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="개념 검색…"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 text-sm text-fg placeholder:text-subtle focus:border-accent/60 focus:outline-none"
              />
            </label>
          </form>
          <nav aria-label="모바일 메뉴" className="flex flex-col">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className="rounded-lg px-2 py-2.5 text-sm text-muted hover:bg-raised hover:text-fg">
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
