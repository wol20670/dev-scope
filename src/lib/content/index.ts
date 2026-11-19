import { concepts } from '../../content/concepts'
import { createConceptStore } from './store'

export { categories, difficultyLabels } from '../../content/categories'
export { learningPaths } from '../../content/paths'
export { createConceptStore, type ConceptStore } from './store'

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
