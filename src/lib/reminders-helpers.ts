// Pure helpers for reminder form data — no server dependencies.
export function parseReminderFields(
  formData: FormData,
): { title: string; due_date: string } | null {
  const title = (formData.get('reminder_title') as string | null)?.trim() ?? ''
  const due_date = (formData.get('reminder_due_date') as string | null)?.trim() ?? ''
  if (!title || !due_date) return null
  return { title, due_date }
}
