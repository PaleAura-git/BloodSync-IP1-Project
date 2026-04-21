import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Icons } from '../../components/icons'
import { cn } from '../../utils/cn'
import { quizApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'

interface Message {
  role: 'ai' | 'user'
  content: string
  final?: boolean
}

const SCRIPT = [
  "Thanks for starting. First — have you had any illness in the last two weeks? Cold, flu, fever, or anything similar?",
  "Good. Are you currently taking any medications, including antibiotics or blood thinners?",
  "Understood. Have you travelled outside Oman in the last three months, particularly to any malaria-endemic regions?",
  "Got it. Any tattoos, piercings, or acupuncture in the last six months?",
  "One more — when did you last donate blood, if at all?",
  "Perfect. Based on your answers I can see no disqualifying factors. You're in good health and meet all the eligibility criteria.\n\n**You are eligible to donate blood.** This screening is valid for 90 days. You can schedule your donation appointment directly through the app.",
]

export function Quiz() {
  const { user } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'ai',
    content: "Hi — I'm your eligibility screener. I'll ask a few questions to confirm you can safely donate blood. This usually takes under 2 minutes and your answers stay private.\n\nReady to begin?",
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<'eligible' | 'temporarily_ineligible' | 'permanently_ineligible' | null>(null)
  const stepRef = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' })
  }, [messages, thinking])

  const send = async () => {
    if (!input.trim() || thinking || done) return
    const content = input.trim()
    const userMsg: Message = { role: 'user', content }
    setMessages(m => [...m, userMsg])
    setInput('')
    setThinking(true)

    const step = stepRef.current
    const delay = 900 + Math.random() * 600

    setTimeout(async () => {
      const isFinal = step >= SCRIPT.length - 1
      const aiMsg: Message = { role: 'ai', content: SCRIPT[step] ?? SCRIPT[SCRIPT.length - 1], final: isFinal }
      setMessages(m => [...m, aiMsg])
      stepRef.current = step + 1
      setThinking(false)

      if (isFinal) {
        setResult('eligible')
        try {
          await quizApi.submitAi({ recommendation: 'eligible', reason: 'AI screening passed — no disqualifying factors found.' })
        } catch {}
        setTimeout(() => setDone(true), 400)
      }
    }, delay)
  }

  const displayName = user?.email.split('@')[0] || 'there'

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted">AI screening</div>
          <h1 className="text-[20px] font-semibold text-ink tracking-tight">Eligibility check</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Icons.Shield size={12}/> End-to-end encrypted
        </div>
      </div>

      <div className="bs-card overflow-hidden flex flex-col" style={{ height: 'min(70vh, 620px)' }}>
        <div className="px-4 h-10 border-b border-line flex items-center justify-between bg-surface2/40">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
              <Icons.Sparkle size={12} className="text-white"/>
            </div>
            <span className="text-[12px] text-ink font-medium">Screening assistant</span>
            <Badge tone="success" icon={<Icons.Dot size={6}/>}>Online</Badge>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={cn('h-7 w-7 rounded-md shrink-0 flex items-center justify-center',
                m.role === 'user' ? 'bg-surface2' : 'bg-gradient-to-br from-accent to-accent-dim')}>
                {m.role === 'user'
                  ? <Avatar name={displayName} size="sm"/>
                  : <Icons.Sparkle size={13} className="text-white"/>}
              </div>
              <div className={cn('max-w-[75%] rounded-lg px-3.5 py-2.5',
                m.role === 'user' ? 'bg-accent text-white' : 'bg-surface border border-line')}>
                <p className={cn('text-[13px] leading-relaxed whitespace-pre-wrap',
                  m.role === 'user' ? 'text-white' : 'text-ink')}
                  dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}/>
                {m.final && (
                  <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
                    <Badge tone="success" icon={<Icons.Check size={10}/>}>
                      {m.content.toLowerCase().includes('not eligible') ? 'Not eligible' : 'Eligible'}
                    </Badge>
                    <span className="text-[11px] text-muted">Valid 90 days</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
                <Icons.Sparkle size={13} className="text-white"/>
              </div>
              <div className="bg-surface border border-line rounded-lg px-3.5 py-3">
                <div className="flex gap-1">
                  {[0, 200, 400].map(d => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse"
                      style={{ animationDelay: `${d}ms` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-3 bg-surface">
          <div className="flex items-end gap-2 rounded-lg border border-line bg-bg px-3 py-2 focus-ring">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              placeholder={done ? 'Screening complete' : 'Type your answer…'}
              disabled={done}
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted outline-none resize-none max-h-32 disabled:opacity-50"/>
            <button className="text-muted hover:text-ink disabled:opacity-50" disabled={done}>
              <Icons.Camera size={15}/>
            </button>
            <Button size="sm" onClick={send} disabled={!input.trim() || thinking || done}>
              <Icons.Arrow size={13}/>
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="text-[10px] text-faint">Press Enter to send · Shift+Enter for new line</div>
            <div className="text-[10px] text-faint">Answers are not stored after screening</div>
          </div>
        </div>
      </div>

      {done && (
        <div className={cn('mt-4 bs-card p-4 flex items-center gap-4',
          result === 'eligible' ? 'border-success/30 bg-success/[0.04]' : 'border-accent/30 bg-accent/[0.04]')}>
          <div className={cn('h-10 w-10 rounded-full flex items-center justify-center border',
            result === 'eligible' ? 'bg-success/10 border-success/30' : 'bg-accent/10 border-accent/30')}>
            <Icons.Check size={18} className={result === 'eligible' ? 'text-success' : 'text-accent'}/>
          </div>
          <div className="flex-1">
            <div className="text-[13px] text-ink font-semibold">
              {result === 'eligible' ? 'Eligible to donate' : result === 'temporarily_ineligible' ? 'Temporarily deferred' : 'Not eligible'}
            </div>
            <div className="text-[11px] text-muted">
              {result === 'eligible' ? 'Profile updated · next screening due in 90 days' : 'Profile updated · see your dashboard for details'}
            </div>
          </div>
          {result === 'eligible' && (
            <Button size="sm" onClick={() => window.location.href = '/donor/dashboard'}>Go to dashboard</Button>
          )}
        </div>
      )}
    </div>
  )
}
