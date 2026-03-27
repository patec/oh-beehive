import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RecordingOverlay } from '@/components/voice/recording-overlay'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/actions/voice', () => ({
  createVoiceSession: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
}))

import { createVoiceSession } from '@/lib/actions/voice'

// Holds the most recently created recorder instance so tests can introspect it.
let currentRecorder: InstanceType<typeof MockMediaRecorder>

class MockMediaRecorder {
  start = vi.fn()
  mimeType = 'audio/webm'
  stream = { getTracks: () => [{ stop: vi.fn() }] }
  onstop: (() => void) | null = null
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null

  stop() {
    if (this.onstop) this.onstop()
  }

  static isTypeSupported = vi.fn(() => true)

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    currentRecorder = this
  }
}

function stubMediaDevices(getUserMediaImpl: () => Promise<unknown>) {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn(getUserMediaImpl) },
  })
}

function stubGetUserMediaSuccess() {
  stubMediaDevices(() => Promise.resolve({ getTracks: () => [] }))
}

function stubGetUserMediaDenied() {
  stubMediaDevices(() => Promise.reject(new Error('Permission denied')))
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RecordingOverlay', () => {
  it('calls onClose and navigates to review after successful processing', async () => {
    stubGetUserMediaSuccess()
    vi.mocked(createVoiceSession).mockResolvedValue({ sessionId: 'session-abc' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'review', sessionId: 'session-abc' }),
    }))

    const onClose = vi.fn()
    render(<RecordingOverlay onClose={onClose} />)

    await screen.findByText('Recording')

    await act(async () => {
      await userEvent.click(screen.getByText('Stop Recording'))
    })

    expect(mockPush).toHaveBeenCalledWith('/voice-sessions/session-abc/review')
    // onClose is no longer called by the overlay on success — RecordButton
    // watches pathname and closes the overlay after navigation completes.
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows error and does not navigate when the processing API returns an error', async () => {
    stubGetUserMediaSuccess()
    vi.mocked(createVoiceSession).mockResolvedValue({ sessionId: 'session-abc' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Processing failed' }),
    }))

    const onClose = vi.fn()
    render(<RecordingOverlay onClose={onClose} />)

    await screen.findByText('Recording')

    await act(async () => {
      await userEvent.click(screen.getByText('Stop Recording'))
    })

    expect(await screen.findByText('Processing failed')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows error when microphone access is denied', async () => {
    stubGetUserMediaDenied()

    render(<RecordingOverlay onClose={vi.fn()} />)

    await screen.findByText('Microphone access denied. Please allow microphone access and try again.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
