import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { PageHeader, EmptyState, Loading } from './ui'

const fmt = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AnnouncementsSection() {
  const { toast, refreshCounts, deleteWithUndo, isHidden } = useAdmin()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    if (error) toast(`Couldn't load: ${error.message}`, { type: 'error', duration: 6000 })
    setItems(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function post(e) {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    const { error } = await supabase.from('announcements').insert([{ message: text.trim(), archived: false }])
    setPosting(false)
    if (error) { toast(`Couldn't post: ${error.message}`, { type: 'error', duration: 6000 }); return }
    setText('')
    toast('Posted to the Bulletin Board')
    load(); refreshCounts()
  }

  async function setArchived(id, archived) {
    const { error } = await supabase.from('announcements').update({ archived }).eq('id', id)
    if (error) { toast(`Couldn't update: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(archived ? 'Archived' : 'Restored')
    load(); refreshCounts()
  }

  const visible = items.filter(a => !isHidden('announcements', a.id))
  const live = visible.filter(a => !a.archived)
  const archived = visible.filter(a => a.archived)
  const remove = a => deleteWithUndo({ table: 'announcements', id: a.id, label: 'announcement', onDone: load })

  return (
    <>
      <PageHeader title="Announcements" sub="Posts on the Bulletin Board at the top of The Pad. Archive one to take it down without losing it." />

      <form className="adm-card" style={{ marginBottom: 36 }} onSubmit={post}>
        <h2>Post an announcement</h2>
        <textarea className="form-textarea" style={{ minHeight: 110, marginTop: 12 }} value={text}
          onChange={e => setText(e.target.value)} placeholder="What do you want the community to know…" aria-label="Announcement message" />
        <button type="submit" className="adm-btn primary" style={{ marginTop: 14 }} disabled={posting || !text.trim()}>{posting ? 'Posting…' : 'Post to Bulletin Board'}</button>
      </form>

      {loading ? <Loading /> : (
        <>
          <div className="adm-section">
            <div className="adm-label hot">Live ({live.length})</div>
            {live.length === 0 ? <EmptyState title="Nothing live right now">Post something above.</EmptyState> : (
              <div className="adm-list">
                {live.map(a => (
                  <div key={a.id} className="adm-approval" style={{ borderColor: 'rgba(255,45,120,0.2)', background: 'rgba(255,45,120,0.04)' }}>
                    <div className="adm-row-meta" style={{ color: 'var(--pink)', marginBottom: 8 }}>{fmt(a.created_at)}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{a.message}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn sm" onClick={() => setArchived(a.id, true)}>Archive</button>
                      <button className="adm-btn danger sm" onClick={() => remove(a)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {archived.length > 0 && (
            <div className="adm-section">
              <div className="adm-label">Archived ({archived.length})</div>
              <div className="adm-list">
                {archived.map(a => (
                  <div key={a.id} className="adm-approval" style={{ borderColor: 'var(--border)', opacity: 0.75 }}>
                    <div className="adm-row-meta" style={{ marginBottom: 8 }}>{fmt(a.created_at)}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--muted)', marginBottom: 14 }}>{a.message}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn cyan sm" onClick={() => setArchived(a.id, false)}>Restore</button>
                      <button className="adm-btn danger sm" onClick={() => remove(a)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
