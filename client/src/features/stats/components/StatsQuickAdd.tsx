import { useState, type FormEvent } from 'react'

import { useListings } from '@/features/listings/useListings'
import { LISTING_CATEGORIES } from '@/shared/constants/categories'
import { Button } from '@/shared/components/ui/Button'

export const StatsQuickAdd = () => {
  const { createListing } = useListings()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<(typeof LISTING_CATEGORIES)[number]>('Creating')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed.length < 3) {
      setMessage('Enter a title with at least 3 characters.')
      return
    }

    const result = createListing({
      title: trimmed,
      description:
        'Demo listing added from the statistics page to show synchronized table and chart updates.',
      price: 750,
      category,
      photos: ['https://picsum.photos/seed/stats-quick-add/1200/900'],
      status: 'Active',
    })

    if (!result.ok) {
      setMessage(result.message ?? 'Unable to add listing.')
      return
    }

    setTitle('')
    setMessage('Listing added — watch the category table and charts update.')
  }

  return (
    <article className="mc-stats-card">
      <h2 className="mc-stats-card__title">Quick add listing (Gold sync demo)</h2>
      <p className="mc-page__subtitle">
        Adds a listing to the shared store so the tabular breakdown and charts on this page update
        together without leaving statistics.
      </p>
      <form className="mc-form" onSubmit={handleSubmit}>
        <label className="mc-field">
          <span className="mc-field__label">Demo listing title</span>
          <input
            className="mc-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Stats sync test pedal"
          />
        </label>
        <label className="mc-field">
          <span className="mc-field__label">Category</span>
          <select
            className="mc-input"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as (typeof LISTING_CATEGORIES)[number])
            }
          >
            {LISTING_CATEGORIES.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        </label>
        <div className="mc-form__actions">
          <Button type="submit" variant="primary">
            Add demo listing
          </Button>
        </div>
      </form>
      {message ? <p className="mc-page__subtitle">{message}</p> : null}
    </article>
  )
}
