import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const Ctx = createContext(null)
export const useAdmin = () => useContext(Ctx)

// How long a delete can be undone before it's actually sent to the database.
const UNDO_MS = 6000

// Head-only count query: Supabase returns just the row count, no data.
function count(table, apply) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (apply) q = apply(q)
  return q.then(r => r.count ?? 0)
}

export function AdminProvider({ children }) {
  const [counts, setCounts] = useState(null)
  const [toasts, setToasts] = useState([])
  const [hidden, setHidden] = useState({})
  const timers = useRef({})
  const toastId = useRef(0)

  // Loaded once at page open (and after every change) so sidebar badges and the
  // Overview are accurate from the first second - not only after visiting a tab.
  const refreshCounts = useCallback(async () => {
    try {
      const [recordings, resources, events, links, linksPending, members, membersPending, pins, pinsPending, access, announcements] = await Promise.all([
        count('recordings'),
        count('resources'),
        count('events'),
        count('links', q => q.eq('approved', true)),
        count('links', q => q.eq('approved', false)),
        count('members', q => q.eq('approved', true)),
        count('members', q => q.eq('approved', false)),
        count('map_pins', q => q.eq('approved', true)),
        count('map_pins', q => q.eq('approved', false)),
        count('authorized_emails'),
        count('announcements', q => q.eq('archived', false)),
      ])
      setCounts({
        recordings, resources, events, links, linksPending, members, membersPending,
        pins, pinsPending, access, announcements,
        pending: linksPending + membersPending + pinsPending,
      })
    } catch (e) {
      // Counts are decorative - never block the dashboard on them.
    }
  }, [])

  useEffect(() => { refreshCounts() }, [refreshCounts])

  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  const toast = useCallback((message, opts = {}) => {
    const id = ++toastId.current
    const { type = 'success', action, duration = 3800 } = opts
    setToasts(t => [...t, { id, message, type, action }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const unhide = key => setHidden(h => { const n = { ...h }; delete n[key]; return n })

  // Delete with a short undo window. The row disappears immediately; the real
  // DELETE only fires after UNDO_MS unless "Undo" is pressed first.
  const deleteWithUndo = useCallback(({ table, id, label, onDone }) => {
    const key = `${table}:${id}`
    setHidden(h => ({ ...h, [key]: true }))
    const tid = toast(`Deleted ${label}`, {
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timers.current[key])
          delete timers.current[key]
          unhide(key)
        },
      },
    })
    timers.current[key] = setTimeout(async () => {
      delete timers.current[key]
      dismiss(tid)
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        unhide(key)
        toast(`Couldn't delete ${label}: ${error.message}`, { type: 'error', duration: 6000 })
        return
      }
      try { await onDone?.() } finally { unhide(key) }
      refreshCounts()
    }, UNDO_MS)
  }, [toast, dismiss, refreshCounts])

  const isHidden = useCallback((table, id) => !!hidden[`${table}:${id}`], [hidden])

  // A delete that hasn't been sent yet is lost if the tab closes - warn first.
  useEffect(() => {
    const handler = e => {
      if (Object.keys(timers.current).length) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const value = { counts, refreshCounts, toast, deleteWithUndo, isHidden }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`adm-toast${t.type === 'error' ? ' error' : ''}`}>
            <span>{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action.onClick(); dismiss(t.id) }}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
