'use client'
import { useActionState, useEffect } from 'react'
import { createReminder } from '@/lib/actions/reminders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error?: string } | undefined

export function ReminderForm({
  hiveId,
  onSuccess,
}: {
  hiveId?: string
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState(
    createReminder as (state: ActionState, formData: FormData) => Promise<ActionState>,
    undefined,
  )

  useEffect(() => {
    if (state !== undefined && !state?.error && !pending) onSuccess?.()
  }, [state, pending, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {hiveId && <input type="hidden" name="hive_id" value={hiveId} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="reminder_title">Title</Label>
        <Input id="reminder_title" name="reminder_title" required placeholder="e.g. Check queen cells" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reminder_due_date">Due date</Label>
        <Input id="reminder_due_date" name="reminder_due_date" type="date" required
          defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save reminder'}</Button>
    </form>
  )
}
