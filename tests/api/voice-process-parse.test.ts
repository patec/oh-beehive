import { describe, it, expect } from 'vitest'
import { parseClaudeResponse } from '@/lib/voice/parse-claude-response'

describe('parseClaudeResponse', () => {
  it('parses a clean JSON array', () => {
    const input = JSON.stringify([{ hiveId: 'abc', hiveName: 'Upper garden' }])
    const result = parseClaudeResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].hiveName).toBe('Upper garden')
  })

  it('strips markdown fences before parsing', () => {
    const input = '```json\n[{"hiveId":null,"hiveName":"Unknown hive"}]\n```'
    const result = parseClaudeResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].hiveName).toBe('Unknown hive')
  })

  it('strips plain markdown fences without language tag', () => {
    const input = '```\n[{"hiveId":null,"hiveName":"Unknown hive"}]\n```'
    const result = parseClaudeResponse(input)
    expect(result).toHaveLength(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseClaudeResponse('not valid json')).toThrow()
  })

  it('throws when Claude returns a JSON object instead of an array', () => {
    expect(() => parseClaudeResponse('{"hiveId":null}')).toThrow('non-array')
  })

  it('throws when Claude returns a JSON string instead of an array', () => {
    expect(() => parseClaudeResponse('"just a string"')).toThrow('non-array')
  })

  it('throws on empty string', () => {
    expect(() => parseClaudeResponse('')).toThrow()
  })

  it('returns an empty array when Claude returns an empty array', () => {
    const result = parseClaudeResponse('[]')
    expect(result).toEqual([])
  })

  it('handles multiple segments', () => {
    const input = JSON.stringify([
      { hiveId: 'abc', hiveName: 'Upper garden' },
      { hiveId: null, hiveName: 'South end' },
    ])
    const result = parseClaudeResponse(input)
    expect(result).toHaveLength(2)
    expect(result[1].hiveId).toBeNull()
  })
})
