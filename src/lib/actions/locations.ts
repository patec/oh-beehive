'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLocation(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string | null
  if (!name) return { error: 'Name is required.' }

  const { error } = await supabase.from('locations').insert({
    user_id: user.id,
    name,
    description: (formData.get('description') as string) || null,
  } as any)
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
  return {}
}

export async function updateLocation(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string | null
  const name = formData.get('name') as string | null
  if (!id || !name) return { error: 'ID and name are required.' }

  // Cast through unknown to bypass the Never insert type — user_id is set by RLS
  const table = supabase.from('locations') as any
  const { error } = await table
    .update({
      name,
      description: (formData.get('description') as string) || null,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteLocation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
}
