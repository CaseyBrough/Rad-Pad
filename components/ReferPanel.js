import { useEffect, useState } from 'react'
import { REFERRAL_URL, INVITE_MESSAGE, OPEN_REFER_EVENT, copyText } from '../lib/referral'

// Slide-over opened by the sidebar's "Refer someone" button from any page.
export default function ReferPanel() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_REFER_EVENT, show)
    return () => window.removeEventListener(OPEN_REFER_EVENT, show)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  if (!open) return null
  return (
    <>
      <div className="adm-overlay" onClick={() => setOpen(false)} />
      <div className="adm-panel" role="dialog" aria-modal="true" aria-label="Refer someone">
        <div className="adm-panel-head">
          <h2>Refer someone</h2>
          <button type="button" className="adm-top-btn" onClick={() => setOpen(false)} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
        <div className="adm-panel-body">
          <p className="panel-note">The Rad Pad grows by referral. Send someone this link. The form is for the person joining to fill out, not you.</p>
          <div className="refer-url" style={{ marginBottom: 14 }}>{REFERRAL_URL.replace(/^https?:\/\//, '')}</div>
          <div className="refer-buttons" style={{ marginBottom: 26 }}>
            <button type="button" className="btn pink refer-big" onClick={() => copyText(REFERRAL_URL, 'Referral link copied')}>Copy link</button>
            <a className="btn refer-big" href={REFERRAL_URL} target="_blank" rel="noopener noreferrer">Open form ↗</a>
          </div>
          <div className="refer-msg-label">Or send this message</div>
          <p className="refer-msg-text">{INVITE_MESSAGE}</p>
          <button type="button" className="btn cyan" onClick={() => copyText(INVITE_MESSAGE, 'Invite message copied')}>Copy message</button>
        </div>
      </div>
    </>
  )
}
