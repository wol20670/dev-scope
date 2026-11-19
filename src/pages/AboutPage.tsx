import { Link } from 'react-router'
import { listConcepts } from '../lib/content'

const principles = [
  {
    title: '공식 문서를 근거로 쓴다',
    text: '스펙, 공식 레퍼런스, RFC를 1순위 근거로 삼고 모든 개념 페이지에 출처를 남깁니다. 확인할 수 없는 세부사항은 단정하지 않습니다.',
  },
  {
    title: '구현마다 다른 부분은 다르다고 쓴다',
    text: 'DBMS, 격리 수준, 브라우저, 런타임에 따라 동작이 달라지는 부분은 명시합니다. "비관적 락은 모든 읽기를 막는다" 같은 흔한 단순화를 반복하지 않습니다.',
  },
  {
    title: '시각화는 모델이라는 것을 밝힌다',
    text: '시뮬레이터는 핵심을 보여 주기 위해 단순화한 모델입니다. 무엇을 생략했는지 시뮬레이터 하단과 본문에 적습니다.',
  },
  {
    title: '비유와 정확한 설명을 함께 둔다',
    text: '쉬운 비유로 감을 잡고, 바로 이어서 기술적으로 정확한 동작 원리를 설명합니다. 비유가 틀리는 지점도 짚습니다.',
  },
]

const all = listConcepts()
const simCount = all.filter((c) => c.visualizationType !== 'static').length

const roadmap = [
  { stage: '지금', title: 'MVP', text: `${all.length}개 개념, ${simCount}개 인터랙티브 시뮬레이터, 로컬 검색` },
  { stage: '다음', title: '콘텐츠 확장', text: '분야별 개념 추가, 새 시뮬레이터, 학습 경로 확장' },
  { stage: '이후', title: 'MCP 서버', text: 'Claude, VS Code 등 AI 개발 도구에서 같은 개념 데이터를 조회' },
]

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <title>소개 — DevScope</title>
      <p className="font-mono text-xs tracking-wider text-accent uppercase">About</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        보고, 조작하고, 이해하는
        <br />
        기술 문서
      </h1>
      <p className="mt-5 text-base leading-relaxed text-muted">
        트랜잭션 충돌, 이벤트 루프, React 렌더링처럼 머릿속으로만 상상해야 했던 내부 동작은 글로 읽어도 잘 와닿지 않습니다. DevScope는
        개념마다 <strong className="text-fg">왜 필요한지 → 비유 → 정확한 동작 원리 → 시각화 → 실제 코드 → 판단 기준 → 주의 사항</strong>
        의 흐름으로 설명하고, 핵심 개념은 단계별로 직접 재생해 볼 수 있는 시뮬레이터를 제공합니다.
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted">
        백엔드와 프론트엔드를 공부하는 개발자, 부트캠프 교육생, 주니어 개발자가 "대충 안다"에서 "설명할 수 있다"로 넘어가는 것을
        목표로 합니다.
      </p>

      <section aria-labelledby="principles" className="mt-14">
        <h2 id="principles" className="text-xl font-bold text-fg">
          콘텐츠 작성 원칙
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {principles.map((p, i) => (
            <div key={p.title} className="card p-5">
              <p className="font-mono text-xs text-accent">0{i + 1}</p>
              <h3 className="mt-2 font-semibold text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap" className="mt-14">
        <h2 id="roadmap" className="text-xl font-bold text-fg">
          앞으로의 방향
        </h2>
        <ol className="mt-5 space-y-3">
          {roadmap.map((r) => (
            <li key={r.title} className="card flex gap-4 p-5">
              <span className="w-12 shrink-0 font-mono text-xs text-accent">{r.stage}</span>
              <div>
                <p className="font-semibold text-fg">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          개념 데이터와 검색 로직은 화면과 분리된 TypeScript 모듈로 만들어져 있어, 이후 MCP 서버에서도 같은 데이터를 그대로 재사용할
          수 있습니다.
        </p>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link to="/concepts" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-sky-300">
          개념 둘러보기
        </Link>
        <Link to="/concepts?sim=1" className="rounded-lg border border-line px-4 py-2 text-sm text-fg hover:bg-raised">
          시뮬레이터 체험하기
        </Link>
      </div>
    </div>
  )
}
