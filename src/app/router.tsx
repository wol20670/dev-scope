import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { AboutPage } from '../pages/AboutPage'
import { ConceptPage } from '../pages/ConceptPage'
import { ExplorePage } from '../pages/ExplorePage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { SearchPage } from '../pages/SearchPage'

// 하위 경로 배포(예: GitHub Pages의 /dev-scope/)를 위해 Vite의 base와 맞춘다. 로컬에서는 '/'.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/concepts', element: <ExplorePage /> },
        { path: '/concepts/:slug', element: <ConceptPage /> },
        { path: '/search', element: <SearchPage /> },
        { path: '/about', element: <AboutPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename },
)
