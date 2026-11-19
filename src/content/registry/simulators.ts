import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { SimulatorId } from '../../types/concept'

/**
 * visualizationType → 시뮬레이터 컴포넌트.
 * 각 시뮬레이터는 해당 개념 페이지를 열 때만 불러온다.
 */
export const simulators: Record<SimulatorId, LazyExoticComponent<ComponentType>> = {
  locking: lazy(() => import('../../components/simulations/locking/LockingSimulator')),
  isolation: lazy(() => import('../../components/simulations/isolation/IsolationSimulator')),
  'event-loop': lazy(() => import('../../components/simulations/event-loop/EventLoopSimulator')),
  'react-rendering': lazy(() => import('../../components/simulations/react-rendering/ReactRenderingSimulator')),
  'http-request': lazy(() => import('../../components/simulations/http-request/HttpRequestSimulator')),
}

export const simulatorInfo: Record<SimulatorId, { title: string; blurb: string }> = {
  locking: {
    title: '낙관적 락 vs 비관적 락',
    blurb: '두 트랜잭션이 같은 재고를 수정할 때 버전 충돌과 잠금 대기가 어떻게 일어나는지 단계별로 비교한다.',
  },
  isolation: {
    title: '트랜잭션 격리 수준',
    blurb: '격리 수준과 DBMS를 바꿔 가며 Dirty Read, Non-repeatable Read, Phantom Read가 언제 생기고 어떻게 막히는지 비교한다.',
  },
  'event-loop': {
    title: 'JavaScript 이벤트 루프',
    blurb: 'Call Stack, Web APIs, Task·Microtask Queue를 따라가며 setTimeout과 Promise의 실행 순서를 확인한다.',
  },
  'react-rendering': {
    title: 'React 렌더링 과정',
    blurb: 'state를 바꾸면 어떤 컴포넌트가 렌더링되고, 그중 실제 DOM은 어디가 바뀌는지 구분해서 본다.',
  },
  'http-request': {
    title: 'HTTP 요청부터 응답까지',
    blurb: '버튼 클릭 한 번이 Controller, Service, Repository를 거쳐 DB까지 갔다가 돌아오는 길을 따라간다.',
  },
}
