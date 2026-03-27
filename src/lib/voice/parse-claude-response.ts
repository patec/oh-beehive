import type { ParsedInspection } from '@/lib/types'

export function parseClaudeResponse(rawText: string): ParsedInspection[] {
  const stripped = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed: unknown = JSON.parse(stripped)
  if (!Array.isArray(parsed)) {
    throw new Error(`Claude returned a non-array response: ${typeof parsed}`)
  }
  return parsed as ParsedInspection[]
}
