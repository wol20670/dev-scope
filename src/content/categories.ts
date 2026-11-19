import type { Category, Difficulty } from '../types/concept.ts'

export const categories: Category[] = [
  { id: 'backend', label: 'Backend', description: 'Spring, 트랜잭션, 동시성처럼 서버 애플리케이션의 동작 원리' },
  { id: 'frontend', label: 'Frontend', description: 'JavaScript 런타임과 React가 화면을 그리는 방식' },
  { id: 'database-infra', label: 'Database & Infrastructure', description: '인덱스, 락, 쿼리 성능 등 데이터 계층의 핵심' },
  { id: 'network-web', label: 'Network & Web', description: 'HTTP, CORS, 인증 프로토콜 등 웹의 통신 규칙' },
]

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '심화',
}
