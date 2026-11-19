/**
 * React 렌더링 과정의 단순화 모델.
 *
 * - 렌더링 = 컴포넌트 함수를 호출해 새 JSX(React 엘리먼트)를 계산하는 것
 * - state가 바뀐 컴포넌트부터 아래로, 자식은 기본적으로 모두 다시 렌더링된다
 * - memo로 감싼 컴포넌트는 props가 얕은 비교(Object.is)로 같으면 렌더링을 건너뛴다
 * - 커밋 단계에서는 이전 렌더 결과와 달라진 부분만 DOM에 반영한다
 *
 * 실제 React의 배칭, 우선순위(Lanes), 동시성 렌더링, Effect 실행 시점은 모델링하지 않는다.
 */

export type NodeId = 'App' | 'Header' | 'Counter' | 'CountLabel' | 'IncrementButton' | 'Sidebar' | 'SidebarItem'

export interface AppState {
  theme: 'dark' | 'light'
  count: number
}

export interface TreeNode {
  id: NodeId
  children: NodeId[]
  /** 이 컴포넌트가 가진 state */
  state?: keyof AppState
  /** 부모에게서 받는 props 설명 (화면 표시용) */
  propsLabel?: string
}

export const tree: Record<NodeId, TreeNode> = {
  App: { id: 'App', children: ['Header', 'Counter', 'Sidebar'], state: 'theme' },
  Header: { id: 'Header', children: [], propsLabel: 'theme' },
  Counter: { id: 'Counter', children: ['CountLabel', 'IncrementButton'], state: 'count' },
  CountLabel: { id: 'CountLabel', children: [], propsLabel: 'count' },
  IncrementButton: { id: 'IncrementButton', children: [], propsLabel: 'onClick' },
  Sidebar: { id: 'Sidebar', children: ['SidebarItem'] },
  SidebarItem: { id: 'SidebarItem', children: [] },
}

/** 각 컴포넌트가 만들어 내는 DOM 결과 (문자열로 단순화) */
export function domOutput(id: NodeId, s: AppState): string {
  switch (id) {
    case 'App':
      return `<div class="app ${s.theme}">`
    case 'Header':
      return `<header>테마: ${s.theme === 'dark' ? '다크' : '라이트'}</header>`
    case 'Counter':
      return '<section>'
    case 'CountLabel':
      return `<p>count: ${s.count}</p>`
    case 'IncrementButton':
      // onClick은 렌더마다 새 함수지만 DOM 속성이 아니므로 DOM 결과는 같다
      return '<button>+1</button>'
    case 'Sidebar':
      return '<aside>'
    case 'SidebarItem':
      return '<li>메뉴</li>'
  }
}

export type Action = 'increment' | 'same' | 'theme'

export const actionInfo: Record<Action, { label: string; code: string; owner: NodeId }> = {
  increment: { label: 'count + 1', code: 'setCount(count + 1)', owner: 'Counter' },
  same: { label: '같은 값으로 set', code: 'setCount(count)', owner: 'Counter' },
  theme: { label: '테마 전환', code: "setTheme(t => t === 'dark' ? 'light' : 'dark')", owner: 'App' },
}

export type NodeStatus = 'idle' | 'trigger' | 'rendered' | 'skipped' | 'committed' | 'unchanged'

export interface RenderStep {
  phase: 'initial' | 'trigger' | 'render' | 'commit' | 'paint' | 'bailout'
  title: string
  description: string
  status: Partial<Record<NodeId, NodeStatus>>
  /** 화면(UI 미리보기)에 반영된 상태 */
  ui: AppState
  renderCounts: Record<NodeId, number>
  domChanges: { id: NodeId; before: string; after: string }[]
}

export const initialState: AppState = { theme: 'dark', count: 0 }

export const initialCounts = (): Record<NodeId, number> =>
  Object.fromEntries(Object.keys(tree).map((id) => [id, 1])) as Record<NodeId, number> // 최초 마운트 시 1번씩 렌더링됨

export function initialStep(state: AppState, counts: Record<NodeId, number>): RenderStep {
  return {
    phase: 'initial',
    title: '대기 중',
    description: '아래 버튼으로 state를 바꿔 보자. 어떤 컴포넌트가 렌더링되고, 그중 실제 DOM이 바뀌는 곳은 어디인지 단계별로 보여 준다.',
    status: {},
    ui: state,
    renderCounts: counts,
    domChanges: [],
  }
}

interface RenderPass {
  rendered: NodeId[]
  skipped: NodeId[]
}

/** trigger부터 아래로 렌더링 대상 계산. memo 컴포넌트는 props가 같으면 하위 트리 전체를 건너뛴다. */
export function computeRenderPass(trigger: NodeId, memoSidebar: boolean): RenderPass {
  const rendered: NodeId[] = []
  const skipped: NodeId[] = []
  const visit = (id: NodeId) => {
    rendered.push(id)
    for (const child of tree[id].children) {
      // Sidebar는 props가 없으므로 얕은 비교 결과가 항상 같다
      if (child === 'Sidebar' && memoSidebar) skipped.push(child)
      else visit(child)
    }
  }
  visit(trigger)
  return { rendered, skipped }
}

export function simulateUpdate(
  prev: AppState,
  action: Action,
  memoSidebar: boolean,
  counts: Record<NodeId, number>,
): { steps: RenderStep[]; next: AppState; counts: Record<NodeId, number> } {
  const info = actionInfo[action]
  const next: AppState =
    action === 'increment'
      ? { ...prev, count: prev.count + 1 }
      : action === 'theme'
        ? { ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }
        : prev

  const trigger: RenderStep = {
    phase: 'trigger',
    title: '1. 트리거: state 변경 요청',
    description: `${info.owner}에서 ${info.code}가 호출되었다. React는 바로 화면을 바꾸지 않고, ${info.owner} 컴포넌트의 업데이트를 예약한다.`,
    status: { [info.owner]: 'trigger' },
    ui: prev,
    renderCounts: counts,
    domChanges: [],
  }

  if (Object.is(prev.count, next.count) && Object.is(prev.theme, next.theme)) {
    return {
      next,
      counts,
      steps: [
        trigger,
        {
          phase: 'bailout',
          title: '2. 같은 값 → 렌더링 건너뜀',
          description:
            '새 state가 이전 값과 Object.is로 같다. React는 보통 이 컴포넌트와 자식의 렌더링을 건너뛴다. (경우에 따라 해당 컴포넌트 함수만 한 번 호출한 뒤 결과를 버리고 자식으로 내려가지 않을 수 있다.) DOM도 당연히 바뀌지 않는다.',
          status: { [info.owner]: 'skipped' },
          ui: prev,
          renderCounts: counts,
          domChanges: [],
        },
      ],
    }
  }

  const pass = computeRenderPass(info.owner, memoSidebar)
  const newCounts = { ...counts }
  pass.rendered.forEach((id) => newCounts[id]++)

  const renderStatus: RenderStep['status'] = {}
  pass.rendered.forEach((id) => (renderStatus[id] = 'rendered'))
  pass.skipped.forEach((id) => (renderStatus[id] = 'skipped'))

  const domChanges = pass.rendered
    .map((id) => ({ id, before: domOutput(id, prev), after: domOutput(id, next) }))
    .filter((c) => c.before !== c.after)
  const commitStatus: RenderStep['status'] = { ...renderStatus }
  pass.rendered.forEach((id) => (commitStatus[id] = domChanges.some((c) => c.id === id) ? 'committed' : 'unchanged'))

  const skippedText = pass.skipped.length
    ? ` memo로 감싼 ${pass.skipped.join(', ')}는 props가 이전과 같아(얕은 비교) 하위 트리까지 건너뛴다.`
    : memoSidebar || info.owner !== 'App'
      ? ''
      : ' Sidebar는 받은 props가 없는데도 부모(App)가 렌더링되었기 때문에 함께 렌더링된다. memo를 켜면 건너뛸 수 있다.'

  return {
    next,
    counts: newCounts,
    steps: [
      trigger,
      {
        phase: 'render',
        title: '2. 렌더 단계: 컴포넌트 호출',
        description: `React가 ${pass.rendered.join(' → ')} 순서로 컴포넌트 함수를 호출해 새 JSX를 계산한다. state를 가진 컴포넌트뿐 아니라 그 자식들도 기본적으로 다시 렌더링된다.${skippedText} 이 단계는 계산만 할 뿐 DOM을 건드리지 않는다.`,
        status: renderStatus,
        ui: prev,
        renderCounts: newCounts,
        domChanges: [],
      },
      {
        phase: 'commit',
        title: '3. 커밋 단계: 달라진 DOM만 변경',
        description: `이전 렌더 결과와 비교해 실제로 달라진 ${domChanges.length}곳(${domChanges
          .map((c) => c.id)
          .join(', ')})만 DOM에 반영한다. ${pass.rendered
          .filter((id) => !domChanges.some((c) => c.id === id))
          .join(', ')}는 렌더링되었지만 결과가 같아서 DOM 변경이 없다. 렌더링 ≠ DOM 변경이다.`,
        status: commitStatus,
        ui: prev,
        renderCounts: newCounts,
        domChanges,
      },
      {
        phase: 'paint',
        title: '4. 브라우저 페인트',
        description: '커밋이 끝나면 브라우저가 바뀐 DOM을 화면에 그린다. 오른쪽 미리보기가 새 state를 반영한다.',
        status: commitStatus,
        ui: next,
        renderCounts: newCounts,
        domChanges,
      },
    ],
  }
}
