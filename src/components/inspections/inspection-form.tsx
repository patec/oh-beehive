'use client'
import { useState, useActionState, useEffect } from 'react'
import { createInspection, updateInspection } from '@/lib/actions/inspections'
import { FieldSelect } from './field-select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Inspection } from '@/lib/types'

type ActionState = { error?: string } | undefined

type Props = { hiveId: string; inspection?: Inspection; onSuccess?: () => void }

export function InspectionForm({ hiveId, inspection, onSuccess }: Props) {
  const action = inspection
    ? (updateInspection as (state: ActionState, formData: FormData) => Promise<ActionState>)
    : (createInspection as (state: ActionState, formData: FormData) => Promise<ActionState>)
  const [state, formAction, pending] = useActionState(action, undefined)
  const [addReminder, setAddReminder] = useState(false)
  const [queenSeen, setQueenSeen] = useState<boolean | null>(inspection?.queen_seen ?? null)
  const [broodPattern, setBroodPattern] = useState<string | null>(inspection?.brood_pattern ?? null)
  const [population, setPopulation] = useState<string | null>(inspection?.population ?? null)
  const [temperament, setTemperament] = useState<string | null>(inspection?.temperament ?? null)
  const [honeyStores, setHoneyStores] = useState<string | null>(inspection?.honey_stores ?? null)

  useEffect(() => {
    if (state !== undefined && !state?.error && !pending) onSuccess?.()
  }, [state, pending, onSuccess])

  return (
    <form action={formAction} className="space-y-5 pb-20 md:pb-0">
      <input type="hidden" name="hive_id" value={hiveId} />
      {inspection && <input type="hidden" name="id" value={inspection.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="space-y-2">
        <Label>Date &amp; Time</Label>
        <Input type="datetime-local" name="inspected_at"
          defaultValue={inspection?.inspected_at
            ? new Date(inspection.inspected_at).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16)} />
      </div>

      <div className="space-y-2">
        <Label>Queen seen?</Label>
        <input type="hidden" name="queen_seen" value={queenSeen === null ? '' : String(queenSeen)} />
        <div className="flex gap-2">
          {([true, false] as const).map(v => (
            <button key={String(v)} type="button"
              onClick={() => setQueenSeen(queenSeen === v ? null : v)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${queenSeen === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'}`}>
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <FieldSelect name="brood_pattern" label="Brood pattern" options={['good', 'fair', 'poor']} value={broodPattern} onChange={v => setBroodPattern(v)} />
      <FieldSelect name="population" label="Population" options={['strong', 'medium', 'weak']} value={population} onChange={v => setPopulation(v)} />
      <FieldSelect name="temperament" label="Temperament" options={['calm', 'moderate', 'aggressive']} value={temperament} onChange={v => setTemperament(v)} />
      <FieldSelect name="honey_stores" label="Honey stores" options={['full', 'partial', 'low']} value={honeyStores} onChange={v => setHoneyStores(v)} />

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={inspection?.notes ?? ''} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_action">Next action</Label>
        <Input id="next_action" name="next_action" defaultValue={inspection?.next_action ?? ''} />
      </div>

      <div className="space-y-2">
        <Label>Photos (max 5, 5 MB each)</Label>
        <Input type="file" name="photos" accept="image/jpeg,image/png,image/heic" multiple />
        {inspection && (
          <p className="text-xs text-muted-foreground">
            Upload new photos to add them. To remove existing photos, use the delete button on each photo below.
          </p>
        )}
      </div>

      <div className="space-y-2 border rounded-xl p-3 bg-amber-50/50">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="add_reminder"
            checked={addReminder}
            onChange={e => setAddReminder(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="add_reminder" className="cursor-pointer">Schedule a follow-up reminder</Label>
        </div>
        {addReminder && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="reminder_title">Reminder title</Label>
              <Input id="reminder_title" name="reminder_title" placeholder="e.g. Check queen cells" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reminder_due_date">Due date</Label>
              <Input id="reminder_due_date" name="reminder_due_date" type="date"
                defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)} />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving\u2026' : 'Save inspection'}
      </Button>
    </form>
  )
}
