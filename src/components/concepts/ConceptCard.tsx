import { ArrowUpRight, Database, Globe, Monitor, MousePointerClick, Server, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { categories, difficultyLabels } from '../../lib/content'
import type { CategoryId, ConceptMeta, Difficulty } from '../../types/concept'

export const categoryIcons: Record<CategoryId, LucideIcon> = {
  backend: Server,
  frontend: Monitor,
  'database-infra': Database,
  'network-web': Globe,
}

export const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)?.label ?? id

const difficultyStyle: Record<Difficulty, string> = {
  beginner: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
  intermediate: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
  advanced: 'text-violet-300 border-violet-400/25 bg-violet-400/10',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${difficultyStyle[difficulty]}`}>
      {difficultyLabels[difficulty]}
    </span>
  )
}

export function SimulatorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
      <MousePointerClick aria-hidden className="size-3" />
      시뮬레이터
    </span>
  )
}

export function ConceptCard({ concept, matchedFields }: { concept: ConceptMeta; matchedFields?: string[] }) {
  const Icon = categoryIcons[concept.category]
  return (
    <Link
      to={`/concepts/${concept.slug}`}
      className="group card relative flex h-full flex-col p-5 transition-colors hover:border-line-strong hover:bg-raised"
      data-testid="concept-card"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-subtle">
        <Icon aria-hidden className="size-3.5" />
        <span>{categoryLabel(concept.category)}</span>
        <ArrowUpRight
          aria-hidden
          className="ml-auto size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
      <h3 className="text-base font-semibold text-fg group-hover:text-white">{concept.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{concept.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        <DifficultyBadge difficulty={concept.difficulty} />
        {concept.visualizationType !== 'static' && <SimulatorBadge />}
        {concept.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-[11px] text-subtle">
            #{t}
          </span>
        ))}
      </div>
      {matchedFields && matchedFields.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-subtle">
          일치: {matchedFields.map((f) => fieldLabels[f] ?? f).join(', ')}
        </p>
      )}
    </Link>
  )
}

const fieldLabels: Record<string, string> = {
  title: '제목',
  aliases: '별칭',
  tags: '태그',
  keywords: '키워드',
  description: '설명',
}
