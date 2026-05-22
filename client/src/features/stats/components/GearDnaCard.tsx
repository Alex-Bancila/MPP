import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'

import { computeGearDnaScore, type GearDnaSignal } from '@/features/stats/gearDna'

interface GearDnaCardProps {
  data: GearDnaSignal[]
}

export const GearDnaCard = ({ data }: GearDnaCardProps) => {
  const score = computeGearDnaScore(data)

  return (
    <section className="mc-gear-dna">
      <h3 className="mc-page__title" style={{ fontSize: '18px' }}>
        Gear DNA
      </h3>
      <span className="mc-gear-dna__score">Match Score: {score}%</span>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius={88}>
            <PolarGrid stroke="#3A3A3A" />
            <PolarAngleAxis dataKey="label" tick={{ fill: '#9E9E9E', fontSize: 12 }} />
            <Radar
              dataKey="value"
              stroke="#C0392B"
              fill="rgba(192,57,43,0.5)"
              fillOpacity={1}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
