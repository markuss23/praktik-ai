export { CourseModal } from './CourseModal';
export { ModuleModal, MODULE_PEREX_MAX_LENGTH, type ModuleFormData } from './ModuleModal';
export { AdminSidebar } from './AdminSidebar';
export { CoursePageHeader } from './CoursePageHeader';
export { PageFooterActions } from './PageFooterActions';
export { LoadingState, ErrorState } from './StateDisplays';
export { AiTutorChat } from './AiTutorChat';
export { GenerateEmbeddingsButton } from './GenerateEmbeddingsButton';
export { CourseActionButtons, EditActionButton, PublishActionButton, DeleteActionButton, ApproveActionButton } from './CourseActionButtons';
export { CourseOutlineSidebar } from './CourseOutlineSidebar';
export { CourseCreationTabs, type CreationTab } from './CourseCreationTabs';
export { CourseStepNav, type CourseStep } from './CourseStepNav';
export { CourseRubric } from './CourseRubric';
export { CourseFilters, DEFAULT_COURSE_FILTERS, type CourseFilterState } from './CourseFilters';
export { CourseCategoryFields } from './CourseCategoryFields';
export { ModuleCategoryFields } from './ModuleCategoryFields';
export {
  CourseGenerationProvider,
  useCourseGeneration,
  COURSE_GENERATION_FINISHED_EVENT,
  type CourseGenerationFinishedDetail,
  type TrackedGeneration,
} from './CourseGenerationProvider';
export { GenerationProgressCard, BackgroundGenerationsBanner } from './GenerationProgress';

// Views - exported separately for lazy loading
export * from './views';
