export type CategoryKey =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'travel'
  | 'entertainment'
  | 'shopping'
  | 'rent'
  | 'utilities'
  | 'health'
  | 'gifts'
  | 'education'
  | 'refund'
  | 'other';

export type Category = {
  key: CategoryKey;
  label: string;
  icon: string;
  emoji: string;
  keywords: string[];
  priority?: number;
};

export const CATEGORIES: Category[];
export function normalizeTitle(text?: string): string;
export function matchCategory(title?: string): { category: Category; score: number };
export function suggestCategoryFromTitle(title?: string): Category;
export function getCategoryByKey(key?: string | null): Category;
export function listCategories(): Category[];
export function getDefaultExpenseCategory(): Category;
