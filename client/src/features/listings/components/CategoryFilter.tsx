import {
  ALL_CATEGORIES_FILTER,
  LISTING_CATEGORIES,
  type ListingCategoryFilter,
} from '@/shared/constants/categories'

interface CategoryFilterProps {
  value: ListingCategoryFilter
  onChange: (value: ListingCategoryFilter) => void
}

export const CategoryFilter = ({ value, onChange }: CategoryFilterProps) => {
  return (
    <div className="mc-chip-row" role="tablist" aria-label="Filter by category">
      {[ALL_CATEGORIES_FILTER, ...LISTING_CATEGORIES].map((category) => {
        const active = category === value

        return (
          <button
            key={category}
            className={active ? 'mc-chip mc-chip--active' : 'mc-chip'}
            onClick={() => onChange(category)}
            role="tab"
            aria-selected={active}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
