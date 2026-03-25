import Link from 'next/link'
import type { Hive } from '@/lib/types'

type Props = { hive: Hive; lastInspection: { inspected_at: string } | null }

export function HiveCard({ hive, lastInspection }: Props) {
  const daysSince = lastInspection
    ? Math.floor((Date.now() - new Date(lastInspection.inspected_at).getTime()) / 86400000)
    : null
  const overdue = daysSince === null || daysSince >= 14

  return (
    <Link href={`/hives/${hive.id}`} className="block p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-medium">{hive.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          hive.status === 'active' ? 'bg-green-100 text-green-800' :
          hive.status === 'dead' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>{hive.status}</span>
      </div>
      <p className={`text-sm mt-1 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {daysSince === null ? 'Never inspected' : `Inspected ${daysSince}d ago${overdue ? ' — due!' : ''}`}
      </p>
    </Link>
  )
}
