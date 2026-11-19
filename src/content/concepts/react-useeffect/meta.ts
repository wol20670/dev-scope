import type { ConceptMeta } from '../../../types/concept'

export default {
  id: 'react-useeffect',
  slug: 'react-useeffect',
  title: 'React useEffect',
  description:
    '컴포넌트를 React 바깥의 외부 시스템(네트워크, 브라우저 API, 서드파티 위젯 등)과 동기화하는 Hook. 의존성 배열, 클린업, 실행 시점과 "Effect가 필요 없는 경우"를 다룬다.',
  category: 'frontend',
  tags: ['React', 'Hook', '비동기'],
  aliases: ['useEffect', 'Effect', '이펙트', '사이드 이펙트', 'Side Effect', 'useEffect Hook'],
  keywords: [
    '의존성 배열',
    'Dependency Array',
    '클린업',
    'Cleanup',
    '외부 시스템',
    '동기화',
    'Strict Mode',
    '경쟁 상태',
    'Race Condition',
    'ignore 플래그',
    'AbortController',
    'useLayoutEffect',
    'You Might Not Need an Effect',
    '파생 상태',
  ],
  difficulty: 'intermediate',
  prerequisites: ['react-rendering'],
  relatedConcepts: ['react-rendering', 'js-promise-async-await', 'js-event-loop'],
  visualizationType: 'static',
  keyPoints: [
    'useEffect는 렌더링 결과가 커밋된 뒤 컴포넌트를 외부 시스템과 동기화하기 위한 Hook이다.',
    '의존성 배열의 값이 Object.is 기준으로 바뀐 커밋 뒤에만 Effect가 다시 실행되며, 그 전에 이전 Effect의 클린업이 먼저 실행된다.',
    '상호작용으로 인한 경우가 아니면 Effect는 일반적으로 브라우저가 화면을 그린 뒤 실행된다.',
    '개발 환경의 Strict Mode는 첫 setup 전에 setup과 cleanup을 한 번 더 실행해 클린업 누락을 드러낸다.',
    'props·state로 계산할 수 있는 값이나 특정 사용자 이벤트에 대한 처리는 Effect가 아니라 렌더링 중 계산이나 이벤트 핸들러에 둔다.',
  ],
  references: [
    {
      title: 'useEffect',
      url: 'https://react.dev/reference/react/useEffect',
      publisher: 'react.dev API Reference',
    },
    {
      title: 'Synchronizing with Effects',
      url: 'https://react.dev/learn/synchronizing-with-effects',
      publisher: 'react.dev',
    },
    {
      title: 'You Might Not Need an Effect',
      url: 'https://react.dev/learn/you-might-not-need-an-effect',
      publisher: 'react.dev',
    },
    {
      title: 'Lifecycle of Reactive Effects',
      url: 'https://react.dev/learn/lifecycle-of-reactive-effects',
      publisher: 'react.dev',
    },
  ],
  updatedAt: '2026-11-19',
} satisfies ConceptMeta
