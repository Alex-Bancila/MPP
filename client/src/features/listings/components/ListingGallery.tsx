interface ListingGalleryProps {
  photos: string[]
  title: string
}

export const ListingGallery = ({ photos, title }: ListingGalleryProps) => {
  return (
    <section className="mc-detail__gallery">
      {photos.map((photo, index) => {
        return (
          <img
            key={`${photo}_${index}`}
            src={photo}
            alt={`${title} photo ${index + 1}`}
            className="mc-detail__cover"
          />
        )
      })}
    </section>
  )
}
