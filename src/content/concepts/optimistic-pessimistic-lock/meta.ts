import type { ConceptMeta } from '../../../types/concept'

export default {
  id: 'optimistic-pessimistic-lock',
  slug: 'optimistic-pessimistic-lock',
  title: '낙관적 락과 비관적 락',
  description:
    '여러 트랜잭션이 같은 데이터를 동시에 수정할 때, 충돌을 "나중에 감지"할지 "미리 막을지"를 고르는 두 가지 동시성 제어 전략.',
  category: 'database-infra',
  tags: ['동시성', '트랜잭션', 'JPA', 'Spring'],
  aliases: ['Optimistic Lock', 'Pessimistic Lock', '낙관적 잠금', '비관적 잠금', 'Optimistic Locking', 'Pessimistic Locking'],
  keywords: ['@Version', 'SELECT FOR UPDATE', 'PESSIMISTIC_WRITE', 'OptimisticLockException', 'Lost Update', '갱신 손실', '교착 상태', 'Deadlock', '버전 컬럼'],
  difficulty: 'intermediate',
  prerequisites: ['spring-transaction'],
  relatedConcepts: ['spring-transaction', 'database-index', 'jpa-n-plus-one'],
  visualizationType: 'locking',
  keyPoints: [
    '두 전략 모두 "갱신 손실(Lost Update)"을 막기 위한 것이다.',
    '낙관적 락은 잠그지 않고 버전 번호를 비교해, 커밋 시점에 충돌을 감지하고 실패시킨다.',
    '비관적 락은 SELECT ... FOR UPDATE 같은 잠금으로 다른 트랜잭션의 충돌하는 잠금 요청과 수정을 대기시킨다.',
    '충돌이 드물면 낙관적 락, 충돌이 잦고 실패 비용이 크면 비관적 락이 유리하다.',
    '실제 대기·조회 동작은 DBMS와 격리 수준에 따라 다르다.',
  ],
  references: [
    {
      title: 'Locking',
      url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html',
      publisher: 'Spring Data JPA Reference',
    },
    {
      title: 'Jakarta Persistence 3.1 — Locking and Concurrency',
      url: 'https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html#locking-and-concurrency',
      publisher: 'Jakarta EE',
    },
    {
      title: 'Explicit Locking — Row-Level Locks',
      url: 'https://www.postgresql.org/docs/current/explicit-locking.html',
      publisher: 'PostgreSQL Docs',
    },
    {
      title: 'Locking Reads',
      url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html',
      publisher: 'MySQL 8.4 Reference Manual',
    },
  ],
  updatedAt: '2026-11-19',
  featured: true,
} satisfies ConceptMeta
