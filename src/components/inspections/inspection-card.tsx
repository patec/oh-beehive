'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteInspection } from '@/lib/actions/inspections'
import { InspectionForm } from './inspection-form'
import { PhotoCarousel } from './photo-carousel'
import type { InspectionWithPhotosAndUrls } from '@/lib/types'

export function InspectionCard({ inspection, hiveId, isOwner }: { inspection: InspectionWithPhotosAndUrls; hiveId: string; isOwner: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const fields: [string, string | null][] = [
    ['Queen', inspection.queen_seen === null ? null : inspection.queen_seen ? 'Yes' : 'No'],
    ['Brood', inspection.brood_pattern],
    ['Population', inspection.population],
    ['Temperament', inspection.temperament],
    ['Honey', inspection.honey_stores],
  ]
  const photosWithUrls = (inspection.inspection_photos ?? []).filter(p => p.signedUrl)

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        {new Date(inspection.inspected_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </p>
      <div className="flex flex-wrap gap-2">
        {fields.filter(([, v]) => v !== null).map(([label, value]) => (
          <span key={label} className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {label}: {value}
          </span>
        ))}
      </div>
      {inspection.notes && <p className="text-sm">{inspection.notes}</p>}
      {inspection.next_action && (
        <p className="text-sm text-muted-foreground">Next: {inspection.next_action}</p>
      )}
      {photosWithUrls.length > 0 && <PhotoCarousel photos={photosWithUrls} />}
      {isOwner && (
        <div className="flex gap-1 pt-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button variant="ghost" size="sm" />}>Edit</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit inspection</DialogTitle></DialogHeader>
              <InspectionForm hiveId={hiveId} inspection={inspection} onSuccess={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <form action={deleteInspection.bind(null, inspection.id, hiveId) as unknown as (formData: FormData) => void}>
            <Button variant="ghost" size="sm" type="submit">Delete</Button>
          </form>
        </div>
      )}
    </div>
  )
}
