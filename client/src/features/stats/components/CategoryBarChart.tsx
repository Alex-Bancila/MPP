import { useEffect, useMemo, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { CategoryStatsRow } from '@/app/store/selectors'

interface CategoryBarChartProps {
  data: CategoryStatsRow[]
}

const COMPACT_BREAKPOINT = 900

const SHORT_CATEGORY_LABELS: Record<string, string> = {
  Listening: 'Listening',
  Creating: 'Creating',
  'Electrify Your Sound': 'Electrify',
  Learning: 'Learning',
  Accessories: 'Accessories',
}

const formatCompactTick = (value: number | string): string => {
  const amount = Number(value)

  if (Number.isNaN(amount)) {
    return String(value)
  }

  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`
  }

  return `${amount}`
}

export const CategoryBarChart = ({ data }: CategoryBarChartProps) => {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT}px)`)
    const sync = () => {
      setIsCompact(mediaQuery.matches)
    }

    sync()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync)
    } else {
      mediaQuery.addListener(sync)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', sync)
      } else {
        mediaQuery.removeListener(sync)
      }
    }
  }, [])

  const sortedByValue = useMemo(() => {
    return [...data]
      .sort((first, second) => first.averagePrice - second.averagePrice)
      .map((row) => {
        return {
          ...row,
          categoryLabel: isCompact ? SHORT_CATEGORY_LABELS[row.category] : row.category,
        }
      })
  }, [data, isCompact])

  const chartMargin = isCompact
    ? { top: 8, right: 12, bottom: 4, left: 0 }
    : { top: 12, right: 88, bottom: 4, left: 4 }

  const yAxisWidth = isCompact ? 88 : 120

  return (
    <div className="mc-chart-wrap mc-chart-wrap--bar">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={sortedByValue} margin={chartMargin} barSize={isCompact ? 20 : 24}>
          <CartesianGrid stroke="#3A3A3A" vertical={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9E9E9E', fontSize: 12 }}
            axisLine={{ stroke: '#3A3A3A' }}
            tickLine={false}
            tickFormatter={isCompact ? formatCompactTick : undefined}
          />
          <YAxis
            type="category"
            dataKey="categoryLabel"
            width={yAxisWidth}
            tick={{ fill: '#F0F0F0', fontSize: isCompact ? 11 : 12 }}
            axisLine={{ stroke: '#3A3A3A' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            formatter={(value) => `${value} RON`}
            contentStyle={{
              background: '#2E2E2E',
              borderColor: '#3A3A3A',
              color: '#F0F0F0',
            }}
          />
          <Bar
            dataKey="averagePrice"
            radius={[0, 8, 8, 0]}
            fill="#C0392B"
            activeBar={{ fill: '#E74C3C' }}
          >
            {!isCompact ? (
              <LabelList
                dataKey="averagePrice"
                position="right"
                fill="#F0F0F0"
                fontSize={12}
                formatter={(value: unknown) => `${value} RON`}
              />
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
