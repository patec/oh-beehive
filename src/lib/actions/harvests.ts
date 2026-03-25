'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createHarvest(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const hiveId = formData.get('hive_id') as string | null
  if (!hiveId) return { error: 'hive_id required' }

  const weightKg = parseFloat(formData.get('weight_kg') as string)
  if (isNaN(weightKg) || weightKg <= 0) return { error: 'Weight must be a positive number' }

  const { error } = await (supabase.from('harvests') as any).insert({
    hive_id: hiveId,
    user_id: user.id,
    weight_kg: weightKg,
    harvested_at: (formData.get('harvested_at') as string) || new Date().toISOString().slice(0, 10),
    notes: (formData.get('notes') as string) || null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
  return {}
}

export async function updateHarvest(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string | null
  if (!id) return { error: 'id required' }

  const weightKg = parseFloat(formData.get('weight_kg') as string)
  if (isNaN(weightKg) || weightKg <= 0) return { error: 'Weight must be a positive number' }

  const { data: existing } = await (supabase.from('harvests') as any).select('hive_id').eq('id', id).single()
  const { error } = await (supabase.from('harvests') as any).update({
    weight_kg: weightKg,
    harvested_at: formData.get('harvested_at') as string,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  if (existing) revalidatePath(`/hives/${existing.hive_id}`)
  return {}
}

export async function deleteHarvest(harvestId: string, hiveId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('harvests').delete().eq('id', harvestId)
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
}
