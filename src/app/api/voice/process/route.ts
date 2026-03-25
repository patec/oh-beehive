import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ParsedInspection, Hive } from '@/lib/types'

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
    const audioFile = new File([audioBuffer], `recording.${ext}`, { type: mimeType })

    // 2. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })
    const transcript = transcription.text

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

    // 4. Parse with Claude
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are parsing a beekeeper's voice notes from an apiary walkthrough.

The beekeeper's active hives are: [${hiveList}]

Parse the transcript and return a JSON array — one object per hive mentioned.
Each object must have exactly these fields:
{
  "hiveId": "<matching id from the hive list, or null if unrecognised>",
  "hiveName": "<name as spoken>",
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

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    let parsed: ParsedInspection[]
    try {
      parsed = JSON.parse(raw) as ParsedInspection[]
      if (!Array.isArray(parsed)) parsed = []
    } catch {
      parsed = []
    }

    await (supabase
      .from('voice_sessions')
      .update({ parsed_data: parsed as unknown as Record<string, unknown>[], status: 'review' } as never)
      .eq('id', sessionId) as unknown as Promise<unknown>)

    return NextResponse.json({ status: 'review', sessionId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing failed'
    await (supabase
      .from('voice_sessions')
      .update({ status: 'failed', error: msg } as never)
      .eq('id', sessionId) as unknown as Promise<unknown>)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
