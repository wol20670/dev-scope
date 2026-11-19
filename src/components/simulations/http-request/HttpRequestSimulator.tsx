import { motion } from 'motion/react'
import { Box, Database, Globe, Layers, Send, Server, Workflow, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useStepPlayer } from '../../../lib/simulation/useStepPlayer'
import { CodeBlock } from '../../ui/CodeBlock'
import { SimulatorShell } from '../SimulatorShell'
import { httpSteps, layerIndex, layers, type LayerId } from './model'

const icons: Record<LayerId, LucideIcon> = {
  browser: Globe,
  server: Server,
  controller: Workflow,
  service: Layers,
  repository: Box,
  database: Database,
}

export default function HttpRequestSimulator() {
  const player = useStepPlayer(httpSteps.length, 1700)
  const step = httpSteps[player.index]
  const activeIdx = layerIndex(step.layer)
  // 사용자가 클릭한 계층은 그 단계에서만 유지하고, 단계가 바뀌면 현재 계층을 따라간다
  const [picked, setPicked] = useState<{ layer: LayerId; atStep: number } | null>(null)
  const selected = picked && picked.atStep === player.index ? picked.layer : step.layer
  const detail = layers[layerIndex(selected)]

  const send = () => {
    player.reset()
    player.play()
  }

  return (
    <SimulatorShell
      title="HTTP 요청부터 응답까지"
      player={player}
      stepTitles={httpSteps.map((s) => s.title)}
      description={step.description}
      toolbar={
        <button
          type="button"
          onClick={send}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/50 bg-accent-soft px-2.5 py-1 font-mono text-[11.5px] text-sky-100 hover:bg-accent/20"
        >
          <Send aria-hidden className="size-3.5" /> API 요청 보내기
        </button>
      }
      note="전형적인 Spring 계층형 아키텍처의 예시다. 모든 시스템이 이 구조를 따르지는 않는다(헥사고날 아키텍처, API 게이트웨이, 캐시, 메시지 큐 등). 필터·인터셉터, 커넥션 풀, 예외 처리 경로 등은 생략했다."
    >
      {/* 계층 파이프라인 */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="요청 경로">
        {layers.map((layer, i) => {
          const Icon = icons[layer.id]
          const active = i === activeIdx && step.direction !== 'idle'
          const visited =
            step.direction === 'request' ? i < activeIdx : step.direction === 'response' ? true : false
          const isSelected = selected === layer.id
          return (
            <li key={layer.id} className="relative">
              <button
                type="button"
                onClick={() => setPicked({ layer: layer.id, atStep: player.index })}
                aria-pressed={isSelected}
                aria-label={`${layer.name} 계층 설명 보기${active ? ' (현재 위치)' : ''}`}
                className={`relative flex h-full w-full flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                  active
                    ? step.direction === 'request'
                      ? 'border-accent bg-accent/15'
                      : 'border-emerald-400/70 bg-emerald-400/10'
                    : visited
                      ? 'border-line-strong bg-raised'
                      : 'border-line bg-surface'
                } ${isSelected ? 'ring-2 ring-accent/50 ring-offset-2 ring-offset-surface' : ''} hover:border-line-strong`}
                data-testid={`layer-${layer.id}`}
                data-active={active || undefined}
              >
                <span className="flex w-full items-center gap-1.5">
                  <Icon aria-hidden className={`size-4 ${active ? 'text-accent' : 'text-muted'}`} />
                  <span className="text-[12.5px] font-semibold text-fg">{layer.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-subtle">{i + 1}</span>
                </span>
                <span className="mt-1 text-[10.5px] leading-tight text-subtle">{layer.sub}</span>
                {/* 요청/응답 패킷: 같은 layoutId로 계층 사이를 이동 */}
                <span className="mt-2 flex h-5 items-center">
                  {active && (
                    <motion.span
                      layoutId="http-packet"
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        step.direction === 'request' ? 'bg-accent text-canvas' : 'bg-emerald-400 text-canvas'
                      }`}
                    >
                      {step.direction === 'request' ? 'REQ →' : '← RES'}
                    </motion.span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* 방향과 전달 데이터 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-[#0a0f1a] px-3 py-2.5 font-mono text-[11.5px]">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            step.direction === 'request'
              ? 'bg-accent/20 text-sky-200'
              : step.direction === 'response'
                ? 'bg-emerald-400/20 text-emerald-200'
                : 'bg-overlay text-subtle'
          }`}
          data-testid="http-direction"
        >
          {step.direction === 'request' ? '요청 →' : step.direction === 'response' ? '← 응답' : '대기'}
        </span>
        <span className="whitespace-pre-wrap text-fg/85">{step.payload}</span>
      </div>

      {/* 선택한 계층 설명 */}
      <div className="mt-3 grid gap-3 rounded-xl border border-line bg-surface p-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" data-testid="layer-detail">
        <div>
          <p className="text-xs text-subtle">계층 설명</p>
          <h4 className="mt-0.5 font-semibold text-fg">
            {detail.name} <span className="text-xs font-normal text-subtle">{detail.sub}</span>
          </h4>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg/85">{detail.role}</p>
          <p className="mt-3 text-[11px] text-subtle">다른 계층을 클릭하면 해당 계층의 설명과 코드를 볼 수 있다.</p>
        </div>
        <CodeBlock code={detail.code.source} lang={detail.code.lang} title={detail.code.title} />
      </div>
    </SimulatorShell>
  )
}
