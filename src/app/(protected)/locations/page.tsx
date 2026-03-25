import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/locations/location-form'
import { LocationListItem } from '@/components/locations/location-list-item'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import type { Location } from '@/lib/types'

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*').order('created_at')

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Locations</h1>
        <Dialog>
          <DialogTrigger render={<Button size="sm" />}>Add location</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New location</DialogTitle></DialogHeader>
            <LocationForm />
          </DialogContent>
        </Dialog>
      </div>
      <ul className="space-y-2">
        {(locations as Location[] | null)?.map(loc => (
          <LocationListItem key={loc.id} location={loc} />
        ))}
      </ul>
    </div>
  )
}
