'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseReminderFields } from '@/lib/reminders-helpers'
import type { ReminderInsert } from '@/lib/types'

export async function createReminder(
  _: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const fields = parseReminderFields(formData)
  if (!fields) return { error: 'Title and due date are required' }

  const hiveId = (formData.get('hive_id') as string | null) || null
  const insert: ReminderInsert = { ...fields, hive_id: hiveId }

  const { error } = await (supabase.from('reminders') as any).insert({
    ...insert,
    user_id: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/reminders')
  return {}
}

export async function createReminderForHive(
  hiveId: string,
  userId: string,
  title: string,
  due_date: string,
): Promise<void> {
  const supabase = await createClient()
  await (supabase.from('reminders') as any).insert({
    user_id: userId,
    hive_id: hiveId,
    title,
    due_date,
  })
}

export async function completeReminder(id: string) {
  const supabase = await createClient()
  await (supabase.from('reminders') as any)
    .update({ completed: true })
    .eq('id', id)
  revalidatePath('/reminders')
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  await (supabase.from('reminders') as any).delete().eq('id', id)
  revalidatePath('/reminders')
}
