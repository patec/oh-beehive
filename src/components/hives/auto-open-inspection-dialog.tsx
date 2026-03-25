'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InspectionForm } from '@/components/inspections/inspection-form'

export function AutoOpenInspectionDialog({ hiveId }: { hiveId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('add_inspection') === '1') {
      setOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('add_inspection')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    }
  }, [searchParams, router, pathname])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Inspection</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New inspection</DialogTitle></DialogHeader>
        <InspectionForm hiveId={hiveId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
