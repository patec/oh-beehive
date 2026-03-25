import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/locations/location-form'
import { deleteLocation } from '@/lib/actions/locations'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
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
          <li key={loc.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{loc.name}</p>
              {loc.description && <p className="text-sm text-muted-foreground">{loc.description}</p>}
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Delete</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {loc.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all hives, inspections, and harvests at this location.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <form action={deleteLocation.bind(null, loc.id) as unknown as (formData: FormData) => void}>
                    <AlertDialogAction type="submit">Delete</AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </div>
  )
}
