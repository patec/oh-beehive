import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HiveCard } from '@/components/hives/hive-card'
import { AddHiveDialog } from '@/components/hives/add-hive-dialog'
import type { Location, Hive, Inspection } from '@/lib/types'

export default async function HivesPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*, hives(*)').order('name')

  const typedLocations = locations as (Location & { hives: Hive[] })[] | null
  const hiveIds = typedLocations?.flatMap(l => l.hives.map(h => h.id)) ?? []

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

  const totalHives = typedLocations?.reduce((sum, l) => sum + l.hives.length, 0) ?? 0

  const slimLocations = typedLocations?.map(l => ({ id: l.id, name: l.name })) ?? []

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hives</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalHives > 0 ? `${totalHives} hive${totalHives !== 1 ? 's' : ''} across ${typedLocations?.length ?? 0} location${(typedLocations?.length ?? 0) !== 1 ? 's' : ''}` : 'No hives yet.'}
          </p>
        </div>
        {slimLocations.length > 0 && <AddHiveDialog locations={slimLocations} />}
      </div>
      {typedLocations?.map(loc => (
        <div key={loc.id}>
          <div className="flex items-center justify-between mb-2">
            <Link href="/locations" className="font-medium text-muted-foreground hover:text-foreground transition-colors">
              {loc.name}
            </Link>
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
