import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { CONTENT } from './contentConfig'
import { Icon, PageHeader, EmptyState, Loading, SearchBox, Field, SidePanel, matches, useNewShortcut } from './ui'

// Recordings / Resources / Events / Links: a searchable, sortable list, with
// create + edit in a slide-over panel. Everything per-kind comes from CONTENT.
export default function ContentSection({ kind, intent, clearIntent, go }) {
  const cfg = CONTENT[kind]
  const { counts, toast, refreshCounts, deleteWithUndo, isHidden } = useAdmin()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortId, setSortId] = useState(cfg.sorts[0].id)
  const [panel, setPanel] = useState(null) // { id: string|null, form: {} }
  const [saving, setSaving] = useState(false)
  const searchRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(cfg.table).select('*').order(cfg.orderCol, { ascending: false })
    if (error) toast(`Couldn't load ${cfg.plural.toLowerCase()}: ${error.message}`, { type: 'error', duration: 6000 })
    setItems(data || [])
    setLoading(false)
  }, [cfg, toast])

  useEffect(() => { load() }, [load])

  const openNew = useCallback((prefill = {}) => setPanel({ id: null, form: { ...cfg.blank, ...prefill } }), [cfg])

  const openEdit = useCallback(item => {
    const { id, created_at, ...rest } = item
    setPanel({ id, form: { ...cfg.blank, ...rest } })
  }, [cfg])

  // Intents from the Overview / jump menu: 'new', { prefill }, or { editId }.
  useEffect(() => {
    if (!intent) return
    if (intent === 'new') { openNew(); clearIntent?.() }
    else if (intent.prefill) { openNew(intent.prefill); clearIntent?.() }
    else if (intent.editId && !loading) {
      const hit = items.find(i => i.id === intent.editId)
      if (hit) openEdit(hit)
      clearIntent?.()
    }
  }, [intent, loading, items, openNew, openEdit, clearIntent])

  // N = new item, / = search (when not typing and no panel is open).
  useNewShortcut({ onNew: () => openNew(), searchRef, disabled: !!panel })

  const setField = (key, val) => setPanel(p => ({ ...p, form: { ...p.form, [key]: val } }))

  const canSave = panel && cfg.required.every(k => String(panel.form[k] || '').trim())

  async function save() {
    setSaving(true)
    let error
    if (panel.id) {
      ;({ error } = await supabase.from(cfg.table).update(panel.form).eq('id', panel.id))
    } else {
      ;({ error } = await supabase.from(cfg.table).insert([{ ...panel.form, ...cfg.createExtras }]))
    }
    setSaving(false)
    if (error) { toast(`Couldn't save: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(panel.id ? `${cfg.label} updated` : `${cfg.label} added`)
    setPanel(null)
    load()
    refreshCounts()
  }

  function remove(item) {
    const r = cfg.row(item)
    deleteWithUndo({ table: cfg.table, id: item.id, label: `“${r.title}”`, onDone: load })
  }

  const visible = useMemo(() => {
    const sort = cfg.sorts.find(s => s.id === sortId)
    let list = items
      .filter(i => !isHidden(cfg.table, i.id))
      .filter(i => (cfg.listFilter ? cfg.listFilter(i) : true))
      .filter(i => matches(query, ...cfg.searchText(i)))
    if (sort.id === 'az') {
      const label = i => (i[cfg.labelKey || 'title'] || '').toLowerCase()
      list = [...list].sort((a, b) => label(a).localeCompare(label(b)))
    } else if (sort.key) {
      list = [...list].sort((a, b) => String(b[sort.key] || '').localeCompare(String(a[sort.key] || '')) * -sort.dir)
    }
    return list
  }, [items, query, sortId, cfg, isHidden])

  // Events in date order are split into Coming up / Date TBA / Past.
  const sections = useMemo(() => {
    const sort = cfg.sorts.find(s => s.id === sortId)
    if (!cfg.groups || !sort.grouped) return null
    return cfg.groups
      .map(g => ({ ...g, rows: g.order ? [...visible.filter(i => cfg.groupOf(i) === g.id)].sort(g.order) : visible.filter(i => cfg.groupOf(i) === g.id) }))
      .filter(g => g.rows.length)
  }, [cfg, sortId, visible])

  const total = items.filter(i => !isHidden(cfg.table, i.id)).filter(i => (cfg.listFilter ? cfg.listFilter(i) : true)).length
  const linkWaiting = kind === 'link' ? counts?.linksPending || 0 : 0

  const renderRow = item => {
    const r = cfg.row(item)
    return (
      <div key={item.id} className={`adm-row click${r.dim ? ' dim' : ''}`} tabIndex={0} role="button"
        aria-label={`Edit ${r.title}`}
        onClick={() => openEdit(item)}
        onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEdit(item) } }}>
        {r.thumb !== undefined && (
          r.thumb ? <img className="adm-thumb" src={r.thumb} alt="" loading="lazy" /> : <div className="adm-thumb ph" aria-hidden="true"><Icon name="recording" size={18} /></div>
        )}
        {r.icon && <div className="adm-row-icon">{r.icon}</div>}
        {r.dot && <i className={`adm-dot ${r.dot}`} aria-hidden="true" />}
        <div className="adm-row-body">
          <div className="adm-row-title">{r.title}</div>
          {r.meta && <div className="adm-row-meta">{r.meta}</div>}
        </div>
        {r.chip && <span className={`adm-chip${r.chip.tone ? ' ' + r.chip.tone : ''}`}>{r.chip.text}</span>}
        <div className="adm-row-actions">
          <button className="adm-btn danger sm" aria-label={`Delete ${r.title}`} onClick={e => { e.stopPropagation(); remove(item) }}>Delete</button>
        </div>
      </div>
    )
  }

  const editing = panel?.id ? items.find(i => i.id === panel.id) : null

  return (
    <>
      <PageHeader title={cfg.plural} sub={cfg.sub}>
        <button className="adm-btn primary" onClick={() => openNew()} title="Shortcut: N"><Icon name="plus" size={14} /> New {cfg.label.toLowerCase()}</button>
      </PageHeader>

      {linkWaiting > 0 && (
        <div className="adm-note">
          <span>{linkWaiting} member suggestion{linkWaiting === 1 ? ' is' : 's are'} waiting for approval.</span>
          <button className="adm-btn cyan sm" onClick={() => go('approvals')}>Review</button>
        </div>
      )}

      {loading ? <Loading /> : total === 0 ? (
        <EmptyState title={`No ${cfg.plural.toLowerCase()} yet`}>Use “New {cfg.label.toLowerCase()}” to add the first one.</EmptyState>
      ) : (
        <>
          <div className="adm-toolbar">
            <SearchBox ref={searchRef} value={query} onChange={setQuery} placeholder={`Search ${cfg.plural.toLowerCase()}…`} />
            <select className="adm-select" value={sortId} onChange={e => setSortId(e.target.value)} aria-label="Sort order">
              {cfg.sorts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="adm-count">{query.trim() ? `${visible.length} of ${total}` : total} {cfg.plural.toLowerCase()} · click a row to edit</div>
          {visible.length === 0 ? (
            <EmptyState title="No matches">Try a different search.</EmptyState>
          ) : sections ? (
            sections.map(g => g.collapsed ? (
              <details key={g.id} className="adm-group" open={!!query.trim()}>
                <summary className="adm-label">{g.label} ({g.rows.length})</summary>
                <div className="adm-list">{g.rows.map(renderRow)}</div>
              </details>
            ) : (
              <div key={g.id} className="adm-group">
                <div className={`adm-label${g.hot ? ' hot' : ''}`}>{g.label} ({g.rows.length})</div>
                <div className="adm-list">{g.rows.map(renderRow)}</div>
              </div>
            ))
          ) : (
            <div className="adm-list">{visible.map(renderRow)}</div>
          )}
        </>
      )}

      {panel && (
        <SidePanel
          title={panel.id ? `Edit ${cfg.label.toLowerCase()}` : `New ${cfg.label.toLowerCase()}`}
          onClose={() => setPanel(null)}
          onSubmit={save}
          saving={saving}
          canSave={canSave}
          submitLabel={panel.id ? 'Save changes' : `Add ${cfg.label.toLowerCase()}`}
          onDelete={editing ? () => { setPanel(null); remove(editing) } : undefined}
        >
          {cfg.panelTop && cfg.panelTop(panel.form, panel.id)}
          <div className="adm-form-grid">
            {cfg.fields.filter(f => !f.showIf || f.showIf(panel.form)).map(f => (
              <Field key={f.key} spec={f} form={panel.form} onChange={setField} />
            ))}
          </div>
        </SidePanel>
      )}
    </>
  )
}
