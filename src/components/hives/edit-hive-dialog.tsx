'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HiveForm } from '@/components/hives/hive-form'
import type { Hive } from '@/lib/types'

export function EditHiveDialog({ hive }: { hive: Hive }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm"><Pencil size={16} />Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit hive</DialogTitle>
        </DialogHeader>
        <HiveForm hive={hive} locationId={hive.location_id} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
