import { createClient } from '@/lib/supabase/server'
import { HiveCard } from '@/components/hives/hive-card'
import type { Location, Hive, Inspection } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*, hives(*)').order('created_at')

  const hiveIds = (locations as (Location & { hives: Hive[] })[] | null)?.flatMap(l => l.hives.map(h => h.id)) ?? []
  type InspectionRow = Pick<Inspection, 'hive_id' | 'inspected_at'>
  const { data: allInspections } = hiveIds.length
    ? await (supabase.from('inspections')
        .select('hive_id, inspected_at')
        .in('hive_id', hiveIds)
        .order('inspected_at', { ascending: false }) as unknown as Promise<{ data: InspectionRow[] | null }>)
    : { data: [] as InspectionRow[] }

  // Keep only the most recent inspection per hive (rows are already ordered descending)
  const lastByHive: Record<string, InspectionRow> = {}
  for (const inspection of allInspections ?? []) {
    if (!lastByHive[inspection.hive_id]) lastByHive[inspection.hive_id] = inspection
  }

  const typedLocations = locations as (Location & { hives: Hive[] })[] | null

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {typedLocations?.map(loc => (
        <div key={loc.id}>
          <h2 className="font-medium text-muted-foreground mb-2">{loc.name}</h2>
          <div className="space-y-2">
            {loc.hives.map(hive => (
              <HiveCard key={hive.id} hive={hive} lastInspection={lastByHive[hive.id] ?? null} />
            ))}
          </div>
        </div>
      ))}
      {!typedLocations?.length && (
        <p className="text-muted-foreground">No locations yet. Add one in Locations.</p>
      )}
    </div>
  )
}
