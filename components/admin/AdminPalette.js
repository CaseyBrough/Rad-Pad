import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Icon, matches } from './ui'
import { fmtDay } from './dates'

// Cmd/Ctrl+K jump menu: every admin tab, "new" actions, and every row by name.
// Rows load the first time the menu opens.

const NEW_ACTIONS = [
  { label: 'New event', view: 'events', icon: 'event' },
  { label: 'New recording', view: 'recordings', icon: 'recording' },
  { label: 'New resource', view: 'resources', icon: 'resource' },
  { label: 'New link', view: 'links', icon: 'link' },
  { label: 'Post announcement', view: 'announcements', icon: 'announce', plain: true },
]

const SOURCES = [
  { table: 'events', cols: 'id,title,event_date', view: 'events', icon: 'event', noun: 'Event', label: r => r.title, sub: r => fmtDay(r.event_date) },
  { table: 'recordings', cols: 'id,title,date,host', view: 'recordings', icon: 'recording', noun: 'Recording', label: r => r.title, sub: r => [fmtDay(r.date), r.host].filter(Boolean).join(' · ') },
  { table: 'resources', cols: 'id,title,category', view: 'resources', icon: 'resource', noun: 'Resource', label: r => r.title, sub: r => r.category },
  { table: 'links', cols: 'id,name,category', view: 'links', icon: 'link', noun: 'Link', label: r => r.name, sub: r => r.category, approved: true },
  { table: 'members', cols: 'id,name,location', view: 'members', icon: 'member', noun: 'Member', label: r => r.name, sub: r => r.location, approved: true },
  { table: 'map_pins', cols: 'id,name,location', view: 'pins', icon: 'pin', noun: 'Map pin', label: r => r.name, sub: r => r.location, approved: true },
]

export default function AdminPalette({ nav, go }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    setQ(''); setSel(0)
    if (rows) return
    Promise.all(SOURCES.map(src => {
      let query = supabase.from(src.table).select(src.cols)
      if (src.approved) query = query.eq('approved', true)
      return query.then(r => (r.data || []).map(row => ({
        key: `${src.table}:${row.id}`, icon: src.icon, label: src.label(row) || '(untitled)', kind: src.noun,
        sub: src.sub(row), run: () => go(src.view, { editId: row.id }),
      })))
    })).then(all => setRows(all.flat()), () => setRows([]))
  }, [open, rows, go])

  const tabs = useMemo(() => nav.flatMap(g => g.items).map(i => ({
    key: `tab:${i.id}`, icon: i.icon, label: i.label, kind: 'Go to', run: () => go(i.id),
  })), [nav, go])

  const actions = useMemo(() => NEW_ACTIONS.map(a => ({
    key: `new:${a.view}`, icon: 'plus', label: a.label, kind: 'Action', run: () => go(a.view, a.plain ? null : 'new'),
  })), [go])

  const results = useMemo(() => {
    const term = q.trim()
    const base = [...tabs, ...actions]
    if (!term) return base
    const hits = base.filter(r => matches(term, r.label))
    const rowHits = (rows || []).filter(r => matches(term, r.label, r.sub)).slice(0, 30)
    return [...hits, ...rowHits]
  }, [q, tabs, actions, rows])

  useEffect(() => { setSel(0) }, [q])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const pick = r => { setOpen(false); r.run() }
  const onKeyDown = e => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); pick(results[sel]) }
  }

  return (
    <>
      <div className="adm-overlay" onClick={() => setOpen(false)} />
      <div className="adm-palette" role="dialog" aria-modal="true" aria-label="Jump to">
        <div className="adm-palette-search">
          <Icon name="search" size={16} />
          <input ref={inputRef} autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Jump to a tab, or find a call, member, link…" aria-label="Search the admin" />
          <kbd>esc</kbd>
        </div>
        <div className="adm-palette-list" ref={listRef} role="listbox">
          {results.length === 0 ? (
            <div className="adm-palette-empty">{rows ? 'No matches.' : 'Loading…'}</div>
          ) : results.map((r, i) => (
            <button key={r.key} role="option" aria-selected={i === sel} className="adm-palette-item"
              onMouseMove={() => setSel(i)} onClick={() => pick(r)}>
              <Icon name={r.icon} size={15} />
              <span className="adm-palette-label">{r.label}{r.sub && <small>{r.sub}</small>}</span>
              <span className="adm-palette-kind">{r.kind}</span>
            </button>
          ))}
        </div>
        <div className="adm-palette-foot"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>N</kbd> new item and <kbd>/</kbd> search on any list</div>
      </div>
    </>
  )
}
