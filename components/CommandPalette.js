import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { loadIndex, search, suggestions, KIND_ORDER, KIND_LABEL } from '../lib/searchIndex'

// ⌘K / Ctrl+K (or "/") opens a search over everything in the hub. Results open
// the thing itself: a call plays, a resource downloads, a person's card shows.
export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setOpen(true) }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('radpad:open-search', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('radpad:open-search', onOpen) }
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery(''); setActive(0)
    loadIndex().then(setItems)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => inputRef.current?.focus(), 30)
    return () => { document.body.style.overflow = prev }
  }, [open])

  const results = useMemo(() => (query.trim() ? search(items, query) : suggestions(items)), [items, query])
  useEffect(() => { setActive(0) }, [query])
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

  function choose(item) {
    setOpen(false)
    if (item.external) window.open(item.external, '_blank', 'noopener')
    else router.push(item.href)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]) }
  }

  if (!open) return null

  // Group headings, keeping the flat index for keyboard navigation.
  let lastKind = null
  const hasQuery = !!query.trim()

  return (
    <div className="cmd-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Search the hub" onMouseDown={e => e.stopPropagation()}>
        <div className="cmd-field">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search calls, people, resources, links…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            autoComplete="off"
            spellCheck="false"
          />
          <kbd onClick={() => setOpen(false)}>esc</kbd>
        </div>

        <div className="cmd-list" id="cmd-list" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <div className="cmd-empty">
              {items.length === 0 ? 'Loading…' : <>No results for <b>&ldquo;{query}&rdquo;</b>.<br />Try a topic, a name, or a host.</>}
            </div>
          )}
          {results.map((item, i) => {
            const heading = item.kind !== lastKind
            lastKind = item.kind
            return (
              <div key={item.key}>
                {heading && <div className="cmd-group">{hasQuery ? KIND_LABEL[item.kind] : item.kind === 'page' ? 'Jump to' : 'Recent calls'}</div>}
                <div
                  className={`cmd-item${i === active ? ' active' : ''}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <span className="cmd-ico">
                    {item.photo ? <img src={item.photo} alt="" /> : item.icon || { page: '→', recording: '▶', event: '◷', member: '☺', resource: '▤', link: '↗' }[item.kind]}
                  </span>
                  <span className="cmd-text">
                    <span className="cmd-title">{item.title}</span>
                    {item.sub && <span className="cmd-sub">{item.sub}</span>}
                  </span>
                  <span className="cmd-go">{item.external ? 'Open ↗' : '↵'}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><kbd>↵</kbd> to open</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
