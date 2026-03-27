'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createVoiceSession } from '@/lib/actions/voice'

type Phase = 'idle' | 'recording' | 'uploading' | 'processing' | 'error'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    startRecording()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startTimeRef.current = Date.now()

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(1000)
      setPhase('recording')

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    })

    if (timerRef.current) clearInterval(timerRef.current)
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    const mimeType = recorder.mimeType
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mimeType })

    setPhase('uploading')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const filename = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filename, blob, { contentType: mimeType })
      if (uploadError) throw new Error(uploadError.message)

      const result = await createVoiceSession(filename, duration)
      if ('error' in result) throw new Error(result.error)
      const { sessionId } = result

      setPhase('processing')
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Processing failed')
      }

      router.push(`/voice-sessions/${sessionId}/review`)
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Starting...',
    recording: 'Recording',
    uploading: 'Uploading...',
    processing: 'Transcribing & analysing...',
    error: 'Something went wrong',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <X size={24} />
      </button>

      <div className="flex flex-col items-center gap-8">
        {phase === 'recording' && (
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-red-500 flex items-center justify-center">
              <Mic size={48} />
            </div>
            <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
          </div>
        )}
        {(phase === 'uploading' || phase === 'processing') && (
          <div className="w-28 h-28 rounded-full bg-amber-500 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {phase === 'idle' && (
          <div className="w-28 h-28 rounded-full bg-amber-600 flex items-center justify-center">
            <Mic size={48} />
          </div>
        )}
        {phase === 'error' && (
          <div className="w-28 h-28 rounded-full bg-red-900 flex items-center justify-center text-5xl font-black">!</div>
        )}

        <div className="text-center space-y-2">
          <p className="text-xl font-bold">{PHASE_LABEL[phase]}</p>
          {phase === 'recording' && (
            <p className="text-5xl font-black tabular-nums text-amber-400">{formatDuration(elapsed)}</p>
          )}
          {phase === 'error' && (
            <p className="text-sm text-red-300 max-w-xs text-center px-4">{errorMsg}</p>
          )}
          {phase === 'processing' && (
            <p className="text-sm text-white/50">This can take up to a minute for long recordings</p>
          )}
        </div>

        {phase === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-3 bg-white text-black font-bold px-10 py-4 rounded-full hover:bg-amber-100 transition-colors text-lg shadow-lg"
          >
            <Square size={22} fill="currentColor" /> Stop Recording
          </button>
        )}
      </div>
    </div>
  )
}
