import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, Send, X, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { PageSpinner } from '../../components/ui/Spinner'
import { quizApi, donorApi } from '../../api'
import type { DonorProfile } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Recommendation = 'eligible' | 'temporarily_ineligible' | 'permanently_ineligible'

interface UploadedFile {
  name: string
  size: number
  mimeType: string
  data: string // base64
}

interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  files?: UploadedFile[]
  isTyping?: boolean
  recommendation?: Recommendation
  reason?: string
  isComplete?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[75%]">
      <div className="px-4 py-3 rounded-md" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#555',
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove?: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded"
      style={{ backgroundColor: '#262626' }}
    >
      <FileText size={12} style={{ color: '#888', flexShrink: 0 }} />
      <span className="text-[11px] font-mono truncate max-w-[140px]" style={{ color: '#888' }}>
        {file.name}
      </span>
      <span className="text-[10px] font-mono" style={{ color: '#444' }}>
        {formatBytes(file.size)}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 flex-shrink-0 transition-colors"
          style={{ color: '#444' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#888'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

function CompletionMessage({ recommendation, reason }: { recommendation: Recommendation; reason?: string }) {
  const config = {
    eligible: {
      border: '#2EC486',
      badge: { bg: 'rgba(46,196,134,0.12)', text: '#2EC486', label: 'Eligible' },
      icon: <CheckCircle size={14} style={{ color: '#2EC486' }} />,
    },
    temporarily_ineligible: {
      border: '#F59E0B',
      badge: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'Temporarily Ineligible' },
      icon: <Clock size={14} style={{ color: '#F59E0B' }} />,
    },
    permanently_ineligible: {
      border: '#E53935',
      badge: { bg: 'rgba(229,57,53,0.12)', text: '#E53935', label: 'Permanently Ineligible' },
      icon: <AlertCircle size={14} style={{ color: '#E53935' }} />,
    },
  }
  const c = config[recommendation]

  return (
    <div
      className="rounded-md px-4 py-3"
      style={{ backgroundColor: '#1A1A1A', borderLeft: `3px solid ${c.border}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        {c.icon}
        <span
          className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: c.badge.bg, color: c.badge.text }}
        >
          {c.badge.label}
        </span>
      </div>
      {reason && (
        <p className="text-[12px] mt-1" style={{ color: '#888' }}>{reason}</p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'already_done' | 'idle' | 'chatting' | 'complete' | 'submitted'

export function Quiz() {
  const navigate = useNavigate()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]) // pre-chat uploads
  const [midChatFiles, setMidChatFiles] = useState<UploadedFile[]>([]) // mid-chat attach
  const [uploading, setUploading] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [finalRec, setFinalRec] = useState<{ recommendation: Recommendation; reason?: string } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const midChatFileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    donorApi.getProfile()
      .then((res) => {
        const d = res.data.data || res.data.donor || res.data
        setDonor(d)
        setPageState(d?.quizCompleted ? 'already_done' : 'idle')
      })
      .catch(() => setPageState('idle'))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiThinking])

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileUpload = async (file: File, target: 'pending' | 'midchat') => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) return
    if (file.size > 10 * 1024 * 1024) return

    setUploading(true)
    try {
      const res = await quizApi.uploadDocument(file)
      const uploaded: UploadedFile = {
        name: res.data.file.originalName,
        size: res.data.file.size,
        mimeType: res.data.file.mimeType,
        data: res.data.file.data,
      }
      if (target === 'pending') {
        setPendingFiles((f) => [...f, uploaded])
      } else {
        setMidChatFiles((f) => [...f, uploaded])
      }
    } finally {
      setUploading(false)
    }
  }

  // ── Start screening ────────────────────────────────────────────────────────

  const startScreening = async () => {
    setPageState('chatting')

    // Build opening user message (with any pre-attached files)
    const openingUser: Message = {
      id: uid(),
      role: 'user',
      content: 'I would like to complete my blood donation eligibility screening.',
      files: pendingFiles.length > 0 ? pendingFiles : undefined,
    }
    setMessages([openingUser])
    setPendingFiles([])
    await sendToAi([openingUser])
  }

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content && midChatFiles.length === 0) return

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content,
      files: midChatFiles.length > 0 ? midChatFiles : undefined,
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setMidChatFiles([])
    await sendToAi(updated)
  }

  const sendToAi = async (history: Message[]) => {
    setAiThinking(true)
    try {
      const payload = history.map((m) => ({
        role: m.role === 'ai' ? 'ai' : 'user' as 'ai' | 'user',
        content: m.content,
        files: m.files?.map((f) => ({ mimeType: f.mimeType, data: f.data })),
      }))

      const res = await quizApi.chat(payload)
      const aiResp = res.data.response as {
        message: string
        isComplete: boolean
        recommendation?: Recommendation
        reason?: string
      }

      const aiMsg: Message = {
        id: uid(),
        role: 'ai',
        content: aiResp.message,
        isComplete: aiResp.isComplete,
        recommendation: aiResp.recommendation,
        reason: aiResp.reason,
      }

      setMessages((prev) => [...prev, aiMsg])

      if (aiResp.isComplete && aiResp.recommendation) {
        setFinalRec({ recommendation: aiResp.recommendation, reason: aiResp.reason })
        setPageState('complete')
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setAiThinking(false)
    }
  }

  // ── Submit result ──────────────────────────────────────────────────────────

  const submitResult = async () => {
    if (!finalRec) return
    setSubmitting(true)
    try {
      await quizApi.submitAi(finalRec)
      setPageState('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (pageState === 'loading') return <PageSpinner />

  // Already completed
  if (pageState === 'already_done') {
    const statusMap: Record<string, { label: string; color: string }> = {
      ELIGIBLE: { label: 'Eligible', color: '#2EC486' },
      TEMPORARILY_BLOCKED: { label: 'Temporarily Ineligible', color: '#F59E0B' },
      PERMANENTLY_BLOCKED: { label: 'Permanently Ineligible', color: '#E53935' },
    }
    const s = statusMap[donor?.eligibilityStatus as string] ?? { label: 'Unknown', color: '#555' }
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-heading font-semibold text-[20px] text-text-primary">Health Eligibility Screening</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>
            AI-powered · BloodSync
          </p>
        </div>
        <div className="rounded-md px-5 py-4" style={{ backgroundColor: '#141414' }}>
          <p className="text-[13px] text-text-primary">Screening already completed.</p>
          <p className="text-[13px] mt-1">
            Current status:{' '}
            <span className="font-mono font-medium" style={{ color: s.color }}>{s.label}</span>
          </p>
          {donor?.blockReason && (
            <p className="text-[12px] mt-1" style={{ color: '#555' }}>{donor.blockReason}</p>
          )}
        </div>
        <button
          onClick={() => setPageState('idle')}
          className="self-start px-4 py-2 rounded text-[13px] font-medium transition-all duration-150"
          style={{ backgroundColor: 'transparent', border: '1px solid #262626', color: '#888' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#EFEFEF'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#888'}
        >
          Retake Screening
        </button>
      </div>
    )
  }

  // Submitted confirmation
  if (pageState === 'submitted') {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">Health Eligibility Screening</h1>
        <div className="rounded-md px-5 py-4" style={{ backgroundColor: '#141414' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-green-accent" />
            <p className="text-[13px] text-text-primary font-medium">Results submitted</p>
          </div>
          <p className="text-[12px]" style={{ color: '#555' }}>
            Your eligibility status has been updated.
          </p>
        </div>
        <button
          onClick={() => navigate('/donor/dashboard')}
          className="self-start px-4 py-2 rounded text-[13px] font-semibold text-white transition-all duration-150"
          style={{ backgroundColor: '#E53935' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935'}
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-64px)]">
      {/* Inject typing animation keyframes */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-baseline gap-2.5 flex-shrink-0">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">
          Health Eligibility Screening
        </h1>
        <span className="text-[12px] font-mono" style={{ color: '#555' }}>AI-powered</span>
      </div>

      {/* Chat container */}
      <div
        className="flex-1 flex flex-col rounded-md overflow-hidden min-h-0"
        style={{ backgroundColor: '#111111' }}
      >
        {/* ── Idle / pre-chat state ── */}
        {pageState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
            <div className="w-full max-w-lg flex flex-col gap-5">
              <p className="text-[13px] text-center leading-relaxed" style={{ color: '#888' }}>
                Our AI screening assistant will assess your donation eligibility through a short conversation.
                You can also upload medical documents like blood test results for a more thorough assessment.
              </p>

              {/* Upload zone */}
              <div
                className="rounded-md px-5 py-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-150"
                style={{ border: '1px dashed #262626', backgroundColor: 'transparent' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#444'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#262626'}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) await handleFileUpload(file, 'pending')
                }}
              >
                <Paperclip size={16} style={{ color: '#444' }} />
                <p className="text-[13px]" style={{ color: '#555' }}>
                  Drop medical reports here or click to upload
                </p>
                <p className="text-[11px] font-mono" style={{ color: '#333' }}>
                  PDF, JPG, PNG — max 10MB
                </p>
                {uploading && (
                  <p className="text-[11px]" style={{ color: '#555' }}>Uploading…</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleFileUpload(file, 'pending')
                  e.target.value = ''
                }}
              />

              {/* Pending file chips */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={startScreening}
                className="w-full py-2.5 rounded text-[13px] font-semibold text-white transition-all duration-150"
                style={{ backgroundColor: '#E53935' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935'}
              >
                Start Screening
              </button>
            </div>
          </div>
        )}

        {/* ── Active chat ── */}
        {(pageState === 'chatting' || pageState === 'complete') && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="flex flex-col gap-1.5 max-w-[75%]"
                    style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                  >
                    {/* File attachments above message */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.files.map((f, i) => <FileChip key={i} file={f} />)}
                      </div>
                    )}

                    {/* Message bubble */}
                    {msg.content && (
                      <div
                        className="px-4 py-2.5 rounded-md"
                        style={{
                          backgroundColor: msg.role === 'user' ? '#262626' : '#1A1A1A',
                        }}
                      >
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#EFEFEF' }}>
                          {msg.content}
                        </p>
                      </div>
                    )}

                    {/* Completion card */}
                    {msg.isComplete && msg.recommendation && (
                      <div className="w-full">
                        <CompletionMessage recommendation={msg.recommendation} reason={msg.reason} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {aiThinking && <TypingIndicator />}

              <div ref={chatEndRef} />
            </div>

            {/* ── Yes/No quick replies (when AI is idle and last message is AI) ── */}
            {!aiThinking && pageState === 'chatting' && messages.length > 0 && messages[messages.length - 1].role === 'ai' && (
              <div className="px-5 pb-2 flex gap-2">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => sendMessage(opt)}
                    className="px-4 py-1.5 rounded text-[12px] font-medium transition-all duration-150"
                    style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', color: '#888' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#444'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#EFEFEF'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#262626'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#888'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input bar (hidden when complete) ── */}
            {pageState === 'chatting' && (
              <div
                className="px-4 py-3 flex items-center gap-2.5"
                style={{ borderTop: '1px solid #1A1A1A' }}
              >
                {/* Mid-chat file chips */}
                {midChatFiles.length > 0 && (
                  <div className="flex gap-1.5">
                    {midChatFiles.map((f, i) => (
                      <FileChip
                        key={i}
                        file={f}
                        onRemove={() => setMidChatFiles((prev) => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => midChatFileRef.current?.click()}
                  className="flex-shrink-0 p-1.5 rounded transition-all duration-150"
                  style={{ color: '#555' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#888'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#555'}
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>
                <input
                  ref={midChatFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleFileUpload(file, 'midchat')
                    e.target.value = ''
                  }}
                />

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer…"
                  disabled={aiThinking}
                  className="flex-1 rounded px-3 py-2 text-[13px] font-body text-text-primary placeholder-text-tertiary transition-all duration-150 focus:outline-none"
                  style={{ backgroundColor: '#1A1A1A', border: 'none' }}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={aiThinking || (!input.trim() && midChatFiles.length === 0)}
                  className="flex-shrink-0 p-1.5 rounded transition-all duration-150 disabled:opacity-30"
                  style={{
                    color: input.trim() || midChatFiles.length > 0 ? '#E53935' : '#555',
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            )}

            {/* ── Submit results button (when complete) ── */}
            {pageState === 'complete' && (
              <div
                className="px-5 py-4 flex items-center justify-end gap-3"
                style={{ borderTop: '1px solid #1A1A1A' }}
              >
                <p className="text-[12px] flex-1" style={{ color: '#555' }}>
                  Screening complete. Submit your results to update your eligibility status.
                </p>
                <button
                  onClick={submitResult}
                  disabled={submitting}
                  className="px-5 py-2 rounded text-[13px] font-semibold text-white transition-all duration-150 disabled:opacity-40"
                  style={{ backgroundColor: '#E53935' }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828' }}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935'}
                >
                  {submitting ? 'Submitting…' : 'Submit Results'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
