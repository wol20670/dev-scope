# 로드맵

## 현재 MVP 범위 (완료)

- 페이지: 메인, 개념 탐색(필터), 개념 상세(목차·관련·출처·이전/다음), 검색 결과(빈 결과 안내), 소개, 404
- 개념 13개
  - Backend: Spring IoC/DI, Spring 트랜잭션, JPA N+1
  - Frontend: Promise·async/await, 이벤트 루프, React 렌더링, useEffect
  - Database & Infra: 낙관적·비관적 락, 트랜잭션 격리 수준, 인덱스
  - Network & Web: HTTP 요청·Spring 계층, CORS, OAuth2
- 인터랙티브 시뮬레이터 5종: 락, 트랜잭션 격리 수준, 이벤트 루프, React 렌더링, HTTP 요청
- 로컬 검색: 한·영 혼합, 조사·불용어 처리, 필드 가중치, 본문 검색과 일치 문맥 표시
- 콘텐츠 JSON 내보내기(`/content/concepts.json`), Node에서 바로 실행되는 콘텐츠 조회·검색 모듈
- MCP 서버(stdio): 개념 검색·읽기·목록·관련 개념 도구
- 콘텐츠 검증 테스트, 단위 테스트, E2E 테스트(데스크톱·모바일)

의도적으로 하지 않은 것: 웹 백엔드, 로그인, DB, AI 챗봇, 코드 실행, CMS, 결제

## 다음 단계 후보

### 콘텐츠 확장

- 개념 추가 후보
  - Backend: Spring Security 필터 체인, 캐시 전략
  - Frontend: 브라우저 렌더링 파이프라인, 클로저, React 상태 관리
  - DB: 실행 계획 읽기, 정규화, 복제·샤딩
  - Network: HTTPS/TLS 핸드셰이크, 쿠키·세션 vs JWT, HTTP 캐시
- 시뮬레이터 후보
  - 쓰기 충돌: 갱신 손실, 쓰기 스큐(Write Skew), PostgreSQL 직렬화 실패와 재시도
  - 이벤트 루프 예제 직접 편집 (안전한 미니 DSL)
  - HTTP 예외 경로 (404 → `@RestControllerAdvice`)
  - 인덱스 B-Tree 탐색
- 학습 경로 확장, 개념 간 선행 관계 그래프 시각화
- 출처 링크 정기 점검 스크립트(CI). 현재는 수동 curl 확인

### 검색 개선

- 개념이 수백 개를 넘으면 빌드 시 역색인을 생성
- 초성 검색(ㄴㄱㅈ → 낙관적), 오타 허용(편집 거리)
- 검색어 자동 완성, 최근 검색어(localStorage)

### MCP 서버

완료: stdio MCP 서버(`mcp/server.ts`). 도구는 `search_concepts`, `get_concept`, `list_concepts`, `get_related_concepts`이고, Claude Code·Claude Desktop·VS Code 연결 방법은 README에 있습니다.

다음 후보:

1. 원격 모드: 배포된 `content/concepts.json`을 읽어 저장소 없이 실행
2. HTTP transport로 원격 MCP 서버 운영 (필요해지면)
3. 개념을 MCP resource(`devscope://concepts/{id}`)로도 노출
4. npm 패키지로 배포해 `npx`로 실행 (콘텐츠 계층 패키지 분리 포함)

### 선택적인 Spring Boot 도입

다음이 필요해질 때만 도입을 검토합니다. 콘텐츠 열람만 하는 동안은 정적 사이트로 충분합니다.

- 사용자 학습 기록·북마크 동기화(로그인 필요)
- 콘텐츠 CMS와 검수 워크플로
- 원격 MCP 서버(HTTP transport)를 직접 운영할 때
- 서버 측 검색(형태소 분석기, OpenSearch 등)

도입하더라도 개념 메타데이터 형식(`ConceptMeta`)은 API 응답 스키마로 그대로 쓸 수 있도록 유지합니다.

## 알려진 한계

- 메인 JS 번들이 약 554KB(gzip 177KB)입니다. React, React Router, Motion이 대부분을 차지합니다. 필요하면 페이지 단위 lazy route나 vendor 청크 분리를 고려합니다.
- 라이트 테마는 없습니다. 다크 테마만 제공합니다.
- 시뮬레이터는 단순화한 모델입니다. 각 시뮬레이터 하단에 생략한 부분을 명시했습니다.
