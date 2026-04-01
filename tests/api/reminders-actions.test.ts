import { describe, it, expect } from 'vitest'
import { parseReminderFields } from '@/lib/actions/reminders'

describe('parseReminderFields', () => {
  it('returns null when title is empty', () => {
    const fd = new FormData()
    fd.set('reminder_title', '')
    fd.set('reminder_due_date', '2026-04-15')
    expect(parseReminderFields(fd)).toBeNull()
  })

  it('returns null when due_date is empty', () => {
    const fd = new FormData()
    fd.set('reminder_title', 'Check queen')
    fd.set('reminder_due_date', '')
    expect(parseReminderFields(fd)).toBeNull()
  })

  it('returns parsed fields when both are present', () => {
    const fd = new FormData()
    fd.set('reminder_title', 'Check queen')
    fd.set('reminder_due_date', '2026-04-15')
    expect(parseReminderFields(fd)).toEqual({ title: 'Check queen', due_date: '2026-04-15' })
  })
})
