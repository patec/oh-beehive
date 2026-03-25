'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ParsedInspection, VoiceSession, VoiceSessionInsert, InspectionInsert } from '@/lib/types'

export async function createVoiceSession(
  audioPath: string,
  durationSeconds: number | null,
): Promise<{ sessionId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const insert: VoiceSessionInsert = {
    user_id: user.id,
    audio_path: audioPath,
    duration_seconds: durationSeconds,
  }
  const { data, error } = await (supabase
    .from('voice_sessions')
    .insert(insert as never)
    .select('id')
    .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>)

  if (error || !data) return { error: 'Failed to create session' }
  return { sessionId: data.id }
}

export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase
    .from('voice_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single() as unknown as Promise<{ data: VoiceSession | null }>)

  return data
}

export async function getVoiceSessionAudioUrl(audioPath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('voice-recordings')
    .createSignedUrl(audioPath, 3600)
  return data?.signedUrl ?? null
}

export async function saveVoiceSession(
  sessionId: string,
  inspections: ParsedInspection[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: session } = await (supabase
    .from('voice_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single() as unknown as Promise<{ data: { id: string } | null }>)

  if (!session) return { error: 'Session not found' }

  const rows: InspectionInsert[] = inspections
    .filter(i => i.hiveId !== null)
    .map(i => ({
      hive_id: i.hiveId!,
      queen_seen: i.queen_seen ?? undefined,
      brood_pattern: i.brood_pattern ?? undefined,
      population: i.population ?? undefined,
      temperament: i.temperament ?? undefined,
      honey_stores: i.honey_stores ?? undefined,
      notes: i.notes ?? undefined,
      next_action: i.next_action ?? undefined,
    }))

  if (rows.length > 0) {
    const { error } = await (supabase.from('inspections').insert(rows as never) as unknown as Promise<{ error: unknown }>)
    if (error) return { error: 'Failed to save inspections' }
  }

  await (supabase
    .from('voice_sessions')
    .update({ status: 'saved' } as never)
    .eq('id', sessionId) as unknown as Promise<unknown>)

  revalidatePath('/hives', 'layout')
  return {}
}
