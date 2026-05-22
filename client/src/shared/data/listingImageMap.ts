const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80'

export const LISTING_IMAGE_BY_QUERY: Record<string, string> = {
  'electric-guitar':
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'guitar-pedal':
    'https://images.unsplash.com/photo-1461783436728-0a9217714694?auto=format&fit=crop&w=1200&q=80',
  'vinyl-record':
    'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1200&q=80',
  'music-book':
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
  'guitar-case':
    'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=1200&q=80',
  'drum-pedal':
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=1200&q=80',
}

export const getListingImage = (query: string): string => {
  return LISTING_IMAGE_BY_QUERY[query] ?? DEFAULT_IMAGE
}
