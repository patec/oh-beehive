'use client'
import { completeReminder, deleteReminder } from '@/lib/actions/reminders'
import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
import type { Reminder } from '@/lib/types'

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const overdue = !reminder.completed && reminder.due_date < new Date().toISOString().slice(0, 10)

  return (
    <div className={`flex items-center justify-between p-4 border rounded-xl ${reminder.completed ? 'bg-muted opacity-60' : overdue ? 'border-red-300 bg-red-50' : 'bg-card'}`}>
      <div className="space-y-0.5 min-w-0">
        <p className={`font-medium text-sm ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
          {reminder.title}
        </p>
        <p className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
          {overdue ? 'Overdue · ' : ''}{reminder.due_date}
        </p>
      </div>
      {!reminder.completed && (
        <div className="flex gap-1 flex-shrink-0">
          <form action={completeReminder.bind(null, reminder.id)}>
            <Button type="submit" size="sm" variant="ghost" title="Mark complete">
              <Check size={16} className="text-green-600" />
            </Button>
          </form>
          <form action={deleteReminder.bind(null, reminder.id)}>
            <Button type="submit" size="sm" variant="ghost" title="Delete">
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
