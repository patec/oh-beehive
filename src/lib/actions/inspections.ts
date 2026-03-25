'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInspection(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const hiveId = formData.get('hive_id') as string | null
  if (!hiveId) return { error: 'hive_id required' }

  const { data: inspection, error } = await (supabase.from('inspections') as any).insert({
    hive_id: hiveId,
    user_id: user.id,
    inspected_at: (formData.get('inspected_at') as string) || new Date().toISOString(),
    queen_seen: formData.get('queen_seen') ? formData.get('queen_seen') === 'true' : null,
    brood_pattern: (formData.get('brood_pattern') as string) || null,
    population: (formData.get('population') as string) || null,
    temperament: (formData.get('temperament') as string) || null,
    honey_stores: (formData.get('honey_stores') as string) || null,
    notes: (formData.get('notes') as string) || null,
    next_action: (formData.get('next_action') as string) || null,
  }).select().single()

  if (error) return { error: error.message }

  // Upload photos (max 5, max 5 MB each, JPEG/PNG/HEIC only)
  const photos = formData.getAll('photos') as File[]
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic']
  const validPhotos = photos.filter(f => f.size > 0 && f.size <= 5 * 1024 * 1024 && allowedTypes.includes(f.type))
  if (validPhotos.length > 5) return { error: 'Maximum 5 photos per inspection' }

  for (const photo of validPhotos) {
    const path = `${user.id}/${inspection.id}/${crypto.randomUUID()}`
    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, photo)
    if (uploadError) continue
    await (supabase.from('inspection_photos') as any).insert({
      inspection_id: inspection.id,
      user_id: user.id,
      storage_path: path,
    })
  }

  revalidatePath(`/hives/${hiveId}`)
  const skippedCount = photos.filter(f => f.size > 0).length - validPhotos.length
  return skippedCount > 0 ? { warning: `${skippedCount} photo(s) were skipped (must be JPEG/PNG/HEIC, max 5 MB each).` } : {}
}

export async function updateInspection(_: { error?: string }, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string | null
  if (!id) return { error: 'id required' }

  const { data: existing } = await (supabase.from('inspections') as any).select('hive_id').eq('id', id).single()

  const { error } = await (supabase.from('inspections') as any).update({
    inspected_at: formData.get('inspected_at') as string,
    queen_seen: formData.get('queen_seen') ? formData.get('queen_seen') === 'true' : null,
    brood_pattern: (formData.get('brood_pattern') as string) || null,
    population: (formData.get('population') as string) || null,
    temperament: (formData.get('temperament') as string) || null,
    honey_stores: (formData.get('honey_stores') as string) || null,
    notes: (formData.get('notes') as string) || null,
    next_action: (formData.get('next_action') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  // Upload any new photos added during edit
  const photos = formData.getAll('photos') as File[]
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic']
  const validPhotos = photos.filter(f => f.size > 0 && f.size <= 5 * 1024 * 1024 && allowedTypes.includes(f.type))
  const { count: existingCount } = await (supabase
    .from('inspection_photos') as any).select('*', { count: 'exact', head: true }).eq('inspection_id', id)
  if ((existingCount ?? 0) + validPhotos.length > 5) return { error: 'Maximum 5 photos per inspection' }

  for (const photo of validPhotos) {
    const path = `${user.id}/${id}/${crypto.randomUUID()}`
    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, photo)
    if (uploadError) continue
    await (supabase.from('inspection_photos') as any).insert({
      inspection_id: id,
      user_id: user.id,
      storage_path: path,
    })
  }

  if (existing) revalidatePath(`/hives/${existing.hive_id}`)
  const skippedCount = photos.filter(f => f.size > 0).length - validPhotos.length
  return skippedCount > 0 ? { warning: `${skippedCount} photo(s) were skipped (must be JPEG/PNG/HEIC, max 5 MB each).` } : {}
}

export async function deleteInspection(inspectionId: string, hiveId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: photos } = await (supabase.from('inspection_photos') as any).select('storage_path').eq('inspection_id', inspectionId)
  if (photos?.length) {
    const paths = (photos as Array<{ storage_path: string }>).map(p => p.storage_path)
    const { error: storageError } = await supabase.storage.from('inspection-photos').remove(paths)
    if (storageError) return { error: storageError.message }
  }

  const { error } = await supabase.from('inspections').delete().eq('id', inspectionId)
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
}

export async function deleteInspectionPhoto(photoId: string, storagePath: string, hiveId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Delete DB row first — an orphaned DB row pointing at a missing file is worse than
  // an unreferenced storage object.
  const { error } = await supabase.from('inspection_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }

  // Best-effort storage cleanup; failure leaves an unreferenced object, which is acceptable.
  await supabase.storage.from('inspection-photos').remove([storagePath])
  revalidatePath(`/hives/${hiveId}`)
  return {}
}
