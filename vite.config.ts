import mdx from '@mdx-js/rollup'
import rehypeShiki from '@shikijs/rehype'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // 하위 경로에 배포할 때만 지정한다. 예: BASE_PATH=/dev-scope/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    {
      enforce: 'pre',
      // 코드 하이라이트는 빌드 시점에 끝난다. 브라우저에서 MDX를 평가하지 않는다.
      ...mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypeShiki,
            {
              theme: 'github-dark-default',
              langs: ['java', 'typescript', 'tsx', 'javascript', 'sql', 'http', 'bash', 'json', 'yaml', 'properties'],
            },
          ],
        ],
      }),
    },
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
  ],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
})
