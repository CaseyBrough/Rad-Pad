import { useState, useEffect, useRef } from 'react'
import { googleCalendarUrl, downloadIcs } from '../lib/calendar'

// "Add to calendar" button with a two-option menu: Google Calendar (opens a
// pre-filled event) or a .ics file (Apple Calendar, Outlook, anything else).
export default function AddToCalendar({ ev }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="cal-add" ref={ref}>
      <button type="button" className="cal-add-btn" aria-haspopup="menu" aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M5 2v2M11 2v2M2 7h12M8 9v4M6 11h4" />
        </svg>
        Add to calendar
      </button>
      {open && (
        <div className="cal-menu" role="menu">
          <a role="menuitem" href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Google Calendar</a>
          <button role="menuitem" type="button" onClick={() => { downloadIcs(ev); setOpen(false) }}>Apple / Outlook (.ics)</button>
        </div>
      )}
    </div>
  )
}
