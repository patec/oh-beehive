'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ReminderForm } from './reminder-form'

export function AddReminderDialog({ hiveId }: { hiveId?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Reminder</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New reminder</DialogTitle></DialogHeader>
        <ReminderForm hiveId={hiveId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
