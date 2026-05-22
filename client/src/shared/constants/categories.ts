export const LISTING_CATEGORIES = [
  'Listening',
  'Creating',
  'Electrify Your Sound',
  'Learning',
  'Accessories',
] as const

export const ALL_CATEGORIES_FILTER = 'All' as const

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]
export type ListingCategoryFilter = ListingCategory | typeof ALL_CATEGORIES_FILTER

export const CATEGORY_CHART_COLORS: Record<ListingCategory, string> = {
  Listening: '#C0392B',
  Creating: '#E67E22',
  'Electrify Your Sound': '#8E44AD',
  Learning: '#27AE60',
  Accessories: '#2980B9',
}
