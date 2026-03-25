'use client'
import { useActionState, useEffect } from 'react'
import { createLocation, updateLocation } from '@/lib/actions/locations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Location } from '@/lib/types'

type ActionState = { error?: string } | undefined

export function LocationForm({ location, onSuccess }: { location?: Location; onSuccess?: () => void }) {
  const action = location
    ? (updateLocation as (state: ActionState, formData: FormData) => Promise<ActionState>)
    : (createLocation as (state: ActionState, formData: FormData) => Promise<ActionState>)
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    // state is {} (no error) after a successful submission
    if (state !== undefined && !state?.error && !pending) onSuccess?.()
  }, [state, pending, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {location && <input type="hidden" name="id" value={location.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={location?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={location?.description ?? ''} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
    </form>
  )
}
