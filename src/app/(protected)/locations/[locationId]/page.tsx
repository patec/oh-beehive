import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HiveCard } from '@/components/hives/hive-card'
import { AddHiveDialog } from '@/components/hives/add-hive-dialog'
import type { Hive, Inspection } from '@/lib/types'

export default async function LocationDetailPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('id, name, description, hives(*)')
    .eq('id', locationId)
    .single()

  if (!location) notFound()

  const hives = (location.hives as Hive[]) ?? []
  const hiveIds = hives.map(h => h.id)

  type InspectionRow = Pick<Inspection, 'hive_id' | 'inspected_at'>
  const { data: allInspections } = hiveIds.length
    ? await (supabase
        .from('inspections')
        .select('hive_id, inspected_at')
        .in('hive_id', hiveIds)
        .order('inspected_at', { ascending: false }) as unknown as Promise<{ data: InspectionRow[] | null }>)
    : { data: [] as InspectionRow[] }

  const lastByHive: Record<string, InspectionRow> = {}
  for (const inspection of allInspections ?? []) {
    if (!lastByHive[inspection.hive_id]) lastByHive[inspection.hive_id] = inspection
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/locations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Locations
          </Link>
          <h1 className="text-xl font-semibold mt-1">{location.name}</h1>
          {location.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{location.description}</p>
          )}
        </div>
        <AddHiveDialog locationId={locationId} />
      </div>

      <div className="space-y-2">
        {hives.map(hive => (
          <HiveCard key={hive.id} hive={hive} lastInspection={lastByHive[hive.id] ?? null} />
        ))}
        {!hives.length && (
          <p className="text-sm text-muted-foreground px-3 py-8 border rounded-lg border-dashed text-center">
            No hives at this location yet.
          </p>
        )}
      </div>
    </div>
  )
}
