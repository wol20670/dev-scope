# 아키텍처

## 1. 시스템 구조

DevScope는 백엔드가 없는 정적 SPA입니다. 콘텐츠는 저장소에 포함된 TypeScript·MDX 파일이고, 빌드 시 번들에 들어갑니다.

```
┌──────────────────────── 브라우저 ─────────────────────────┐
│  pages/ (라우트)                                          │
│    ├─ components/ (레이아웃, 카드, MDX 컴포넌트)            │
│    └─ components/simulations/ (시뮬레이터 UI + model.ts)   │
│               │                    │                      │
│               ▼                    ▼                      │
│  content/registry/        lib/simulation/                 │
│  (MDX·시뮬레이터 lazy 연결)  (재생 reducer, useStepPlayer)  │
│               │                                           │
│               ▼                                           │
│  lib/content/  ◀── UI·Vite에 의존하지 않는 순수 TS ──▶  (향후 MCP 서버)
│  (조회·검색 API)                                           │
│               │                                           │
│               ▼                                           │
│  content/ (categories, paths, concepts/*/meta.ts)         │
│  types/concept.ts                                         │
└───────────────────────────────────────────────────────────┘
```

```
src/
├─ app/router.tsx            # 라우트 정의
├─ pages/                    # Home, Explore, Concept, Search, About, NotFound
├─ components/
│  ├─ layout/                # 헤더, 푸터, 공통 레이아웃
│  ├─ concepts/              # 개념 카드, 배지, 시뮬레이터 미리보기
│  ├─ mdx/                   # MDX에 주입하는 컴포넌트 (Callout, Flow, Sequence, Simulator, 제목, 코드 블록)
│  ├─ simulations/           # SimulatorShell + 시뮬레이터별 폴더 (model.ts + UI)
│  └─ ui/                    # CodeBlock, CopyButton, SearchForm
├─ content/
│  ├─ concepts/<slug>/       # meta.ts + content.mdx
│  ├─ concepts/index.ts      # 메타데이터 목록
│  ├─ registry/              # mdx.ts(본문 지연 로드), simulators.ts(시뮬레이터 지연 로드)
│  ├─ categories.ts, paths.ts
├─ lib/
│  ├─ content/               # store.ts(조회 API), search.ts(검색), index.ts(기본 store)
│  └─ simulation/            # player.ts(reducer), useStepPlayer.ts, accumulate.ts
├─ features/search/          # useConceptBodies (본문 검색 데이터 지연 로드)
├─ types/concept.ts
└─ styles/index.css          # Tailwind 테마 토큰 + MDX 본문 스타일
scripts/                     # Node 전용: mdx-text.ts(본문 추출), export-content.ts(JSON 내보내기)
mcp/server.ts                # MCP 서버 (stdio)
tests/
├─ unit/                     # Vitest: 콘텐츠 검증, 검색, 재생, 시뮬레이션 모델
└─ e2e/                      # Playwright: 페이지·검색·필터·시뮬레이터·반응형·접근성
```

**라우트**

| 경로 | 페이지 |
| --- | --- |
| `/` | 메인 |
| `/concepts?q=&category=&difficulty=&tag=&sim=1` | 개념 탐색. 필터 상태는 URL에 있다 |
| `/concepts/:slug` | 개념 상세 |
| `/search?q=` | 검색 결과 |
| `/about` | 서비스 소개 |
| `*` | 404 |

상태 관리는 React 내장 기능(`useState`, `useReducer`, Context, URL search params)만 사용합니다.

## 2. 콘텐츠 계층

개념 하나는 세 부분으로 나뉩니다.

| 부분 | 위치 | 성격 | 소비자 |
| --- | --- | --- | --- |
| 메타데이터 | `content/concepts/<slug>/meta.ts` | 순수 데이터 (TS 객체) | 목록, 검색, 관련 개념, MCP |
| 본문 | `content/concepts/<slug>/content.mdx` | MDX (빌드 시 컴파일) | 상세 페이지 |
| 시뮬레이터 | `components/simulations/<id>/` | React 컴포넌트 | 본문 속 `<Simulator />` |

- **메타데이터는 명시적 목록**(`concepts/index.ts`)으로 모읍니다. `import.meta.glob`을 쓰지 않으므로 Vite 없이 Node에서도 import할 수 있습니다.
- **본문은 `import.meta.glob`으로 slug 폴더에서 자동 연결**합니다(`registry/mdx.ts`). 개념마다 별도 청크로 나뉘어 해당 페이지를 열 때만 로드됩니다.
- **MDX 보안**: MDX는 빌드 시점에 저장소 파일만 컴파일합니다. 브라우저에서 임의의 MDX 문자열을 평가하는 경로는 없습니다.
- **상세 페이지 템플릿**: 제목·요약·핵심 요약(keyPoints)·관련 개념·출처는 메타데이터로 렌더링합니다. 본문의 7개 `##` 섹션은 MDX가 담당합니다. 목차는 렌더링된 `h2`에서 수집하고, `IntersectionObserver`로 현재 섹션을 강조합니다.
- **코드 하이라이트**: MDX 코드 블록은 `@shikijs/rehype`가 빌드 시 HTML로 바꾸므로 런타임 비용이 없습니다. 시뮬레이터 안의 코드는 `CodeBlock`이 Shiki core와 JS 정규식 엔진, 필요한 언어만 지연 로드해 하이라이트합니다.
- **품질 게이트**: `tests/unit/content.test.ts`가 다음을 검사합니다. id·slug 중복, 폴더↔목록 일치, 관계 id 유효성, 필수 섹션 순서, 시뮬레이터 등록 여부, 출처 형식.

## 3. 검색 구조

`lib/content/search.ts`는 외부 의존성이 없는 로컬 인덱스입니다.

1. **인덱싱**: 개념별로 `title`, `aliases`, `tags`, `keywords`, `description`을 정규화해 둡니다. 정규화는 NFKC, 소문자 변환, 공백·구두점 제거입니다. 그래서 "낙관적 락"과 "낙관적락", "@Version"과 "version"이 같은 문자열로 취급됩니다.
2. **토큰화**: 공백으로 나누고 불용어(차이, 비교, vs, what 등)를 제거합니다. 불용어만 남으면 원래 토큰을 그대로 씁니다.
3. **매칭**: 토큰마다 필드별 부분 일치를 찾습니다. 원형이 일치하지 않으면 끝의 조사(의·과·와·은·는·을·를 …)를 떼고 다시 시도하며, 이 경우 점수의 0.8배를 줍니다.
4. **점수**: 필드 가중치(제목 10 > 별칭 8 > 태그 6 > 키워드 5 > 설명 2)에 완전 일치(×1.5)·접두 일치(×1.2) 가산점을 곱합니다. 검색어 전체가 제목이나 별칭에 그대로 들어 있으면 +10입니다.
5. **결합**: 기본은 모든 토큰이 일치해야 하는 AND입니다. 결과가 없으면 검색 페이지가 `match: 'any'`로 일부 키워드가 일치하는 개념을 대안으로 제시합니다.
6. **필터**: 카테고리·난이도·태그(AND)·시뮬레이터 유무를 검색 전에 적용합니다.
7. **본문**: 검색어가 생기면 `features/search/useConceptBodies`가 `content/concepts.json`(5.2 참고)을 한 번만 불러와 본문을 정규화해 둡니다. 이후 검색에는 `body` 필드가 가중치 1로 추가됩니다. 불러오기 전이나 실패했을 때는 메타데이터만으로 검색합니다. 본문에서만 일치한 결과에는 `snippet()`이 원문에서 찾은 문맥을 단어 경계에 맞춰 보여 주고, 일치한 단어를 강조합니다.

개념이 수백 개 수준이면 매 입력마다 전체를 순회해도 충분히 빠릅니다. 본문 JSON은 현재 gzip 약 70KB이며, 개념이 늘면 빌드 시 역색인을 만들어 나눠 받는 방식으로 바꿉니다. 수천 개 이상이 되거나 형태소 분석·오타 교정이 필요해지면 역색인이나 외부 검색 엔진을 검토합니다([ROADMAP](ROADMAP.md) 참고).

## 4. 시뮬레이터 구조

시뮬레이터는 **상태 모델(순수 함수)** 과 **UI** 를 분리합니다.

```
model.ts  (React 없음, 단위 테스트 대상)
  └─ 단계 배열 생성: Step[] = 각 시점의 "전체 상태 + 제목 + 설명"
UI 컴포넌트
  ├─ useStepPlayer(steps.length)  → index, next/prev/reset/goto/play/pause
  └─ <SimulatorShell>  → 공통 프레임, 컨트롤, 단계 설명(aria-live), 진행 표시, ←/→ 키
```

| 시뮬레이터 | 모델 | 특징 |
| --- | --- | --- |
| 락 | `accumulate()`로 단계별 변경분을 누적한 시나리오 데이터 | 시나리오 탭(낙관적/비관적) |
| 격리 수준 | `getOutcome(현상, 수준, DBMS)`이 결과(발생 / 스냅샷 / 커밋된 값만 / 잠금 대기)를 정하고, `buildIsolationSteps()`가 결과에 맞는 단계를 생성 | 24개 조합, 결과 비교표. 단위 테스트가 공식 문서 기준 기대값과 대조 |
| 이벤트 루프 | **실행 엔진** `runEventLoop(program)`이 `log`, `setTimeout`, `then` 연산으로 이루어진 프로그램을 가상 시계로 실행해 스냅샷 생성 | 출력 순서가 모델 규칙에서 자동으로 나온다. Motion `layoutId`로 콜백 이동 표시 |
| React 렌더링 | `simulateUpdate(state, action, memo)`가 트리를 순회해 렌더 대상, memo 건너뛰기, DOM diff 계산 | 사용자 조작마다 새 단계 생성 후 자동 재생 |
| HTTP | 계층 정의 + 왕복 단계 데이터 | 계층 클릭 시 역할과 코드, 패킷은 `layoutId`로 이동 |

**재생 로직** (`lib/simulation/player.ts`)

- 순수 reducer입니다. 사용자가 직접 단계를 옮기면 자동 재생이 멈추고, 마지막 단계에서 재생하면 처음부터 다시 재생하며, `tick`은 재생 중일 때만 진행합니다.
- `useStepPlayer`는 단계마다 `setTimeout` 하나를 걸고, effect cleanup으로 일시정지·단계 변경·언마운트 시 정리합니다.
- 시나리오를 바꿀 때는 `key`로 재마운트해 재생 상태를 초기화합니다.

**모션 감소**: `MotionConfig reducedMotion="user"`로 transform 애니메이션을 끕니다. 모든 상태 변화는 텍스트 배지와 단계 설명으로도 전달됩니다.

**지연 로드**: `registry/simulators.ts`에서 `React.lazy`로 등록하므로, 시뮬레이터 코드는 해당 개념 페이지에서만 로드됩니다.

## 5. MCP 서버와 콘텐츠 계층

### 5.1 Node에서 그대로 실행되는 콘텐츠 계층

`types/concept.ts`, `content/categories.ts`, `content/paths.ts`, `content/concepts/**/meta.ts`, `lib/content/*`는 **React·Vite·DOM을 import하지 않고**, 상대 import에 `.ts` 확장자를 붙입니다. 그래서 Node 22.18 이상에서는 번들러나 빌드 없이 import할 수 있습니다 (Node 내장 타입 제거 기능 사용).

```js
// 저장소 루트에서
const { searchConcepts, getConceptSummary } = await import('./src/lib/content/index.ts')
searchConcepts('event loop')[0].concept.id // 'js-event-loop'
```

이 호환성은 다음 두 가지가 지킵니다.

- `tsconfig.node.json`(`module: nodenext`)이 `scripts/`가 import하는 콘텐츠 계층을 타입 검사합니다. 확장자가 빠지면 `tsc -b`가 실패합니다.
- `tests/unit/content-export.test.ts`가 별도 Node 프로세스로 모듈을 import해 검색을 실행해 봅니다.

`erasableSyntaxOnly`가 켜져 있으므로 이 계층에서 `enum`, `namespace`처럼 실행 시 코드가 필요한 TypeScript 문법은 쓸 수 없습니다.

### 5.2 콘텐츠 JSON 내보내기

`scripts/export-content.ts`가 메타데이터와 **본문 평문**을 `public/content/concepts.json`으로 내보냅니다. `npm run build`와 `npm run dev`(predev)가 자동으로 실행하며, 생성 파일은 git에 넣지 않습니다.

- 본문 추출(`scripts/mdx-text.ts`)은 MDX를 실행하지 않고 문법 트리만 읽습니다. 문단·목록·표·코드 블록, 컴포넌트 자식 텍스트, `<Flow steps={[...]}>` 같은 속성 표현식 안의 문자열을 `##` 섹션 단위로 모읍니다.
- 배포 사이트에서는 `https://wol20670.github.io/dev-scope/content/concepts.json`으로 공개됩니다.

```ts
interface ContentExport {
  schemaVersion: 1
  generatedAt: string // ISO 8601
  concepts: (ConceptMeta & {
    path: string // '/concepts/<slug>'
    sections: { heading: string; text: string }[] // 본문 7개 섹션
  })[]
}
```

### 5.3 MCP 서버 (`mcp/server.ts`)

`@modelcontextprotocol/server`(TypeScript SDK v2) 기반의 stdio 서버입니다. 연결 방법은 [README](../README.md#mcp-서버)를 참고합니다.

```
node mcp/server.ts
  └─ buildContentExport()        # scripts/export-content.ts: meta + MDX 본문 평문 (시작 시 1회)
      └─ createConceptStore(docs) # src/lib/content: 웹 앱과 같은 조회·검색
         prepareBodies(docs)      # 본문 검색 인덱스
```

| 도구 | 대응 함수 | 출력 |
| --- | --- | --- |
| `search_concepts(query, filters, limit)` | `searchConcepts(..., { bodies })`. 결과가 없으면 `match: 'any'`로 대체 | Markdown + `structuredContent.results` |
| `get_concept(id, sections?)` | `ConceptDocument` + `getRelatedConcepts` | Markdown 문서 |
| `list_concepts(filters)` | `listConcepts` | Markdown + `structuredContent.concepts` |
| `get_related_concepts(id)` | `getPrerequisites`, `getRelatedConcepts` | Markdown + `structuredContent` |

- 입력은 zod 스키마로 검증합니다. 잘못된 입력은 SDK가 `isError` 결과로 돌려줍니다.
- 없는 id를 받으면 `isError`와 함께 비슷한 개념 id를 제안합니다. id 대신 slug도 받습니다.
- 모든 도구에 `readOnlyHint: true`를 표시합니다.
- 로그는 stderr로만 씁니다. stdout은 JSON-RPC 채널입니다.
- 테스트(`tests/unit/mcp.test.ts`)는 SDK 클라이언트로 두 가지를 검증합니다.
  - in-memory 연결: 각 도구의 동작
  - 실제 `node mcp/server.ts` 프로세스와의 stdio 연결

아직 하지 않은 것:

- 배포된 `content/concepts.json`을 읽는 원격 모드: 지금은 저장소의 MDX를 직접 읽습니다.
- HTTP transport(원격 MCP 서버)
- MCP resources·prompts
