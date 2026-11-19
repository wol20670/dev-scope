/**
 * 브라우저 이벤트 루프의 단순화 모델.
 *
 * - 스크립트 전체가 하나의 태스크로 실행된다.
 * - 콜 스택이 비면 Microtask Queue를 "완전히" 비운다 (처리 중 추가된 마이크로태스크 포함).
 * - 그다음 Task Queue에서 태스크를 "하나" 꺼내 실행하고, 다시 마이크로태스크를 비운다.
 * - 타이머는 호스트 환경(Web APIs)이 관리하며, 만료되면 콜백이 Task Queue로 이동한다.
 *   동기 코드는 시간이 걸리지 않는다고 보고, 할 일이 없을 때 가상 시계를 다음 타이머 만료 시각으로 옮긴다.
 *
 * 렌더링 단계, requestAnimationFrame, 여러 종류의 태스크 큐(태스크 소스)는 모델링하지 않는다.
 */

export type Op =
  | { kind: 'log'; line: number; text: string }
  | { kind: 'timeout'; line: number; delay: number; label: string; body: Op[] }
  | { kind: 'then'; line: number; label: string; body: Op[] }

export interface Program {
  id: string
  title: string
  code: string
  ops: Op[]
}

export interface QueueItem {
  /** 애니메이션에서 같은 콜백을 추적하기 위한 id */
  id: string
  label: string
}

export interface TimerItem extends QueueItem {
  delay: number
  fireAt: number
}

export type LoopPhase = 'idle' | 'script' | 'microtask' | 'timer' | 'task' | 'done'

export interface LoopSnapshot {
  title: string
  description: string
  /** 강조할 코드 줄 (1부터) */
  line: number | null
  stack: QueueItem[]
  webApis: TimerItem[]
  tasks: QueueItem[]
  microtasks: QueueItem[]
  output: string[]
  phase: LoopPhase
  /** 가상 시계 (ms) */
  clock: number
}

interface Callback extends QueueItem {
  line: number
  body: Op[]
}

export function runEventLoop(program: Program): LoopSnapshot[] {
  const snaps: LoopSnapshot[] = []
  const stack: QueueItem[] = []
  const webApis: (TimerItem & Callback)[] = []
  const tasks: Callback[] = []
  const microtasks: Callback[] = []
  const output: string[] = []
  let clock = 0
  let phase: LoopPhase = 'idle'
  let line: number | null = null
  let seq = 0

  const strip = ({ id, label }: QueueItem): QueueItem => ({ id, label })
  const snap = (title: string, description: string) =>
    snaps.push({
      title,
      description,
      line,
      stack: stack.map(strip),
      webApis: webApis.map(({ id, label, delay, fireAt }) => ({ id, label, delay, fireAt })),
      tasks: tasks.map(strip),
      microtasks: microtasks.map(strip),
      output: [...output],
      phase,
      clock,
    })

  const exec = (ops: Op[]) => {
    for (const op of ops) {
      line = op.line
      const frameId = `frame-${++seq}`
      if (op.kind === 'log') {
        stack.push({ id: frameId, label: `console.log('${op.text}')` })
        output.push(op.text)
        snap(`console.log('${op.text}')`, `동기 코드다. 콜 스택에서 바로 실행되어 콘솔에 '${op.text}'가 출력된다.`)
      } else if (op.kind === 'timeout') {
        stack.push({ id: frameId, label: `setTimeout(…, ${op.delay})` })
        webApis.push({ id: `cb-${++seq}`, label: op.label, delay: op.delay, fireAt: clock + op.delay, line: op.line, body: op.body })
        snap(
          `setTimeout 등록 (${op.delay}ms)`,
          `setTimeout은 콜백을 실행하지 않고 호스트 환경(Web APIs)에 타이머를 맡긴 뒤 바로 반환한다. 타이머가 만료되면 콜백 '${op.label}'이 Task Queue로 들어간다. 지연 시간은 "최소" 대기 시간이지 실행 시각 보장이 아니다.`,
        )
      } else {
        stack.push({ id: frameId, label: 'Promise.resolve().then(…)' })
        microtasks.push({ id: `cb-${++seq}`, label: op.label, line: op.line, body: op.body })
        snap(
          'then 콜백을 마이크로태스크로 등록',
          `Promise.resolve()는 이미 이행된 Promise라서 then 콜백 '${op.label}'이 곧바로 Microtask Queue에 들어간다. 하지만 지금 실행 중인 코드가 끝날 때까지는 실행되지 않는다.`,
        )
      }
      stack.pop()
    }
  }

  const runCallback = (cb: Callback, kind: 'microtask' | 'task') => {
    stack.push({ id: cb.id, label: cb.label })
    line = cb.line
    phase = kind
    snap(
      kind === 'microtask' ? `마이크로태스크 실행: ${cb.label}` : `태스크 실행: ${cb.label}`,
      kind === 'microtask'
        ? 'Microtask Queue의 맨 앞 콜백을 꺼내 콜 스택에서 실행한다. 큐가 빌 때까지 이 과정을 반복한다.'
        : 'Task Queue에서 태스크 "하나"를 꺼내 실행한다. 이 태스크가 끝나면 다음 태스크로 가기 전에 마이크로태스크를 먼저 모두 처리한다.',
    )
    exec(cb.body)
    stack.pop()
  }

  const drainMicrotasks = () => {
    if (microtasks.length === 0) return
    line = null
    phase = 'microtask'
    snap(
      '마이크로태스크 체크포인트',
      `콜 스택이 비었다. 이벤트 루프는 다음 태스크로 넘어가기 전에 Microtask Queue에 있는 ${microtasks.length}개의 콜백을 모두 처리한다.`,
    )
    while (microtasks.length) runCallback(microtasks.shift()!, 'microtask')
  }

  snap('준비', '아직 아무것도 실행되지 않았다. 다음 단계로 이동해 코드를 한 줄씩 따라가 보자. 콘솔에 찍힐 순서를 먼저 예상해 보는 것도 좋다.')

  phase = 'script'
  stack.push({ id: 'script', label: '<script> (전역 코드)' })
  snap('스크립트 실행 시작', '스크립트 전체가 하나의 태스크로 실행된다. 전역 실행 컨텍스트가 콜 스택에 올라간다.')
  exec(program.ops)
  stack.pop()
  line = null
  snap('스크립트 종료', '동기 코드가 모두 끝나 콜 스택이 비었다. 이제부터 이벤트 루프가 대기 중인 콜백을 처리한다.')

  drainMicrotasks()

  while (tasks.length || webApis.length) {
    if (tasks.length === 0) {
      // 할 일이 없으므로 다음 타이머 만료 시각까지 시간이 흐른다
      clock = Math.min(...webApis.map((t) => t.fireAt))
      const expired = webApis.filter((t) => t.fireAt <= clock)
      for (const t of expired) webApis.splice(webApis.indexOf(t), 1)
      tasks.push(...expired)
      line = null
      phase = 'timer'
      snap(
        `타이머 만료 (${clock}ms)`,
        `${clock}ms 시점에 만료된 타이머의 콜백(${expired.map((t) => t.label).join(', ')})이 Task Queue로 이동한다. 실제로는 0ms 타이머가 스크립트 실행 중에 이미 만료될 수도 있지만, 어느 쪽이든 콜 스택이 비고 마이크로태스크가 모두 끝나야 실행된다.`,
      )
    }
    runCallback(tasks.shift()!, 'task')
    line = null
    drainMicrotasks()
  }

  phase = 'done'
  line = null
  snap('모든 작업 완료', `콜 스택과 모든 큐가 비었다. 최종 출력 순서: ${output.join(' → ')}`)
  return snaps
}

/* ---------- 예제 프로그램 ---------- */

const log = (line: number, text: string): Op => ({ kind: 'log', line, text })
const timeout = (line: number, delay: number, label: string, body: Op[]): Op => ({ kind: 'timeout', line, delay, label, body })
const then = (line: number, label: string, body: Op[]): Op => ({ kind: 'then', line, label, body })

export const programs: Program[] = [
  {
    id: 'basic',
    title: '기본 순서',
    code: `console.log('A');
setTimeout(() => {
  console.log('B');
}, 0);
Promise.resolve().then(() => {
  console.log('C');
});
console.log('D');`,
    ops: [log(1, 'A'), timeout(2, 0, 'timeout 콜백', [log(3, 'B')]), then(5, 'then 콜백', [log(6, 'C')]), log(8, 'D')],
  },
  {
    id: 'nested',
    title: '중첩된 콜백',
    code: `console.log('start');
setTimeout(() => {
  console.log('timeout 1');
  Promise.resolve().then(() => {
    console.log('micro in timeout');
  });
}, 0);
setTimeout(() => {
  console.log('timeout 2');
}, 0);
Promise.resolve().then(() => {
  console.log('micro 1');
  setTimeout(() => {
    console.log('timeout 3');
  }, 0);
});
console.log('end');`,
    ops: [
      log(1, 'start'),
      timeout(2, 0, 'timeout 1 콜백', [log(3, 'timeout 1'), then(4, '내부 then 콜백', [log(5, 'micro in timeout')])]),
      timeout(8, 0, 'timeout 2 콜백', [log(9, 'timeout 2')]),
      then(11, 'then 콜백', [log(12, 'micro 1'), timeout(13, 0, 'timeout 3 콜백', [log(14, 'timeout 3')])]),
      log(17, 'end'),
    ],
  },
  {
    id: 'chain',
    title: '지연 시간과 연쇄',
    code: `setTimeout(() => {
  console.log('timeout 100ms');
}, 100);
setTimeout(() => {
  console.log('timeout 0ms');
}, 0);
Promise.resolve().then(() => {
  console.log('micro 1');
  Promise.resolve().then(() => {
    console.log('micro 2');
  });
});
console.log('sync');`,
    ops: [
      timeout(1, 100, '100ms 콜백', [log(2, 'timeout 100ms')]),
      timeout(4, 0, '0ms 콜백', [log(5, 'timeout 0ms')]),
      then(7, 'then 콜백 1', [log(8, 'micro 1'), then(9, 'then 콜백 2', [log(10, 'micro 2')])]),
      log(13, 'sync'),
    ],
  },
]
