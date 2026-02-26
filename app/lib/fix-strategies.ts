export const FIX_STRATEGIES = {
  // Image / CLS strategies
  SET_DIMENSIONS: "SET_DIMENSIONS",
  USE_ASPECT_RATIO: "USE_ASPECT_RATIO",
  ADD_SKELETON: "ADD_SKELETON",

  // Script / Blocking strategies
  DEFER_SCRIPT: "DEFER_SCRIPT",
  ASYNC_SCRIPT: "ASYNC_SCRIPT",
  LAZY_LOAD_ON_INTERACTION: "LAZY_LOAD_ON_INTERACTION",
  REPLACE_WITH_FASTER_ALTERNATIVE: "REPLACE_WITH_FASTER_ALTERNATIVE",
  REMOVE_UNUSED: "REMOVE_UNUSED",
} as const;

export type FixStrategyType =
  (typeof FIX_STRATEGIES)[keyof typeof FIX_STRATEGIES];

export interface StructuredSuggestion {
  type: FixStrategyType;
  label: string;
  params?: Record<string, any>;
}
