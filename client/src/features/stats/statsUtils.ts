import type { Listing } from '@/shared/types/domain'

const normalized = (value: number, max: number): number => {
  if (max <= 0) {
    return 0
  }

  return Number(((value / max) * 100).toFixed(1))
}

export interface GearDnaSignal {
  label: string
  value: number
}

export const computeGearDna = (listings: Listing[]): GearDnaSignal[] => {
  const total = listings.length
  if (total === 0) {
    return [
      { label: 'Aggression', value: 0 },
      { label: 'Warmth', value: 0 },
      { label: 'Precision', value: 0 },
      { label: 'Versatility', value: 0 },
      { label: 'Value', value: 0 },
    ]
  }

  const soldCount = listings.filter((listing) => listing.status === 'Sold').length
  const activeCount = total - soldCount
  const expensiveCount = listings.filter((listing) => listing.price >= 1500).length
  const midCount = listings.filter((listing) => listing.price >= 500 && listing.price < 1500).length
  const budgetCount = listings.filter((listing) => listing.price < 500).length

  return [
    { label: 'Aggression', value: normalized(expensiveCount + soldCount, total * 2) },
    { label: 'Warmth', value: normalized(midCount + activeCount, total * 2) },
    { label: 'Precision', value: normalized(soldCount, total) },
    { label: 'Versatility', value: normalized(activeCount + midCount, total * 2) },
    { label: 'Value', value: normalized(budgetCount + activeCount, total * 2) },
  ]
}

export const computeGearDnaScore = (signals: GearDnaSignal[]): number => {
  if (signals.length === 0) {
    return 0
  }

  const sum = signals.reduce((accumulator, row) => accumulator + row.value, 0)
  return Math.round(sum / signals.length)
}
