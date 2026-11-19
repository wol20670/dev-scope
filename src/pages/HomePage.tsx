import { motion } from 'motion/react'
import { ArrowRight, BookCheck, Code2, Link2, MousePointerClick, Play } from 'lucide-react'
import { Link } from 'react-router'
import { categoryIcons, ConceptCard } from '../components/concepts/ConceptCard'
import { SimulatorPreview } from '../components/concepts/SimulatorPreview'
import { SearchForm } from '../components/ui/SearchForm'
import { simulatorInfo } from '../content/registry/simulators'
import { categories, countByCategory, getConceptById, learningPaths, listConcepts } from '../lib/content'
import type { SimulatorId } from '../types/concept'

const exampleQueries = ['낙관적 락', 'event loop', 'CORS', 'N+1', 'useEffect', '트랜잭션']

export function HomePage() {
  const all = listConcepts()
  const withSim = all.filter((c) => c.visualizationType !== 'static')
  const featured = all.filter((c) => c.featured)
  const counts = countByCategory()

  return (
    <>
      <title>DevScope — 보고 조작하며 이해하는 개발 개념</title>
      {/* 히어로 */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-muted"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            개념 {all.length}개 · 인터랙티브 시뮬레이터 {withSim.length}개
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[2rem] leading-tight font-bold tracking-tight text-fg sm:text-5xl sm:leading-[1.15]"
          >
            읽는 문서를 넘어,
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">보고 조작하며 이해하는</span>{' '}
            개발 개념
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base"
          >
            DevScope는 어려운 기술 개념을 쉬운 비유, 정확한 동작 원리, 단계별 시각화, 실제 코드로 설명합니다. 트랜잭션이 충돌하는
            순간과 이벤트 루프가 콜백을 꺼내는 순서를 직접 재생해 보세요.
          </motion.p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchForm />
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {exampleQueries.map((q) => (
                <Link key={q} to={`/search?q=${encodeURIComponent(q)}`} className="chip hover:border-line-strong hover:text-fg">
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 pt-16 sm:px-6">
        {/* 시뮬레이터 */}
        <section aria-labelledby="sim-heading">
          <SectionHeading
            id="sim-heading"
            eyebrow="Interactive"
            title="직접 재생해 보는 시뮬레이터"
            description="단계별로 앞뒤로 이동하고, 자동 재생하고, 시나리오를 바꿔 가며 내부 동작을 확인하세요."
            action={{ to: '/concepts?sim=1', label: '시뮬레이터가 있는 개념' }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {withSim.map((c) => {
              const id = c.visualizationType as SimulatorId
              return (
                <Link
                  key={c.id}
                  to={`/concepts/${c.slug}#simulator`}
                  className="group card flex flex-col overflow-hidden transition-colors hover:border-line-strong"
                >
                  <div className="border-b border-line bg-canvas/50 p-4">
                    <SimulatorPreview id={id} />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="flex items-center gap-2 font-semibold text-fg">
                      <MousePointerClick aria-hidden className="size-4 text-accent" />
                      {simulatorInfo[id].title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{simulatorInfo[id].blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                      <Play aria-hidden className="size-3.5" /> 실행해 보기
                      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 대표 개념 */}
        <section aria-labelledby="featured-heading">
          <SectionHeading
            id="featured-heading"
            eyebrow="Featured"
            title="먼저 보면 좋은 대표 개념"
            description="실무에서 자주 마주치고, 시각화로 볼 때 특히 이해가 빨라지는 개념들입니다."
            action={{ to: '/concepts', label: '전체 개념 보기' }}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <ConceptCard key={c.id} concept={c} />
            ))}
          </div>
        </section>

        {/* 카테고리 */}
        <section aria-labelledby="cat-heading">
          <SectionHeading id="cat-heading" eyebrow="Categories" title="분야별로 탐색하기" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.id]
              return (
                <Link
                  key={cat.id}
                  to={`/concepts?category=${cat.id}`}
                  className="group card p-5 transition-colors hover:border-line-strong hover:bg-raised"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon aria-hidden className="size-4.5" />
                    </span>
                    <span className="font-mono text-xs text-subtle">{counts[cat.id] ?? 0}개</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-fg">{cat.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{cat.description}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 학습 경로 */}
        <section aria-labelledby="path-heading">
          <SectionHeading
            id="path-heading"
            eyebrow="Learning paths"
            title="추천 학습 순서"
            description="앞 개념이 뒤 개념의 바탕이 되도록 순서를 정했습니다."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {learningPaths.map((path) => (
              <div key={path.id} className="card p-5 sm:p-6">
                <h3 className="font-semibold text-fg">{path.title}</h3>
                <p className="mt-1 text-sm text-muted">{path.description}</p>
                <ol className="mt-5 space-y-1">
                  {path.conceptIds.map((id, i) => {
                    const c = getConceptById(id)
                    if (!c) return null
                    return (
                      <li key={id}>
                        <Link
                          to={`/concepts/${c.slug}`}
                          className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-raised"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[11px] text-muted group-hover:border-accent/60 group-hover:text-accent">
                            {i + 1}
                          </span>
                          <span className="text-sm text-fg">{c.title}</span>
                          {c.visualizationType !== 'static' && (
                            <MousePointerClick aria-label="시뮬레이터 있음" className="size-3.5 text-accent" />
                          )}
                          <ArrowRight aria-hidden className="ml-auto size-3.5 text-subtle opacity-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* 핵심 장점 */}
        <section aria-labelledby="why-heading">
          <SectionHeading id="why-heading" eyebrow="Why DevScope" title="이렇게 설명합니다" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MousePointerClick,
                title: '눈으로 보는 내부 동작',
                text: '텍스트로만 상상하던 대기, 충돌, 큐의 이동을 단계별로 재생하고 되돌려 볼 수 있습니다.',
              },
              {
                icon: BookCheck,
                title: '공식 문서 기반',
                text: '모든 개념은 스펙과 공식 레퍼런스를 근거로 쓰고 출처를 남깁니다. 구현마다 다른 부분은 그렇다고 밝힙니다.',
              },
              {
                icon: Code2,
                title: '실무 코드와 판단 기준',
                text: 'Spring Boot, JPA, React 코드 예시와 함께 "언제 무엇을 쓸지"를 표와 목록으로 정리합니다.',
              },
              {
                icon: Link2,
                title: '연결된 개념',
                text: '선행 개념과 관련 개념이 서로 연결되어 있어 모르는 개념을 만나도 바로 따라갈 수 있습니다.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-5">
                <Icon aria-hidden className="size-5 text-accent" />
                <h3 className="mt-4 font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string
  eyebrow: string
  title: string
  description?: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs tracking-wider text-accent uppercase">{eyebrow}</p>
        <h2 id={id} className="mt-1.5 text-2xl font-bold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action && (
        <Link to={action.to} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          {action.label} <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
