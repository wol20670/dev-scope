import { RefreshCw, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { NotFoundPage } from './NotFoundPage'

/**
 * 라우트 렌더링 중 에러. 대표적인 원인은 새 버전이 배포된 뒤 열려 있던 탭이
 * 사라진 이전 청크 파일을 불러오려는 경우다. 404가 아니므로 새로고침을 안내한다.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <title>문제가 발생했습니다 — DevScope</title>
      <TriangleAlert aria-hidden className="size-10 text-warn" />
      <h1 className="mt-6 text-2xl font-bold text-fg">페이지를 불러오지 못했습니다</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        새 버전이 배포되었거나 네트워크가 잠시 불안정했을 수 있습니다. 새로고침하면 대부분 해결됩니다.
      </p>
      <div className="mt-8 flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 font-semibold text-canvas hover:bg-sky-300"
        >
          <RefreshCw aria-hidden className="size-4" /> 새로고침
        </button>
        <Link to="/" reloadDocument className="rounded-lg border border-line px-3.5 py-1.5 text-fg hover:bg-raised">
          홈으로
        </Link>
      </div>
    </div>
  )
}
