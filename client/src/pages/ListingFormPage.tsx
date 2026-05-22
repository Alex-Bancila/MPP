import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { getCurrentUser, getListingById } from '@/app/store/selectors'
import { ListingForm } from '@/features/listings/components/ListingForm'
import type { ListingFormValues } from '@/features/listings/listingSchema'
import { useListings } from '@/features/listings/useListings'
import { Button } from '@/shared/components/ui/Button'

export const ListingFormPage = () => {
  const navigate = useNavigate()
  const params = useParams<{ listingId: string }>()
  const { state } = useAppStore()
  const currentUser = getCurrentUser(state)

  const { createListing, updateListing } = useListings()

  const [submitError, setSubmitError] = useState<string | null>(null)

  const editingListing = useMemo(() => {
    if (!params.listingId) {
      return undefined
    }

    return getListingById(state, params.listingId)
  }, [params.listingId, state])

  if (!currentUser) {
    navigate('/login', { state: { returnTo: params.listingId ? `/listings/${params.listingId}/edit` : '/listings/new' }, replace: true })
    return null
  }

  if (editingListing && editingListing.sellerId !== currentUser.id) {
    return (
      <section className="mc-page">
        <div className="mc-empty">Only the owner can edit this listing.</div>
      </section>
    )
  }

  const editing = Boolean(editingListing)

  const submit = (values: ListingFormValues) => {
    const result = editingListing
      ? updateListing(editingListing.id, values)
      : createListing(values)

    if (!result.ok) {
      setSubmitError(result.message ?? 'Could not save listing.')
      return
    }

    navigate('/listings')
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">{editing ? 'Edit listing' : 'Post a new listing'}</h1>
          <p className="mc-page__subtitle">
            {editing
              ? 'Update details, pricing, images, and availability.'
              : 'Create a marketplace listing with complete details.'}
          </p>
        </div>

        <Button variant="ghost" onClick={() => navigate('/listings')}>
          Back
        </Button>
      </header>

      <article className="mc-card" style={{ padding: '32px', border: '1px solid #3A3A3A' }}>
        {submitError ? <p className="mc-auth__error">{submitError}</p> : null}
        <ListingForm
          initialValue={editingListing}
          submitLabel={editing ? 'Save changes' : 'Create listing'}
          onSubmit={submit}
          onCancel={() => navigate('/listings')}
        />
      </article>
    </section>
  )
}
