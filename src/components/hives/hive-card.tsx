import Link from 'next/link'
import type { Hive } from '@/lib/types'

type Props = { hive: Hive; lastInspection: { inspected_at: string } | null }

const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  active: {
    label: 'Groovy',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    border: 'border-l-amber-400',
  },
  dead: {
    label: 'Not groovy',
    badge: 'bg-red-100 text-red-700 border border-red-200',
    border: 'border-l-red-400',
  },
  sold: {
    label: 'Sold, baby',
    badge: 'bg-gray-100 text-gray-600 border border-gray-200',
    border: 'border-l-gray-300',
  },
}

export function HiveCard({ hive, lastInspection }: Props) {
  const daysSince = lastInspection
    ? Math.floor((Date.now() - new Date(lastInspection.inspected_at).getTime()) / 86400000)
    : null
  const overdue = daysSince === null || daysSince >= 14

  let inspectionText: string
  if (daysSince === null) {
    inspectionText = 'Never inspected — oh, behave!'
  } else if (overdue) {
    inspectionText = `Inspected ${daysSince}d ago — that\u2019s not groovy, baby!`
  } else {
    inspectionText = `Inspected ${daysSince}d ago. Shagadelic!`
  }

  const config = STATUS_CONFIG[hive.status] ?? STATUS_CONFIG.sold

  return (
    <Link
      href={`/hives/${hive.id}`}
      className={`block bg-card border border-l-4 ${config.border} rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-150 group`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-foreground group-hover:text-amber-700 transition-colors">{hive.name}</span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${config.badge}`}>
          {config.label}
        </span>
      </div>
      {hive.species && (
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{hive.species}</p>
      )}
      <p className={`text-sm mt-1.5 font-medium ${overdue ? 'text-red-600' : 'text-amber-700/80'}`}>
        {inspectionText}
      </p>
    </Link>
  )
}
