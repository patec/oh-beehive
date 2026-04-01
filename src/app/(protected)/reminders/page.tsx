import { createClient } from '@/lib/supabase/server'
import { ReminderCard } from '@/components/reminders/reminder-card'
import { AddReminderDialog } from '@/components/reminders/add-reminder-dialog'
import type { Reminder } from '@/lib/types'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await (supabase.from('reminders') as any)
    .select('*')
    .eq('user_id', user!.id)
    .order('due_date', { ascending: true }) as { data: Reminder[] | null }

  const reminders = data ?? []
  const upcoming = reminders.filter(r => !r.completed)
  const completed = reminders.filter(r => r.completed)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {upcoming.length > 0 ? `${upcoming.length} upcoming` : 'No upcoming reminders'}
          </p>
        </div>
        <AddReminderDialog />
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Upcoming</h2>
          {upcoming.map(r => <ReminderCard key={r.id} reminder={r} />)}
        </div>
      )}

      {upcoming.length === 0 && (
        <p className="text-sm text-muted-foreground border rounded-lg border-dashed px-4 py-8 text-center">
          No upcoming reminders. Add one to stay on top of your hives.
        </p>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Completed</h2>
          {completed.map(r => <ReminderCard key={r.id} reminder={r} />)}
        </div>
      )}
    </div>
  )
}
