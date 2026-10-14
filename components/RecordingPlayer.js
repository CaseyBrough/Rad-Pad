import { useEffect, useRef } from 'react'
import { ytId, ytEmbed, ytWatch } from '../lib/youtube'
import { toast } from './Toaster'

// In-hub player: the call plays right here (YouTube, privacy-friendly embed),
// with the full "what we covered" description and prev/next through the list.
export default function RecordingPlayer({ rec, onClose, onPrev, onNext, typeClass }) {
  const closeBtn = useRef(null)
  const handlers = useRef({})
  handlers.current = { onClose, onPrev, onNext }
  const id = ytId(rec.video_url)

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') handlers.current.onClose()
      else if (e.key === 'ArrowLeft' && handlers.current.onPrev) handlers.current.onPrev()
      else if (e.key === 'ArrowRight' && handlers.current.onNext) handlers.current.onNext()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Link copied — share it with another member.')
    } catch {
      toast('Copy the address bar to share this call.', { type: 'error' })
    }
  }

  return (
    <div className="pl-overlay" onClick={onClose}>
      <div className="pl-modal" role="dialog" aria-modal="true" aria-label={rec.title} onClick={e => e.stopPropagation()}>
        <button ref={closeBtn} type="button" className="pl-close" onClick={onClose} aria-label="Close player">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>

        <div className="pl-video">
          {id ? (
            <iframe
              key={rec.id}
              src={ytEmbed(id)}
              title={rec.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="pl-novideo">The video for this call isn&apos;t available yet.</div>
          )}
        </div>

        <div className="pl-body">
          <div className="pl-tags">
            {rec.call_type && <span className={`tag ${typeClass}`}>{rec.call_type}{rec.sub_topic ? ` · ${rec.sub_topic}` : ''}</span>}
            <span className="pl-meta">{[rec.date, rec.duration, rec.host && `Host: ${rec.host}`].filter(Boolean).join('  ·  ')}</span>
          </div>
          <h2 className="pl-title">{rec.title}</h2>
          {rec.description && <p className="pl-desc">{rec.description}</p>}

          <div className="pl-actions">
            <button type="button" className="pl-btn" onClick={onPrev} disabled={!onPrev}>‹ Previous</button>
            <button type="button" className="pl-btn" onClick={onNext} disabled={!onNext}>Next ›</button>
            <span className="pl-spacer" />
            <button type="button" className="pl-btn" onClick={copyLink}>Copy link</button>
            {id && <a className="pl-btn" href={ytWatch(id)} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>}
          </div>
        </div>
      </div>
    </div>
  )
}
