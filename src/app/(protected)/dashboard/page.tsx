import { createClient } from '@/lib/supabase/server'
import { HiveCard } from '@/components/hives/hive-card'
import { AddHiveDialog } from '@/components/hives/add-hive-dialog'
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

  const lastByHive: Record<string, InspectionRow> = {}
  for (const inspection of allInspections ?? []) {
    if (!lastByHive[inspection.hive_id]) lastByHive[inspection.hive_id] = inspection
  }

  const typedLocations = locations as (Location & { hives: Hive[] })[] | null

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Groovy, baby! Here&apos;s what&apos;s buzzing.</p>
      </div>
      {typedLocations?.map(loc => (
        <div key={loc.id}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-muted-foreground">{loc.name}</h2>
            <AddHiveDialog locationId={loc.id} />
          </div>
          <div className="space-y-2">
            {loc.hives.map(hive => (
              <HiveCard key={hive.id} hive={hive} lastInspection={lastByHive[hive.id] ?? null} />
            ))}
            {!loc.hives.length && (
              <p className="text-sm text-muted-foreground px-3 py-4 border rounded-lg border-dashed text-center">
                No hives here yet, baby. Add one and let&apos;s get shagging!
              </p>
            )}
          </div>
        </div>
      ))}
      {!typedLocations?.length && (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl font-black text-amber-400">One MILLION bees!</p>
          <p className="text-muted-foreground">Well, not yet baby. Head to <strong>Locations</strong> to set up your groovy hive operation.</p>
        </div>
      )}
    </div>
  )
}
