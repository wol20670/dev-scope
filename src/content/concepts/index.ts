import type { ConceptMeta } from '../../types/concept'
import cors from './cors/meta'
import databaseIndex from './database-index/meta'
import httpRequestLifecycle from './http-request-lifecycle/meta'
import jpaNPlusOne from './jpa-n-plus-one/meta'
import jsEventLoop from './js-event-loop/meta'
import jsPromiseAsyncAwait from './js-promise-async-await/meta'
import oauth2AuthorizationCode from './oauth2-authorization-code/meta'
import optimisticPessimisticLock from './optimistic-pessimistic-lock/meta'
import reactRendering from './react-rendering/meta'
import reactUseEffect from './react-useeffect/meta'
import springIocDi from './spring-ioc-di/meta'
import springTransaction from './spring-transaction/meta'
import transactionIsolation from './transaction-isolation/meta'

/**
 * 모든 개념의 메타데이터. 새 개념을 추가하면 여기에 한 줄 추가한다.
 * 이 배열의 순서가 기본 목록 순서이자 이전·다음 개념 순서다.
 * (본문 MDX는 src/content/concepts/<slug>/content.mdx 로 자동 연결된다)
 */
export const concepts: ConceptMeta[] = [
  // Backend 흐름
  httpRequestLifecycle,
  springIocDi,
  springTransaction,
  transactionIsolation,
  jpaNPlusOne,
  optimisticPessimisticLock,
  databaseIndex,
  // Frontend 런타임
  jsPromiseAsyncAwait,
  jsEventLoop,
  reactRendering,
  reactUseEffect,
  // Web
  cors,
  oauth2AuthorizationCode,
]
