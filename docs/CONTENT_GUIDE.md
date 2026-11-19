# 콘텐츠 작성 가이드

DevScope의 개념 페이지는 **메타데이터(`meta.ts`) + 본문(`content.mdx`) + (선택) 시뮬레이터**로 구성된다.

```
src/content/
├─ categories.ts            # 카테고리 정의
├─ paths.ts                 # 메인 페이지 추천 학습 경로
├─ concepts/
│  ├─ index.ts              # 모든 meta를 모으는 목록 (새 개념은 여기 한 줄 추가)
│  └─ <slug>/
│     ├─ meta.ts            # 메타데이터
│     └─ content.mdx        # 본문
└─ registry/
   └─ simulators.ts         # visualizationType → 시뮬레이터 컴포넌트
```

## 1. 새 개념 추가 절차

1. `src/content/concepts/<slug>/` 폴더를 만든다.
2. `meta.ts`를 작성한다. (아래 규격 참고, `satisfies ConceptMeta`로 타입 검사)
3. `content.mdx`를 작성한다. (아래 템플릿 참고)
4. `src/content/concepts/index.ts`에 import 한 줄과 배열 항목 한 줄을 추가한다.
5. `npm test`를 실행한다. 콘텐츠 검증 테스트가 다음을 확인한다.
   - id·slug 중복, slug 형식
   - `prerequisites`/`relatedConcepts`가 존재하는 id를 가리키는지
   - `content.mdx` 존재 여부와 필수 섹션 제목
   - `visualizationType`이 등록된 시뮬레이터인지, 시뮬레이터 개념의 본문에 `<Simulator />`가 있는지
   - 출처가 1개 이상이고 `https://` URL인지

본문 MDX는 `import.meta.glob`으로 slug 폴더에서 자동으로 찾으므로 라우트나 페이지를 수정할 필요가 없다.

본문은 검색 대상이기도 하다. `npm run build`와 `npm run dev` 시작 시 `public/content/concepts.json`으로 추출된다. 개발 서버를 켠 채 본문을 고쳤다면 `npm run content:export`를 다시 실행해야 본문 검색에 반영된다 (화면의 본문은 즉시 반영된다).

**Node 호환 규칙**: `meta.ts`와 `src/content`, `src/lib/content`의 상대 import에는 `.ts` 확장자를 붙인다 (예: `from '../../../types/concept.ts'`). 빠뜨리면 `npm run typecheck`(Node 설정 타입 검사) 또는 `npm test`(Node 호환 테스트)가 실패한다.

## 2. 메타데이터 규격 (`meta.ts`)

```ts
import type { ConceptMeta } from '../../../types/concept.ts'

export default {
  id: 'spring-transaction',           // 영문 kebab-case, 변경 금지 (관계 참조 키)
  slug: 'spring-transaction',         // URL. 특별한 이유가 없으면 id와 동일하게
  title: 'Spring 트랜잭션',
  description: '한두 문장 요약. 카드와 검색 결과에 노출된다.',
  category: 'backend',                // backend | frontend | database-infra | network-web
  tags: ['Spring', '트랜잭션'],        // 필터용. 기존 태그를 우선 재사용
  aliases: ['@Transactional', 'Spring Transaction'], // 영문 표기, 약어, 다른 이름
  keywords: ['propagation', '전파', 'rollback'],      // 본문의 핵심 용어
  difficulty: 'intermediate',         // beginner | intermediate | advanced
  prerequisites: ['spring-ioc-di'],   // 먼저 보면 좋은 개념 id
  relatedConcepts: ['optimistic-pessimistic-lock'],
  visualizationType: 'static',        // 'static' 또는 등록된 시뮬레이터 id
  keyPoints: ['핵심 요약 3~5개. 각각 완결된 한 문장.'],
  references: [
    { title: '문서 제목', url: 'https://...', publisher: 'Spring Framework Reference' },
  ],
  updatedAt: '2026-11-19',            // 내용을 검증·수정한 날짜
  featured: false,                    // 메인 페이지 "대표 개념" 노출 여부 (선택)
} satisfies ConceptMeta
```

- **검색 대상**: `title`, `aliases`, `tags`, `keywords`, `description`. 한국어 개념은 영어 표기를, 영어 용어는 한국어 표기를 `aliases`에 넣어 양쪽으로 검색되게 한다.
- `keyPoints`는 MCP 등 외부 도구가 본문 없이도 개념을 요약할 수 있게 해 주는 필드다. 본문과 모순되지 않게 쓴다.

## 3. 본문 템플릿 (`content.mdx`)

제목과 요약, 관련 개념, 출처는 메타데이터에서 자동으로 렌더링되므로 본문에 쓰지 않는다.
본문은 아래 `##` 섹션을 **이 순서와 이 제목 그대로** 사용한다 (목차와 검증 테스트가 의존한다).

```mdx
## 왜 필요한가?
이 개념이 없으면 어떤 문제가 생기는지, 구체적인 상황으로 시작한다.

## 쉽게 이해하는 비유
일상적인 비유. 비유가 틀리는 지점이 있으면 짧게 짚어 준다.

## 동작 원리
기술적으로 정확한 설명. 필요하면 ### 소제목으로 나눈다.

## 시각화
시뮬레이터 개념은 <Simulator />, 그 외에는 <Flow />나 <Sequence /> 정적 다이어그램.

## 코드 예시
실제로 컴파일·실행 가능한 수준의 코드. 언어를 명시한 코드 블록 사용.

## 언제 사용해야 할까?
판단 기준. 표나 목록 권장.

## 주의 사항과 흔한 오해
**굵은 글씨로 오해를 적고** 무엇이 맞는지 설명한다.
```

- `###` 소제목은 자유롭게 쓴다. 목차에는 `##`만 표시된다.
- 분량 기준: 각 섹션이 실제 학습에 쓸 수 있어야 한다. 한두 문장짜리 섹션은 피한다.

### 사용할 수 있는 MDX 컴포넌트

import 없이 바로 사용할 수 있다.

**`<Callout>`** — 강조 박스. `type`: `info`(기본) | `tip` | `warn`

```mdx
<Callout type="warn" title="모든 읽기가 막히는 것은 아니다">
본문 텍스트. **마크다운**과 `코드`를 쓸 수 있다.
</Callout>
```

**`<Flow>`** — 순서가 있는 단계 다이어그램

```mdx
<Flow
  title="Spring 컨테이너가 빈을 준비하는 순서"
  steps={[
    { title: '설정 읽기', detail: '@Configuration, 컴포넌트 스캔으로 빈 정의를 수집' },
    { title: '객체 생성', detail: '생성자를 호출해 인스턴스를 만든다' },
    { title: '의존성 주입', detail: '필요한 빈을 생성자 인자로 전달' },
  ]}
/>
```

**`<Sequence>`** — 참여자 사이의 메시지 순서 다이어그램 (`from`/`to`는 `actors`의 이름)

```mdx
<Sequence
  title="Preflight 요청"
  actors={['브라우저', 'API 서버']}
  messages={[
    { from: '브라우저', to: 'API 서버', label: 'OPTIONS /api/orders', note: 'Origin, Access-Control-Request-Method 포함' },
    { from: 'API 서버', to: '브라우저', label: '204 No Content', note: 'Access-Control-Allow-Origin 등' },
  ]}
/>
```

**`<Simulator />`** — 메타데이터의 `visualizationType`에 등록된 인터랙티브 시뮬레이터를 그 자리에 렌더링한다. 속성은 없다.

### 코드 블록

언어를 반드시 명시한다. 빌드 시 Shiki로 하이라이트된다.
지원 언어: `java`, `typescript`, `tsx`, `javascript`, `sql`, `http`, `bash`, `json`, `yaml`, `properties`
(추가가 필요하면 `vite.config.ts`의 `langs`에 등록)

### MDX 문법 주의

- 본문 텍스트에 `{`, `}`, `<`가 그대로 나오면 JSX로 해석된다. 코드 블록이나 인라인 코드(`` ` ``) 안에 넣는다.
- 컴포넌트 속성의 문자열 안에서는 작은따옴표(`'`)로 감싸고, 내부에 작은따옴표가 필요하면 큰따옴표 문자열을 쓴다.

## 4. 정확성 검증 원칙

1. **공식 문서를 근거로 한다.** 스펙, 공식 레퍼런스(Spring, MDN, React, PostgreSQL 등), RFC를 1순위로 삼는다. 블로그는 보조 자료로만 쓴다.
2. **확인할 수 없는 세부사항은 단정하지 않는다.** 구현체·버전·DBMS·브라우저에 따라 다른 동작은 "~에 따라 다르다"고 명시하고, 대표적인 예를 든다.
3. **흔한 오해를 그대로 반복하지 않는다.** 예: "비관적 락은 모든 읽기를 막는다", "리렌더링 = DOM 변경".
4. **단순화했다면 단순화했다고 쓴다.** 시각화는 모델이다. 실제와 다른 부분은 본문이나 시뮬레이터 설명에 적는다.
5. **공식 문서를 복사하지 않는다.** 이해한 내용을 자신의 말로 설명하고, 원문은 출처로 연결한다.
6. 코드 예시는 현재 안정 버전 API를 쓴다 (예: `javax.*`가 아닌 `jakarta.*`).

## 5. 출처 작성 방식

- `references`에 1개 이상, 가능하면 2~4개를 넣는다.
- `title`: 문서(또는 섹션)의 제목. `publisher`: 발행 주체와 문서 이름.
- URL은 `https://`로 시작하는 **공식 문서의 안정적인 주소**를 쓴다. 특정 버전 고정이 의미 있으면 버전 경로를 쓰고, 아니면 `current`/`latest` 경로를 쓴다.
- RFC는 `https://www.rfc-editor.org/rfc/rfcXXXX` 형식을 쓴다.

## 6. 신규 시뮬레이터 등록 방법

1. **상태 모델을 순수 함수로 만든다.** `src/components/simulations/<name>/model.ts`에 단계(step) 배열을 만드는 함수와 타입을 둔다. React를 import하지 않는다. 각 단계는 "그 시점의 전체 상태 + 설명"이다.
2. **단위 테스트를 쓴다.** `tests/unit/`에 모델의 단계 수, 핵심 단계의 상태, 최종 결과를 검증한다.
3. **UI 컴포넌트를 만든다.** `useStepPlayer(steps.length)`(`src/lib/simulation/useStepPlayer.ts`)로 이전/다음/처음/자동 재생을 얻고, `<SimulatorShell>`(`src/components/simulations/SimulatorShell.tsx`)로 공통 컨트롤과 단계 설명 영역을 감싼다.
4. `src/types/concept.ts`의 `SimulatorId`에 id를 추가하고, `src/content/registry/simulators.ts`에 `lazy(() => import(...))`로 등록한다.
5. 개념의 `visualizationType`을 새 id로 바꾸고 본문 `## 시각화` 섹션에 `<Simulator />`를 넣는다.

시뮬레이터 체크리스트:

- 모든 상태 변화가 **텍스트로도** 드러나야 한다 (색·애니메이션만으로 전달하지 않기, 모션 감소 설정 대응).
- 단계 설명 영역은 `aria-live`로 스크린 리더에 전달된다 (`SimulatorShell`이 처리).
- 시뮬레이터가 단순화한 부분을 화면 어딘가에 명시한다.
