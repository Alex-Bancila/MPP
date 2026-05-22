import { CategoryBarChart } from '@/features/stats/components/CategoryBarChart'
import { CategoryPieChart } from '@/features/stats/components/CategoryPieChart'
import type { CategoryStatsRow } from '@/app/store/selectors'

interface StatsVisualPaneProps {
  rows: CategoryStatsRow[]
  view: 'bar' | 'pie'
}

export const StatsVisualPane = ({ rows, view }: StatsVisualPaneProps) => {
  return (
    <section className="mc-stats-panel">
      <h3 className="mc-page__title" style={{ fontSize: '18px' }}>
        Visual View
      </h3>

      {view === 'bar' ? <CategoryBarChart data={rows} /> : <CategoryPieChart data={rows} />}
    </section>
  )
}
