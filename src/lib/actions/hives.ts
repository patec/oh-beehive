'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createHive(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const locationId = formData.get('location_id') as string | null
  const name = formData.get('name') as string | null
  if (!locationId) return { error: 'location_id required' }
  if (!name) return { error: 'name required' }

  const { error } = await supabase.from('hives').insert({
    location_id: locationId,
    user_id: user.id,
    name,
    species: (formData.get('species') as string) || null,
    installed_at: (formData.get('installed_at') as string) || null,
    is_public: formData.get('is_public') === 'true',
  } as any)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function updateHive(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string | null
  if (!id) return { error: 'id required' }

  const table = supabase.from('hives') as any
  const { error } = await table.update({
    name: formData.get('name') as string,
    species: (formData.get('species') as string) || null,
    installed_at: (formData.get('installed_at') as string) || null,
    is_public: formData.get('is_public') === 'true',
    status: formData.get('status') as string,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath(`/hives/${id}`)
  return {}
}

export async function deleteHive(hiveId: string) {
  const supabase = await createClient()

  // Fetch photo storage paths before cascade delete removes the DB rows
  // Cast through any to work around narrow Insert types on the generated DB schema
  const photoTable = supabase.from('inspection_photos') as any
  const { data: photos } = await photoTable
    .select('storage_path')
    .in(
      'inspection_id',
      (supabase.from('inspections').select('id').eq('hive_id', hiveId)) as any
    )

  if (photos?.length) {
    const { error: storageError } = await supabase.storage
      .from('inspection-photos')
      .remove((photos as Array<{ storage_path: string }>).map(p => p.storage_path))
    if (storageError) return { error: storageError.message }
  }

  const { error } = await supabase.from('hives').delete().eq('id', hiveId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
}
