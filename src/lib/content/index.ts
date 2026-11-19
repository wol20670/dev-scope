import { concepts } from '../../content/concepts/index.ts'
import { createConceptStore } from './store.ts'

export { categories, difficultyLabels } from '../../content/categories.ts'
export { learningPaths } from '../../content/paths.ts'
export { createConceptStore, type ConceptStore } from './store.ts'
export { bodyText, prepareBodies, snippet } from './search.ts'

/** 저장소에 포함된 실제 콘텐츠로 만든 기본 store */
export const conceptStore = createConceptStore(concepts)

export const {
  listConcepts,
  getConceptById,
  getConceptBySlug,
  searchConcepts,
  getRelatedConcepts,
  getPrerequisites,
  getAdjacentConcepts,
  getConceptSummary,
  listTags,
  countByCategory,
} = conceptStore
