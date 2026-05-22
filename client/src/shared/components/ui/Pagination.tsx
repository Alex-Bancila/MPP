import { Button } from '@/shared/components/ui/Button'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (nextPage: number) => void
}

const createWindow = (page: number, totalPages: number): number[] => {
  const pages = new Set<number>()
  pages.add(1)
  pages.add(totalPages)

  for (let offset = -1; offset <= 1; offset += 1) {
    const value = page + offset
    if (value > 1 && value < totalPages) {
      pages.add(value)
    }
  }

  return [...pages].sort((first, second) => first - second)
}

export const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
  if (totalPages <= 1) {
    return null
  }

  const visiblePages = createWindow(page, totalPages)

  return (
    <nav className="mc-pagination" aria-label="Pagination">
      <Button
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        Previous
      </Button>

      <div className="mc-pagination__numbers">
        {visiblePages.map((value, index) => {
          const previous = visiblePages[index - 1]
          const hasGap = previous !== undefined && value - previous > 1

          return (
            <span key={value} className="mc-pagination__slot">
              {hasGap ? <span className="mc-pagination__ellipsis">...</span> : null}
              <button
                className={value === page ? 'mc-page-chip mc-page-chip--active' : 'mc-page-chip'}
                onClick={() => onChange(value)}
                aria-current={value === page ? 'page' : undefined}
              >
                {value}
              </button>
            </span>
          )
        })}
      </div>

      <Button
        variant="ghost"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  )
}
