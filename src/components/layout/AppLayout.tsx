import { MotionConfig } from 'motion/react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import { categories } from '../../lib/content'
import { Logo, SiteHeader } from './SiteHeader'

export function AppLayout() {
  return (
    // 사용자가 OS에서 모션 감소를 켜면 transform 애니메이션을 끈다 (상태 변화는 텍스트·색으로도 표시됨)
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ScrollRestoration />
    </MotionConfig>
  )
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            읽어서 이해하는 기술 문서를 넘어, 눈으로 보고 직접 조작하며 이해하는 기술 문서.
          </p>
        </div>
        <nav aria-label="카테고리">
          <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">Categories</p>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/concepts?category=${c.id}`} className="text-muted hover:text-fg">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="사이트">
          <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">DevScope</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/concepts" className="text-muted hover:text-fg">
                개념 탐색
              </Link>
            </li>
            <li>
              <Link to="/concepts?sim=1" className="text-muted hover:text-fg">
                인터랙티브 시뮬레이터
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-muted hover:text-fg">
                서비스 소개
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-subtle">
        콘텐츠는 공식 문서를 근거로 작성되며, 각 개념 페이지 하단에 출처를 표기합니다.
      </p>
    </footer>
  )
}
