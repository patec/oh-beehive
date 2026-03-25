'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InspectionCard } from '@/components/inspections/inspection-card'
import { HarvestCard } from '@/components/harvests/harvest-card'
import type { InspectionWithPhotosAndUrls, Harvest } from '@/lib/types'

type Props = {
  inspections: InspectionWithPhotosAndUrls[]
  harvests: Harvest[]
  hiveId: string
  totalHarvestKg: number
  isOwner: boolean
}

export function HiveDetailTabs({ inspections, harvests, hiveId, totalHarvestKg, isOwner }: Props) {
  return (
    <Tabs defaultValue="inspections" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="inspections" className="flex-1">Inspections ({inspections.length})</TabsTrigger>
        <TabsTrigger value="harvests" className="flex-1">Harvests ({harvests.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="inspections" className="space-y-3 mt-4">
        {inspections.map(i => <InspectionCard key={i.id} inspection={i} hiveId={hiveId} isOwner={isOwner} />)}
        {!inspections.length && <p className="text-muted-foreground text-sm">No inspections yet.</p>}
      </TabsContent>
      <TabsContent value="harvests" className="space-y-3 mt-4">
        {totalHarvestKg > 0 && (
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm font-medium">Total harvested: {totalHarvestKg.toFixed(3)} kg</p>
          </div>
        )}
        {harvests.map(h => <HarvestCard key={h.id} harvest={h} hiveId={hiveId} isOwner={isOwner} />)}
        {!harvests.length && <p className="text-muted-foreground text-sm">No harvests recorded yet.</p>}
      </TabsContent>
    </Tabs>
  )
}
