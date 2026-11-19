# DevScope

> 읽어서 이해하는 기술 문서를 넘어, 눈으로 보고 직접 조작하며 이해하는 기술 문서.

DevScope는 개발자가 이해하기 어려운 기술 개념을 **쉬운 비유 → 정확한 동작 원리 → 인터랙티브 시각화 → 실제 코드 → 판단 기준 → 주의 사항** 순서로 학습하는 웹 플랫폼입니다. 백엔드·프론트엔드를 공부하는 개발자, 부트캠프 교육생, 주니어 개발자를 대상으로 합니다.

## 주요 기능

- **인터랙티브 시뮬레이터 5종.** 모든 시뮬레이터는 이전·다음 단계, 처음부터, 자동 재생·일시정지, 단계 설명, 키보드 `←`/`→` 조작을 지원합니다.
  - **낙관적 락 vs 비관적 락**: 버전 충돌·재시도, 잠금 대기, MVCC 일반 SELECT
  - **트랜잭션 격리 수준**: Dirty·Non-repeatable·Phantom Read × 격리 수준 4개 × PostgreSQL/MySQL InnoDB. 이상 현상이 생기는지, 막는다면 스냅샷으로 막는지 잠금 대기로 막는지 비교
  - **JavaScript 이벤트 루프**: Call Stack, Web APIs, Task·Microtask Queue, 콘솔. 예제 3개
  - **React 렌더링**: state 변경 버튼, 렌더 단계와 커밋 단계, memo, DOM 변경 diff
  - **HTTP 요청·응답**: Browser → … → Database 왕복. 계층을 클릭하면 역할과 Spring Boot 코드를 보여 줍니다
- **13개 개념 페이지.** 한국어로 작성했고, 공식 문서 출처와 관련 개념, 이전·다음 개념 이동, 목차를 갖췄습니다.
- **로컬 검색.** 한국어·영어 용어를 함께 검색하고 조사·불용어를 처리합니다. 제목·별칭·태그·키워드·설명에 더해 **본문 내용**까지 검색하며, 본문에서만 찾은 결과에는 일치한 문맥을 보여 줍니다.
- **개념 탐색.** 카테고리·난이도·태그·시뮬레이터 유무로 필터링합니다. 필터는 URL에 저장되어 새로고침이나 링크 공유 후에도 유지됩니다.
- **MCP 서버.** Claude, VS Code 같은 AI 개발 도구가 DevScope 개념을 검색하고 읽을 수 있습니다 ([아래](#mcp-서버) 참고).
- 다크 테마, 반응형(데스크톱·모바일), 모션 감소 설정 대응, 키보드 접근성(본문 건너뛰기, `Ctrl/⌘ + K` 검색)

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | React 19, TypeScript 7, Vite 8 |
| 라우팅 | React Router 8 (`createBrowserRouter`) |
| 스타일 | Tailwind CSS 4 |
| 애니메이션 | Motion for React (`motion/react`) |
| 콘텐츠 | MDX 3 (`@mdx-js/rollup`, 빌드 시 컴파일), remark-gfm |
| 코드 하이라이트 | Shiki 4. MDX는 빌드 시 `@shikijs/rehype`, 시뮬레이터 코드는 런타임 지연 로드 |
| 아이콘 | Lucide |
| MCP | MCP TypeScript SDK v2 (`@modelcontextprotocol/server`), zod 4 |
| 테스트 | Vitest 5 (+ Testing Library), Playwright |

웹 백엔드·DB·인증은 없습니다. 검색과 시뮬레이션은 모두 브라우저에서 실행되고, MCP 서버는 각자의 PC에서 로컬로 실행됩니다.

## 설치 및 실행

Node.js 22.18 이상이 필요합니다. 빌드 스크립트가 Node의 TypeScript 직접 실행 기능을 쓰기 때문입니다 (개발 환경: Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

## 빌드 및 테스트

```bash
npm run build      # 타입 검사(tsc -b) + 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기 (http://localhost:4173)

npm run content:export  # 본문 추출 → public/content/concepts.json (build·dev가 자동 실행)
npm run typecheck  # 타입 검사만
npm run lint       # oxlint
npm test           # 단위 테스트 (Vitest)

npx playwright install chromium   # 최초 1회
npm run test:e2e   # E2E 테스트: 빌드 → preview 서버 → 데스크톱·모바일(Pixel 7) 두 환경에서 실행
```

> **Windows 주의**: 터미널의 현재 경로가 소문자 드라이브(`c:\...`)이면 Vitest가 모듈을 두 번 불러와 `failed to find the current suite` 오류가 납니다. VS Code 터미널에서 생길 수 있습니다. `cd C:\...`처럼 대문자 드라이브 경로로 이동한 뒤 실행하세요.

## 배포

`main` 브랜치에 push하면 GitHub Actions([.github/workflows/deploy.yml](.github/workflows/deploy.yml))가 GitHub Pages에 배포합니다. 워크플로는 타입 검사 → 단위 테스트 → 빌드 → 배포 순서로 실행됩니다.

- 주소: https://wol20670.github.io/dev-scope/
- 하위 경로(`/dev-scope/`) 배포를 위해 빌드할 때 `BASE_PATH`를 지정합니다. 라우터 `basename`도 이 값을 따릅니다. 로컬에서는 지정하지 않으면 `/`입니다.
- GitHub Pages는 SPA 경로 재작성을 지원하지 않습니다. 그래서 `index.html`을 `404.html`로도 복사해, `/concepts/cors` 같은 URL을 직접 열거나 새로고침해도 앱이 뜨도록 했습니다. 이때 HTTP 상태 코드는 404입니다. 검색 엔진 노출이 중요해지면 경로 재작성을 지원하는 호스팅(Netlify `_redirects`, Vercel `rewrites`, Nginx `try_files` 등)으로 옮기는 것을 권장합니다.

## 콘텐츠 추가 방법

1. `src/content/concepts/<slug>/meta.ts`: 메타데이터를 작성합니다 (`satisfies ConceptMeta`).
2. `src/content/concepts/<slug>/content.mdx`: 정해진 7개 섹션으로 본문을 작성합니다.
3. `src/content/concepts/index.ts`: 배열에 한 줄 추가합니다.
4. `npm test`: 콘텐츠 검증 테스트로 관계·섹션·출처 형식을 확인합니다.

자세한 규격, 사용할 수 있는 MDX 컴포넌트(`<Callout>`, `<Flow>`, `<Sequence>`, `<Simulator />`), 정확성 원칙, 시뮬레이터 등록 방법은 [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)에 있습니다.

## MCP 서버

Claude, VS Code 같은 AI 개발 도구가 DevScope 개념을 검색하고 읽을 수 있는 MCP 서버(stdio)입니다. 웹 앱과 같은 조회·검색 모듈을 그대로 쓰고, 본문까지 검색합니다. 별도 빌드 없이 Node 22.18 이상에서 바로 실행됩니다.

| 도구 | 설명 |
| --- | --- |
| `search_concepts` | 한·영 키워드로 개념 검색 (본문 포함). 카테고리·난이도·태그·시뮬레이터 필터와 `limit` 지원 |
| `get_concept` | 개념 하나를 Markdown으로 반환. 핵심 요약, 본문 섹션, 선행·관련 개념, 출처 포함. `sections`로 필요한 섹션만 선택 가능 |
| `list_concepts` | 필터를 적용한 개념 목록 |
| `get_related_concepts` | 선행 개념과 관련 개념 |

모든 도구는 읽기 전용입니다. 결과에는 사람이 읽을 Markdown과 프로그램용 `structuredContent`가 함께 담깁니다.

### 연결하기

먼저 `npm install`을 실행해 두어야 합니다.

**Claude Code**: 저장소에 [.mcp.json](.mcp.json)이 들어 있습니다. 이 폴더에서 `claude`를 실행하면 `devscope` 서버 사용 여부를 묻고, 승인하면 연결됩니다. 다른 폴더에서 쓰려면 다음처럼 등록합니다.

```bash
claude mcp add devscope -- node /절대/경로/devscope/mcp/server.ts
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "devscope": { "command": "node", "args": ["/절대/경로/devscope/mcp/server.ts"] }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "devscope": { "type": "stdio", "command": "node", "args": ["${workspaceFolder}/mcp/server.ts"] }
  }
}
```

- 결과에 들어가는 웹 페이지 주소는 기본이 배포 사이트입니다. 로컬 주소로 바꾸려면 환경 변수 `DEVSCOPE_SITE_URL`을 지정합니다 (예: `http://localhost:5173`).
- 서버는 시작할 때 콘텐츠를 한 번 읽습니다. 개념을 추가하거나 수정했다면 서버를 다시 시작하세요.
- 디버깅: `npm run mcp:inspect`는 MCP Inspector를 열어 도구를 직접 호출해 볼 수 있게 합니다. 처음 실행할 때 Inspector 패키지를 내려받습니다.
- 서버를 `npm run`으로 감싸 실행하지 마세요. npm이 stdout에 출력하는 줄이 MCP 통신(JSON-RPC)을 깨뜨립니다.

## 콘텐츠 JSON (외부 도구용)

빌드할 때 모든 개념의 메타데이터와 본문 평문을 하나의 JSON으로 내보냅니다. 배포 사이트의 [content/concepts.json](https://wol20670.github.io/dev-scope/content/concepts.json)에서 받을 수 있습니다. 콘텐츠 조회·검색 모듈(`src/lib/content`)은 번들러 없이 Node에서 바로 import할 수 있으며, MCP 서버도 이 모듈을 그대로 씁니다. 자세한 형식은 [ARCHITECTURE.md](docs/ARCHITECTURE.md#5-mcp-서버와-콘텐츠-계층)에 있습니다.

## 문서

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 시스템 구조, 콘텐츠·검색·시뮬레이터 계층, MCP 서버 구조
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): 콘텐츠 작성 가이드
- [docs/ROADMAP.md](docs/ROADMAP.md): MVP 범위와 다음 단계
