'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HarvestForm } from './harvest-form'

export function AddHarvestDialog({ hiveId }: { hiveId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>+ Harvest</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log harvest</DialogTitle></DialogHeader>
        <HarvestForm hiveId={hiveId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
