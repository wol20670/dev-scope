import type { ConceptMeta } from '../../../types/concept'

export default {
  id: 'js-event-loop',
  slug: 'js-event-loop',
  title: 'JavaScript 이벤트 루프',
  description:
    '싱글 스레드인 JavaScript가 타이머·네트워크·사용자 입력 같은 비동기 작업을 처리하는 방식. 콜 스택이 비면 마이크로태스크를 모두 비우고, 그다음 태스크 하나를 꺼내 실행하는 과정을 반복한다.',
  category: 'frontend',
  tags: ['JavaScript', '비동기', '브라우저'],
  aliases: ['Event Loop', '이벤트루프', 'JS Event Loop', '자바스크립트 이벤트 루프'],
  keywords: [
    '콜 스택',
    'Call Stack',
    '태스크 큐',
    'Task Queue',
    '마이크로태스크',
    'Microtask',
    'microtask checkpoint',
    '매크로태스크',
    'macrotask',
    'setTimeout',
    'Promise.then',
    'queueMicrotask',
    'Web API',
    'process.nextTick',
    'setImmediate',
  ],
  difficulty: 'intermediate',
  prerequisites: [],
  relatedConcepts: ['js-promise-async-await', 'react-rendering', 'react-useeffect'],
  visualizationType: 'event-loop',
  keyPoints: [
    'JavaScript 코드는 한 스레드의 콜 스택에서 실행되고, 비동기 작업의 완료 처리는 콜백 형태로 큐에 들어갔다가 나중에 실행된다.',
    '브라우저 이벤트 루프는 태스크 하나를 실행하고, 콜 스택이 비면 마이크로태스크 큐를 완전히 비운 뒤 다음 태스크로 넘어간다.',
    'Promise의 then 콜백은 마이크로태스크, setTimeout 콜백은 태스크이므로 같은 시점에 예약해도 then이 먼저 실행된다.',
    'setTimeout의 지연 시간은 "최소" 대기 시간이며, 콜 스택이 비고 앞선 태스크가 끝나야 실행된다.',
    'HTML 표준의 용어는 태스크와 마이크로태스크이며 "매크로태스크"는 표준 용어가 아니다. Node.js는 단계(phase)와 process.nextTick 등 별도 규칙을 가진다.',
  ],
  references: [
    {
      title: 'Event loops',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loops',
      publisher: 'HTML Living Standard (WHATWG)',
    },
    {
      title: 'JavaScript execution model',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model',
      publisher: 'MDN',
    },
    {
      title: 'Using microtasks in JavaScript with queueMicrotask()',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide',
      publisher: 'MDN',
    },
    {
      title: 'The Node.js Event Loop',
      url: 'https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick',
      publisher: 'Node.js Learn',
    },
  ],
  updatedAt: '2026-11-19',
  featured: true,
} satisfies ConceptMeta
