'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Hive, Location } from '@/lib/types'

type HiveWithLocation = Hive & { locations: Pick<Location, 'name'> }

export function HivePickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [hives, setHives] = useState<HiveWithLocation[]>([])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('hives').select('*, locations(name)').eq('status', 'active')
      .then(({ data }) => setHives((data as any) ?? []))
  }, [open])

  const grouped = hives.reduce<Record<string, HiveWithLocation[]>>((acc, h) => {
    const loc = h.locations?.name ?? 'Unknown'
    acc[loc] = [...(acc[loc] ?? []), h]
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Select a hive</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(grouped).map(([loc, hs]) => (
            <div key={loc}>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{loc}</p>
              {hs.map(h => (
                <button key={h.id} className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
                  onClick={() => { onClose(); router.push(`/hives/${h.id}?add_inspection=1`) }}>
                  {h.name}
                </button>
              ))}
            </div>
          ))}
          {!hives.length && <p className="text-sm text-muted-foreground">No active hives found.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
