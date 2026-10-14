import { useState, useEffect } from 'react'

// Tiny global toast: call toast('Saved') from anywhere; <Toaster /> (mounted in
// Layout) renders it. Uses the same styles as the admin toasts (admin.css).

const listeners = new Set()
let nextId = 1

export function toast(message, { type = 'success', duration = 4500 } = {}) {
  const t = { id: nextId++, message, type }
  listeners.forEach(fn => fn({ add: t }))
  setTimeout(() => listeners.forEach(fn => fn({ remove: t.id })), duration)
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const fn = evt => {
      if (evt.add) setToasts(t => [...t, evt.add])
      if (evt.remove) setToasts(t => t.filter(x => x.id !== evt.remove))
    }
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return (
    <div className="adm-toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`adm-toast${t.type === 'error' ? ' error' : ''}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
