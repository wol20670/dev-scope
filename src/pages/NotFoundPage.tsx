import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { SearchForm } from '../components/ui/SearchForm'

export function NotFoundPage({ message = '요청한 페이지를 찾을 수 없습니다.' }: { message?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <title>페이지를 찾을 수 없음 — DevScope</title>
      <Compass aria-hidden className="size-10 text-subtle" />
      <p className="mt-6 font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-bold text-fg">{message}</h1>
      <p className="mt-2 text-sm text-muted">주소가 바뀌었거나 아직 없는 개념일 수 있습니다. 검색해 보세요.</p>
      <div className="mt-8 w-full">
        <SearchForm size="md" />
      </div>
      <div className="mt-6 flex gap-3 text-sm">
        <Link to="/" className="rounded-lg border border-line px-3 py-1.5 text-fg hover:bg-raised">
          홈으로
        </Link>
        <Link to="/concepts" className="rounded-lg border border-line px-3 py-1.5 text-fg hover:bg-raised">
          개념 탐색
        </Link>
      </div>
    </div>
  )
}
