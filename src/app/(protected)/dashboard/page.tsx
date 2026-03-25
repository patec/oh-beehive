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
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-amber-700">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-semibold">Groovy, baby! Here&apos;s what&apos;s buzzing.</p>
      </div>

      {typedLocations?.map(loc => (
        <div key={loc.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200">
            <h2 className="font-bold text-amber-800 flex items-center gap-2">
              <span className="text-base">{loc.name}</span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-0.5 rounded-full">
                {loc.hives.length} hive{loc.hives.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <AddHiveDialog locationId={loc.id} />
          </div>
          <div className="p-4 space-y-2.5">
            {loc.hives.map(hive => (
              <HiveCard key={hive.id} hive={hive} lastInspection={lastByHive[hive.id] ?? null} />
            ))}
            {!loc.hives.length && (
              <p className="text-sm text-muted-foreground py-6 text-center font-medium">
                No hives here yet, baby. Add one and let&apos;s get shagging!
              </p>
            )}
          </div>
        </div>
      ))}

      {!typedLocations?.length && (
        <div className="text-center py-16 space-y-4 bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
          <p className="text-5xl font-black text-amber-400">One MILLION bees!</p>
          <p className="text-muted-foreground font-semibold">
            Well, not yet baby. Head to <strong className="text-amber-700">Locations</strong> to set up your groovy hive operation.
          </p>
        </div>
      )}
    </div>
  )
}
