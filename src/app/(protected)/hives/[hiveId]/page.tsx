import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HiveDetailTabs } from '@/components/hives/hive-detail-tabs'
import { AutoOpenInspectionDialog } from '@/components/hives/auto-open-inspection-dialog'
import { AddHarvestDialog } from '@/components/harvests/add-harvest-dialog'
import { Button } from '@/components/ui/button'
import type { Hive, Location, InspectionWithPhotos, InspectionWithPhotosAndUrls, Harvest } from '@/lib/types'

export default async function HiveDetailPage({ params }: { params: Promise<{ hiveId: string }> }) {
  const { hiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: hiveRaw } = await (supabase.from('hives').select('*').eq('id', hiveId).single() as unknown as Promise<{ data: Hive | null }>)
  if (!hiveRaw) notFound()
  const hive = hiveRaw
  if (!hive.is_public && hive.user_id !== user?.id) notFound()

  const { data: location } = await (supabase.from('locations').select('id, name').eq('id', hive.location_id).single() as unknown as Promise<{ data: Pick<Location, 'id' | 'name'> | null }>)

  const isOwner = user?.id === hive.user_id

  const [{ data: inspectionsRaw }, { data: harvestsRaw }] = await Promise.all([
    supabase.from('inspections').select('*, inspection_photos(*)').eq('hive_id', hive.id).order('inspected_at', { ascending: false }) as unknown as Promise<{ data: InspectionWithPhotos[] | null }>,
    supabase.from('harvests').select('*').eq('hive_id', hive.id).order('harvested_at', { ascending: false }) as unknown as Promise<{ data: Harvest[] | null }>,
  ])

  // Generate signed URLs for all photos in one batch
  const allPaths = (inspectionsRaw ?? []).flatMap(i => (i.inspection_photos ?? []).map(p => p.storage_path))
  const signedUrlMap: Record<string, string> = {}
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('inspection-photos').createSignedUrls(allPaths, 3600)
    for (const entry of signed ?? []) {
      if (entry.path) signedUrlMap[entry.path] = entry.signedUrl
    }
  }

  const inspections: InspectionWithPhotosAndUrls[] = (inspectionsRaw ?? []).map(i => ({
    ...i,
    inspection_photos: (i.inspection_photos ?? []).map(p => ({
      ...p,
      signedUrl: signedUrlMap[p.storage_path] ?? '',
    })),
  }))

  const harvests = harvestsRaw ?? []
  const totalHarvestKg = harvests.reduce((sum, h) => sum + Number(h.weight_kg), 0)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground font-semibold">
        <Link href="/hives" className="hover:text-amber-700 transition-colors">Hives</Link>
        {location && (
          <>
            <ChevronRight size={14} />
            <span>{location.name}</span>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-amber-700">{hive.name}</span>
      </nav>
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-amber-800">{hive.name}</h1>
          <p className="text-sm text-amber-700/70 font-semibold capitalize mt-0.5">
            {hive.status}{hive.species ? ` \u00b7 ${hive.species}` : ''}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <AutoOpenInspectionDialog hiveId={hive.id} />
            <AddHarvestDialog hiveId={hive.id} />
          </div>
        )}
      </div>
      <HiveDetailTabs
        inspections={inspections}
        harvests={harvests}
        hiveId={hive.id}
        totalHarvestKg={totalHarvestKg}
        isOwner={isOwner}
      />
    </div>
  )
}
