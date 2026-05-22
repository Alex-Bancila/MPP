import type { CategoryStatsRow } from '@/app/store/selectors'
import { toRon } from '@/shared/utils/currency'

interface StatsTablePaneProps {
  rows: CategoryStatsRow[]
}

export const StatsTablePane = ({ rows }: StatsTablePaneProps) => {
  return (
    <section className="mc-stats-panel">
      <h3 className="mc-page__title" style={{ fontSize: '18px' }}>
        Category Breakdown
      </h3>

      <table className="mc-listing-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Listings</th>
            <th>Avg Price</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            return (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.count}</td>
                <td>{toRon(row.averagePrice)}</td>
                <td>{toRon(row.totalValue)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
