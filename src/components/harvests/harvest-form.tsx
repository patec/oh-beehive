'use client'
import { useActionState, useEffect } from 'react'
import { createHarvest, updateHarvest } from '@/lib/actions/harvests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Harvest } from '@/lib/types'

type ActionState = { error?: string } | undefined

export function HarvestForm({ hiveId, harvest, onSuccess }: { hiveId: string; harvest?: Harvest; onSuccess?: () => void }) {
  const action = harvest
    ? (updateHarvest as (state: ActionState, formData: FormData) => Promise<ActionState>)
    : (createHarvest as (state: ActionState, formData: FormData) => Promise<ActionState>)
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state !== undefined && !state?.error && !pending) onSuccess?.()
  }, [state, pending, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="hive_id" value={hiveId} />
      {harvest && <input type="hidden" name="id" value={harvest.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="weight_kg">Weight (kg)</Label>
        <Input id="weight_kg" name="weight_kg" type="number" step="0.001" min="0.001"
          defaultValue={harvest?.weight_kg ?? ''} required placeholder="e.g. 2.450" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="harvested_at">Date</Label>
        <Input id="harvested_at" name="harvested_at" type="date"
          defaultValue={harvest?.harvested_at ?? new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={harvest?.notes ?? ''} rows={2} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving\u2026' : 'Save harvest'}</Button>
    </form>
  )
}
