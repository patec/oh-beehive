'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OVERDUE_DAYS = 14
const DEDUP_HOURS = 24

export async function triggerOverdueNotifications(userId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Get all active hives for this user
  const hivesTable = supabase.from('hives') as any
  const { data: hives } = await hivesTable
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active') as { data: Array<{ id: string; name: string }> | null }

  if (!hives?.length) return

  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86400000).toISOString()
  const dedupCutoff = new Date(Date.now() - DEDUP_HOURS * 3600000).toISOString()

  for (const hive of hives) {
    // Check last inspection date
    const inspectionsTable = supabase.from('inspections') as any
    const { data: lastInspection } = await inspectionsTable
      .select('inspected_at')
      .eq('hive_id', hive.id)
      .order('inspected_at', { ascending: false })
      .limit(1)
      .single() as { data: { inspected_at: string } | null }

    const isOverdue = !lastInspection || lastInspection.inspected_at < cutoff
    if (!isOverdue) continue

    // Dedup: don't create another notification if one already exists in past 24h
    const notificationsTable = supabase.from('notifications') as any
    const { data: existing } = await notificationsTable
      .select('id')
      .eq('hive_id', hive.id)
      .eq('type', 'overdue_inspection')
      .gte('created_at', dedupCutoff)
      .limit(1)
      .single() as { data: { id: string } | null }

    if (existing) continue

    // Use admin client to insert notification (bypasses RLS)
    await (admin.from('notifications') as any).insert({
      user_id: userId,
      hive_id: hive.id,
      type: 'overdue_inspection',
      message: `${hive.name} hasn't been inspected in ${OVERDUE_DAYS}+ days.`,
    })
  }
}

export async function triggerReminderNotifications(userId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const dedupCutoff = new Date(Date.now() - DEDUP_HOURS * 3600000).toISOString()

  const { data: dueReminders } = await (supabase.from('reminders') as any)
    .select('id, hive_id, title')
    .eq('user_id', userId)
    .eq('completed', false)
    .lte('due_date', today) as { data: Array<{ id: string; hive_id: string | null; title: string }> | null }

  for (const reminder of dueReminders ?? []) {
    const { data: existing } = await (supabase.from('notifications') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'reminder_due')
      .eq('message', `Reminder: ${reminder.title}`)
      .gte('created_at', dedupCutoff)
      .limit(1)
      .single() as { data: { id: string } | null }

    if (existing) continue

    await (admin.from('notifications') as any).insert({
      user_id: userId,
      hive_id: reminder.hive_id,
      type: 'reminder_due',
      message: `Reminder: ${reminder.title}`,
    })
  }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  await (supabase.from('notifications') as any).update({ read: true }).eq('id', id)
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('notifications') as any)
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
  revalidatePath('/notifications')
}
