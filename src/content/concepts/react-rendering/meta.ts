import type { ConceptMeta } from '../../../types/concept.ts'

export default {
  id: 'react-rendering',
  slug: 'react-rendering',
  title: 'React 렌더링 과정',
  description:
    'React가 화면을 갱신하는 세 단계(트리거 → 렌더 → 커밋). 렌더링은 컴포넌트 함수를 호출하는 것이고, 실제 DOM은 이전 결과와 달라진 부분만 커밋 단계에서 바뀐다.',
  category: 'frontend',
  tags: ['React', '렌더링', '성능'],
  aliases: ['React Rendering', '리렌더링', 'Re-render', 'Render and Commit', '렌더와 커밋', 'React 리렌더'],
  keywords: [
    '트리거',
    '렌더 단계',
    'Render Phase',
    '커밋 단계',
    'Commit Phase',
    '페인트',
    'memo',
    'React.memo',
    'Object.is',
    'setState',
    '스냅샷',
    'Snapshot',
    '배칭',
    'Batching',
    'React Compiler',
  ],
  difficulty: 'intermediate',
  prerequisites: [],
  relatedConcepts: ['react-useeffect', 'js-event-loop'],
  visualizationType: 'react-rendering',
  keyPoints: [
    'React의 화면 갱신은 트리거(초기 렌더 또는 state 변경) → 렌더(컴포넌트 호출) → 커밋(DOM 반영) 순서로 진행되고, 그 뒤 브라우저가 화면을 그린다.',
    '렌더링은 컴포넌트 함수를 호출해 JSX를 계산하는 것이며, 리렌더링이 곧 DOM 변경을 뜻하지는 않는다.',
    'React는 커밋 단계에서 이전 렌더 결과와 달라진 DOM 노드만 변경한다.',
    '부모가 리렌더링되면 자식도 기본적으로 다시 호출되며, memo로 감싼 컴포넌트는 props가 Object.is 기준으로 모두 같으면 건너뛸 수 있다.',
    'set 함수에 현재와 Object.is로 같은 값을 넘기면 React는 보통 해당 컴포넌트와 자식의 리렌더링을 건너뛴다.',
  ],
  references: [
    {
      title: 'Render and Commit',
      url: 'https://react.dev/learn/render-and-commit',
      publisher: 'react.dev',
    },
    {
      title: 'State as a Snapshot',
      url: 'https://react.dev/learn/state-as-a-snapshot',
      publisher: 'react.dev',
    },
    {
      title: 'memo',
      url: 'https://react.dev/reference/react/memo',
      publisher: 'react.dev API Reference',
    },
    {
      title: 'useState',
      url: 'https://react.dev/reference/react/useState',
      publisher: 'react.dev API Reference',
    },
  ],
  updatedAt: '2026-11-19',
  featured: true,
} satisfies ConceptMeta
