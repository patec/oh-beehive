import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { parseClaudeResponse } from '@/lib/voice/parse-claude-response'
import type { Hive } from '@/lib/types'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json() as { sessionId: string }

  const { data: session } = await (supabase
    .from('voice_sessions')
    .select('id, audio_path')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single() as unknown as Promise<{ data: { id: string; audio_path: string } | null }>)

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  console.log('[voice/process] start sessionId=%s userId=%s audioPath=%s', sessionId, user.id, session.audio_path)

  try {
    // 1. Get signed URL and download audio
    const { data: urlData } = await supabase.storage
      .from('voice-recordings')
      .createSignedUrl(session.audio_path, 300)
    if (!urlData?.signedUrl) throw new Error('Could not get audio URL')

    const audioResponse = await fetch(urlData.signedUrl)
    if (!audioResponse.ok) throw new Error('Could not download audio')
    const audioBuffer = await audioResponse.arrayBuffer()

    const ext = session.audio_path.split('.').pop() ?? 'webm'
    const mimeMap: Record<string, string> = {
      webm: 'audio/webm',
      mp4: 'audio/mp4',
      m4a: 'audio/x-m4a',
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
    }
    const mimeType = mimeMap[ext] ?? 'audio/webm'
    console.log('[voice/process] audio downloaded ext=%s mimeType=%s bytes=%d', ext, mimeType, audioBuffer.byteLength)
    const audioFile = new File([audioBuffer], `recording.${ext}`, { type: mimeType })

    // 2. Transcribe with Whisper
    console.log('[voice/process] sending to Whisper')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })
    const transcript = transcription.text
    console.log('[voice/process] transcript chars=%d text=%s', transcript.length, transcript)

    await (supabase
      .from('voice_sessions')
      .update({ transcript } as never)
      .eq('id', sessionId) as unknown as Promise<unknown>)

    // 3. Fetch user's active hives for Claude context
    const { data: hives } = await (supabase
      .from('hives')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'active') as unknown as Promise<{ data: Pick<Hive, 'id' | 'name'>[] | null }>)

    const hiveList = (hives ?? [])
      .map(h => `{"id":"${h.id}","name":"${h.name}"}`)
      .join(', ')
    console.log('[voice/process] hives found=%d list=%s', (hives ?? []).length, hiveList)

    // 4. Parse with Claude
    console.log('[voice/process] sending to Claude model=claude-haiku-4-5-20251001')
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are parsing a beekeeper's voice notes from an apiary walkthrough.

The beekeeper's active hives are: [${hiveList}]

Parse the transcript and return a JSON array — one object per hive or location mentioned.
IMPORTANT: Always return at least one object if the transcript contains any apiary observations, even if the hive list is empty or no names match. Never return an empty array when the beekeeper has described observations.
Each object must have exactly these fields:
{
  "hiveId": "<matching id from the hive list, or null if unrecognised>",
  "hiveName": "<name as spoken, or 'Unknown hive' if no name given>",
  "transcriptExcerpt": "<the relevant portion of transcript for this hive>",
  "queen_seen": <true|false|null>,
  "brood_pattern": <"good"|"fair"|"poor"|null>,
  "population": <"strong"|"medium"|"weak"|null>,
  "temperament": <"calm"|"moderate"|"aggressive"|null>,
  "honey_stores": <"full"|"partial"|"low"|null>,
  "notes": "<free text observations, or null>",
  "next_action": "<action to take next visit, or null>"
}

Match hive names fuzzily. If a segment cannot be matched to a known hive, set hiveId to null.
Return ONLY a valid JSON array — no markdown fences, no explanation.`,
      messages: [{ role: 'user', content: transcript }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    console.log('[voice/process] claude raw response=%s', rawText)
    const parsed = parseClaudeResponse(rawText)
    console.log('[voice/process] parsed segments=%d', parsed.length)

    await (supabase
      .from('voice_sessions')
      .update({ parsed_data: parsed as unknown as Record<string, unknown>[], status: 'review' } as never)
      .eq('id', sessionId) as unknown as Promise<unknown>)

    console.log('[voice/process] complete sessionId=%s segments=%d', sessionId, parsed.length)
    return NextResponse.json({ status: 'review', sessionId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing failed'
    console.error('[voice/process] error sessionId=%s error=%s', sessionId, msg, err)
    await (supabase
      .from('voice_sessions')
      .update({ status: 'failed', error: msg } as never)
      .eq('id', sessionId) as unknown as Promise<unknown>)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
