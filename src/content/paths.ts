/** 메인 페이지의 추천 학습 경로. 개념 id 순서대로 학습하도록 큐레이션한다. */
export interface LearningPath {
  id: string
  title: string
  description: string
  conceptIds: string[]
}

export const learningPaths: LearningPath[] = [
  {
    id: 'backend-data',
    title: 'Spring 백엔드의 데이터 흐름',
    description: '요청이 DB까지 가는 길을 따라가며 트랜잭션과 동시성을 이해한다.',
    conceptIds: ['http-request-lifecycle', 'spring-ioc-di', 'spring-transaction', 'transaction-isolation', 'jpa-n-plus-one', 'optimistic-pessimistic-lock'],
  },
  {
    id: 'frontend-runtime',
    title: '브라우저에서 코드가 실행되는 방식',
    description: '비동기 처리부터 React가 화면을 갱신하는 과정까지.',
    conceptIds: ['js-promise-async-await', 'js-event-loop', 'react-rendering', 'react-useeffect'],
  },
]
