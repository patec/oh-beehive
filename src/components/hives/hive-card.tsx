import Link from 'next/link'
import type { Hive } from '@/lib/types'

type Props = { hive: Hive; lastInspection: { inspected_at: string } | null }

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-amber-100 text-amber-800',
  dead: 'bg-red-100 text-red-800',
  sold: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Groovy',
  dead: 'Not groovy',
  sold: 'Sold, baby',
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

  return (
    <Link href={`/hives/${hive.id}`} className="block p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-medium">{hive.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[hive.status] ?? STATUS_STYLE.sold}`}>
          {STATUS_LABEL[hive.status] ?? hive.status}
        </span>
      </div>
      <p className={`text-sm mt-1 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {inspectionText}
      </p>
    </Link>
  )
}
