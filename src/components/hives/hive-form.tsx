'use client'
import { useActionState, useEffect } from 'react'
import { createHive, updateHive } from '@/lib/actions/hives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Hive } from '@/lib/types'

type ActionState = { error?: string } | undefined

export function HiveForm({ locationId, hive, onSuccess }: { locationId?: string; hive?: Hive; onSuccess?: () => void }) {
  const action = hive
    ? (updateHive as (state: ActionState, formData: FormData) => Promise<ActionState>)
    : (createHive as (state: ActionState, formData: FormData) => Promise<ActionState>)
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state !== undefined && !state?.error && !pending) onSuccess?.()
  }, [state, pending, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {locationId && <input type="hidden" name="location_id" value={locationId} />}
      {hive && <input type="hidden" name="id" value={hive.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={hive?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="species">Species (optional)</Label>
        <Input id="species" name="species" defaultValue={hive?.species ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="installed_at">Installation date (optional)</Label>
        <Input id="installed_at" name="installed_at" type="date" defaultValue={hive?.installed_at ?? ''} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_public" name="is_public" value="true"
          defaultChecked={hive?.is_public ?? false} className="rounded" />
        <Label htmlFor="is_public">Make hive public</Label>
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving\u2026' : 'Save'}</Button>
    </form>
  )
}
