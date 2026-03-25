'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HiveForm } from './hive-form'

export function AddHiveDialog({ locationId }: { locationId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1" />}>
        <Plus size={14} /> Add hive
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New hive</DialogTitle></DialogHeader>
        <HiveForm locationId={locationId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
