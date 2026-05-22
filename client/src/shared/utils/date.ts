export const toDisplayDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const toRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate)
  const now = Date.now()
  const diffMs = now - date.getTime()

  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }

  return toDisplayDate(isoDate)
}
