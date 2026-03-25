'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteInspection } from '@/lib/actions/inspections'
import { InspectionForm } from './inspection-form'
import { PhotoCarousel } from './photo-carousel'
import type { InspectionWithPhotosAndUrls } from '@/lib/types'

const FIELD_COLOR: Record<string, string> = {
  Queen: 'bg-amber-100 text-amber-800 border border-amber-200',
  Brood: 'bg-orange-100 text-orange-800 border border-orange-200',
  Population: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Temperament: 'bg-lime-100 text-lime-800 border border-lime-200',
  Honey: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
}

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
    <div className="bg-card border rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-amber-700">
          {new Date(inspection.inspected_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>
        {isOwner && (
          <div className="flex gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" />}>Edit</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit inspection</DialogTitle></DialogHeader>
                <InspectionForm hiveId={hiveId} inspection={inspection} onSuccess={() => setEditOpen(false)} />
              </DialogContent>
            </Dialog>
            <form action={deleteInspection.bind(null, inspection.id, hiveId) as unknown as (formData: FormData) => void}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" type="submit">Delete</Button>
            </form>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fields.filter(([, v]) => v !== null).map(([label, value]) => (
          <span key={label} className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${FIELD_COLOR[label] ?? 'bg-secondary text-secondary-foreground'}`}>
            {label}: {value}
          </span>
        ))}
      </div>
      {inspection.notes && (
        <p className="text-sm text-foreground/80 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{inspection.notes}</p>
      )}
      {inspection.next_action && (
        <p className="text-sm text-amber-700 font-medium">Next: {inspection.next_action}</p>
      )}
      {photosWithUrls.length > 0 && <PhotoCarousel photos={photosWithUrls} />}
    </div>
  )
}
