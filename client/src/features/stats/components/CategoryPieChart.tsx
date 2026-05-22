import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { CategoryStatsRow } from '@/app/store/selectors'

interface CategoryPieChartProps {
  data: CategoryStatsRow[]
}

export const CategoryPieChart = ({ data }: CategoryPieChartProps) => {
  const total = data.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="mc-chart-wrap mc-chart-wrap--pie">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="46%"
            innerRadius={0}
            outerRadius={90}
            paddingAngle={2}
            labelLine={false}
            label={(props: { payload?: Record<string, unknown>; x?: number; y?: number; fill?: string }) => {
              const count = (props.payload?.count as number) ?? 0
              const x = props.x as number
              const y = props.y as number
              const fill = props.fill as string

              if (
                typeof x !== 'number' ||
                typeof y !== 'number' ||
                typeof fill !== 'string' ||
                typeof count !== 'number'
              ) {
                return null
              }

              const percent = total === 0 ? 0 : Math.round((count / total) * 100)
              if (percent === 0) {
                return null
              }

              return (
                <text x={x} y={y} fill={fill} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={600}>
                  {`${percent}%`}
                </text>
              )
            }}
          >
            {data.map((row) => {
              return <Cell key={row.category} fill={row.color} />
            })}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#2E2E2E',
              borderColor: '#3A3A3A',
              color: '#F0F0F0',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mc-pie-legend" aria-label="Category legend">
        {data.map((row) => {
          return (
            <li key={row.category} className="mc-pie-legend__item">
              <span className="mc-pie-legend__dot" style={{ backgroundColor: row.color }} />
              <span>{row.category}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
