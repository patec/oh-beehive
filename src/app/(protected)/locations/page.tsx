import { createClient } from '@/lib/supabase/server'
import { LocationListItem } from '@/components/locations/location-list-item'
import { AddLocationDialog } from '@/components/locations/add-location-dialog'
import type { Location } from '@/lib/types'

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*').order('created_at')

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Locations</h1>
        <AddLocationDialog />
      </div>
      <ul className="space-y-2">
        {(locations as Location[] | null)?.map(loc => (
          <LocationListItem key={loc.id} location={loc} />
        ))}
      </ul>
    </div>
  )
}
