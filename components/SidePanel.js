import { useEffect, useRef } from 'react'

// Slide-over form panel shared by the admin dashboard and the member pages.
// Esc / backdrop click closes it; Enter in a text field submits; page scroll is
// locked while it's open. Styles live in admin.css (.adm-panel, .adm-overlay).
export default function SidePanel({ title, onClose, onSubmit, saving, canSave = true, submitLabel = 'Save', children }) {
  const bodyRef = useRef(null)
  // Callers pass a fresh onClose every render; keep the latest in a ref so the
  // setup below runs once on open (not on every keystroke, which would steal
  // focus back to the first field).
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    bodyRef.current?.querySelector('input:not([type=file]), textarea, select')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <form
        className="adm-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={e => { e.preventDefault(); if (canSave && !saving) onSubmit() }}
      >
        <div className="adm-panel-head">
          <h2>{title}</h2>
          <button type="button" className="adm-top-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
        <div className="adm-panel-body" ref={bodyRef}>{children}</div>
        <div className="adm-panel-foot">
          <button type="submit" className="adm-btn primary" disabled={!canSave || saving}>{saving ? 'Saving…' : submitLabel}</button>
          <button type="button" className="adm-btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </>
  )
}
