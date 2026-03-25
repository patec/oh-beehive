'use client'
import { useState } from 'react'
import { deleteHarvest } from '@/lib/actions/harvests'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Harvest } from '@/lib/types'
import { HarvestForm } from './harvest-form'

export function HarvestCard({ harvest, hiveId, isOwner }: { harvest: Harvest; hiveId: string; isOwner: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-medium">{Number(harvest.weight_kg).toFixed(3)} kg</p>
        <p className="text-sm text-muted-foreground">
          {new Date(harvest.harvested_at + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>
        {harvest.notes && <p className="text-sm mt-1">{harvest.notes}</p>}
      </div>
      {isOwner && (
        <div className="flex gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button variant="ghost" size="sm" />}>Edit</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit harvest</DialogTitle></DialogHeader>
              <HarvestForm hiveId={hiveId} harvest={harvest} onSuccess={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <form action={deleteHarvest.bind(null, harvest.id, hiveId) as unknown as (formData: FormData) => void}>
            <Button variant="ghost" size="sm" type="submit">Delete</Button>
          </form>
        </div>
      )}
    </div>
  )
}
