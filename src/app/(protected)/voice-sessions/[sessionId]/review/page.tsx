import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVoiceSession, getVoiceSessionAudioUrl } from '@/lib/actions/voice'
import { ReviewClient } from '@/components/voice/review-client'
import type { Hive } from '@/lib/types'

export default async function VoiceSessionReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = await getVoiceSession(sessionId)

  if (!session) notFound()
  if (session.status === 'saved') redirect('/hives')

  if (session.status === 'failed') {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4 pt-20">
        <p className="text-3xl font-black text-red-600">Processing failed</p>
        <p className="text-muted-foreground">{session.error ?? 'Unknown error'}</p>
        <p className="text-sm text-muted-foreground">Try recording again.</p>
      </div>
    )
  }

  if (session.status === 'processing') {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4 pt-20">
        <div className="w-16 h-16 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-2xl font-black text-amber-700">Still processing...</p>
        <p className="text-muted-foreground">Refresh in a moment.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: hivesRaw } = await (supabase
    .from('hives')
    .select('id, name, status')
    .eq('user_id', user!.id)
    .eq('status', 'active') as unknown as Promise<{ data: Pick<Hive, 'id' | 'name' | 'status'>[] | null }>)

  const hives = hivesRaw ?? []
  const audioUrl = await getVoiceSessionAudioUrl(session.audio_path)

  return <ReviewClient session={session} hives={hives} audioUrl={audioUrl} />
}
