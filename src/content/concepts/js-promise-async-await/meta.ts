import type { ConceptMeta } from '../../../types/concept.ts'

export default {
  id: 'js-promise-async-await',
  slug: 'js-promise-async-await',
  title: 'JavaScript Promise와 async/await',
  description:
    '나중에 완료될 비동기 작업의 결과를 나타내는 객체인 Promise와, Promise를 동기 코드처럼 읽히게 작성하는 async/await 문법. 상태 변화, 체이닝, 에러 처리, 병렬 실행을 다룬다.',
  category: 'frontend',
  tags: ['JavaScript', '비동기'],
  aliases: ['Promise', 'async/await', 'async await', '프로미스', '비동기 함수', 'async function'],
  keywords: [
    'pending',
    'fulfilled',
    'rejected',
    'settled',
    'then',
    'catch',
    'finally',
    'Promise.all',
    'Promise.allSettled',
    'Promise.race',
    'Promise.any',
    'AggregateError',
    'await',
    '마이크로태스크',
    'unhandledrejection',
    '체이닝',
  ],
  difficulty: 'beginner',
  prerequisites: ['js-event-loop'],
  relatedConcepts: ['js-event-loop', 'react-useeffect', 'http-request-lifecycle'],
  visualizationType: 'static',
  keyPoints: [
    'Promise는 대기(pending)에서 이행(fulfilled) 또는 거부(rejected) 중 하나로 한 번만 바뀌며, 한 번 확정되면 다시 바뀌지 않는다.',
    'then은 항상 새 Promise를 반환하므로 체이닝할 수 있고, 체인 중간의 에러는 가장 가까운 catch로 전달된다.',
    'async 함수는 항상 Promise를 반환하고, await는 함수 실행을 일시 중단했다가 Promise가 확정되면 마이크로태스크로 이어서 실행한다.',
    '서로 독립적인 작업을 await로 하나씩 기다리면 순차 실행이 되므로, 병렬로 실행하려면 먼저 시작한 뒤 Promise.all 등으로 함께 기다린다.',
    '처리되지 않은 거부(unhandled rejection)는 브라우저에서 unhandledrejection 이벤트로 보고되고, Node.js 15 이상에서는 기본적으로 프로세스를 종료시킨다.',
  ],
  references: [
    {
      title: 'Promise',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
      publisher: 'MDN',
    },
    {
      title: 'Using promises',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises',
      publisher: 'MDN',
    },
    {
      title: 'async function',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
      publisher: 'MDN',
    },
    {
      title: 'await',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await',
      publisher: 'MDN',
    },
    {
      title: 'Window: unhandledrejection event',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event',
      publisher: 'MDN',
    },
  ],
  updatedAt: '2026-11-19',
} satisfies ConceptMeta
