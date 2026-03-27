'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { LocationForm } from './location-form'

export function AddLocationDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Add location</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New location</DialogTitle></DialogHeader>
        <LocationForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
