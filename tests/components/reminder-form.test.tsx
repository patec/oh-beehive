import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ReminderForm } from '@/components/reminders/reminder-form'

vi.mock('@/lib/actions/reminders', () => ({
  createReminder: vi.fn(),
}))

describe('ReminderForm', () => {
  it('renders title and due date fields', () => {
    render(<ReminderForm />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('accepts an optional hiveId hidden field', () => {
    const { container } = render(<ReminderForm hiveId="hive-123" />)
    const hidden = container.querySelector('input[name="hive_id"]') as HTMLInputElement | null
    expect(hidden?.value).toBe('hive-123')
  })
})
