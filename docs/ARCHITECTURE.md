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
├─ types/concept.ts
└─ styles/index.css          # Tailwind 테마 토큰 + MDX 본문 스타일
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

개념이 수백 개 수준이면 매 입력마다 전체를 순회해도 충분히 빠릅니다. 수천 개 이상이 되거나 형태소 분석·오타 교정이 필요해지면 역색인이나 외부 검색 엔진을 검토합니다([ROADMAP](ROADMAP.md) 참고).

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

## 5. 향후 MCP 확장 구조

MCP 서버에서 재사용할 수 있도록 다음 경계를 지킵니다.

- `types/concept.ts`, `content/categories.ts`, `content/paths.ts`, `content/concepts/**/meta.ts`, `lib/content/*`는 **React·Vite·DOM을 import하지 않습니다.**
- `createConceptStore(concepts)`는 데이터를 주입받는 순수 함수이며, 앱과 MCP가 같은 함수를 공유합니다.

예상 구성 (아직 구현하지 않음):

```
packages/
├─ content/        # 지금의 src/types, src/content(meta), src/lib/content 를 옮긴 패키지
├─ web/            # 현재 앱
└─ mcp-server/     # @modelcontextprotocol/sdk 기반 stdio 서버
```

| MCP tool (안) | 대응 함수 |
| --- | --- |
| `search_concepts(query, filters)` | `searchConcepts` |
| `get_concept(id)` | `getConceptSummary` (+ 본문 텍스트) |
| `list_concepts(filters)` | `listConcepts` |
| `get_related_concepts(id)` | `getRelatedConcepts` |

본문(MDX)을 MCP에서 텍스트로 제공하려면 빌드 단계에서 MDX를 평문·Markdown으로 추출하는 스크립트가 필요합니다. 그 전까지는 `keyPoints`와 `description`, 출처가 요약 역할을 합니다.
