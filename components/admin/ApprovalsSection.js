import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { PageHeader, Loading } from './ui'
import { describePlacement } from '../../lib/placement'

const sub = (...p) => p.filter(Boolean).join(' · ')

// One inbox for everything members have submitted that's waiting on a yes/no:
// Directory profiles, map pins, and suggested links.
export default function ApprovalsSection() {
  const { toast, refreshCounts, deleteWithUndo, isHidden } = useAdmin()
  const [members, setMembers] = useState([])
  const [pins, setPins] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const pending = table => supabase.from(table).select('*').eq('approved', false).order('created_at', { ascending: false })
    const [m, p, l] = await Promise.all([pending('members'), pending('map_pins'), pending('links')])
    const failed = m.error || p.error || l.error
    if (failed) toast(`Couldn't load some submissions: ${failed.message}`, { type: 'error', duration: 6000 })
    setMembers(m.data || [])
    setPins(p.data || [])
    setLinks(l.data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function approve(table, id, message) {
    const { error } = await supabase.from(table).update({ approved: true }).eq('id', id)
    if (error) { toast(`Couldn't approve: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(message)
    load(); refreshCounts()
  }

  const decline = (table, id, label) => deleteWithUndo({ table, id, label, onDone: load })

  const m = members.filter(x => !isHidden('members', x.id))
  const p = pins.filter(x => !isHidden('map_pins', x.id))
  const l = links.filter(x => !isHidden('links', x.id))
  const total = m.length + p.length + l.length

  const actions = (onApprove, onDecline) => (
    <div className="adm-row-actions">
      <button className="adm-btn cyan sm" onClick={onApprove}>Approve</button>
      <button className="adm-btn danger sm" onClick={onDecline}>Decline</button>
    </div>
  )

  return (
    <>
      <PageHeader title="Approvals" sub="Everything members have submitted that's waiting on you. Approve to publish it, or decline to delete it (you can undo for a few seconds)." />

      {loading ? <Loading /> : total === 0 ? (
        <div className="adm-card ok"><h2>All caught up</h2><p>Nothing is waiting for approval.</p></div>
      ) : (
        <>
          {m.length > 0 && (
            <div className="adm-section">
              <div className="adm-label hot">Directory profiles ({m.length})</div>
              <div className="adm-list">
                {m.map(x => (
                  <div key={x.id} className="adm-approval">
                    <div className="adm-approval-top">
                      {x.photo_url && <img className="adm-avatar" style={{ width: 52, height: 52 }} src={x.photo_url} alt="" />}
                      <div className="adm-approval-body">
                        <div className="adm-row-title" style={{ whiteSpace: 'normal' }}>{x.name}</div>
                        <div className="adm-row-meta" style={{ whiteSpace: 'normal' }}>{sub(x.specialty, x.location)}</div>
                        {x.bio && <div className="adm-approval-bio">{x.bio}</div>}
                        <div className="adm-approval-links">
                          {x.website && <a href={x.website} target="_blank" rel="noopener noreferrer">{x.website}</a>}
                          {x.linkedin && <a href={x.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
                          {x.instagram && <a href={x.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
                        </div>
                      </div>
                      {actions(() => approve('members', x.id, `${x.name} is in the Directory`), () => decline('members', x.id, x.name))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.length > 0 && (
            <div className="adm-section">
              <div className="adm-label hot">Map pins ({p.length})</div>
              <div className="adm-list">
                {p.map(x => (
                  <div key={x.id} className="adm-approval">
                    <div className="adm-approval-top">
                      <div className="adm-approval-body">
                        <div className="adm-row-title" style={{ whiteSpace: 'normal' }}>{x.name}</div>
                        <div className="adm-row-meta" style={{ whiteSpace: 'normal' }}>{x.location}{(() => { const d = describePlacement(x); return <span className={`adm-place ${d.ok ? 'ok' : 'warn'}`}>{d.text}</span> })()}</div>
                      </div>
                      {actions(() => approve('map_pins', x.id, `${x.name} added to the map`), () => decline('map_pins', x.id, x.name))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {l.length > 0 && (
            <div className="adm-section">
              <div className="adm-label hot">Suggested links ({l.length})</div>
              <div className="adm-list">
                {l.map(x => (
                  <div key={x.id} className="adm-approval">
                    <div className="adm-approval-top">
                      <div className="adm-row-icon">{x.emoji || '🔗'}</div>
                      <div className="adm-approval-body">
                        <div className="adm-row-title" style={{ whiteSpace: 'normal' }}>{x.name}</div>
                        <div className="adm-row-meta" style={{ whiteSpace: 'normal' }}>{x.category}</div>
                        {x.description && <div className="adm-approval-bio">{x.description}</div>}
                        {x.url && <div className="adm-approval-links"><a href={x.url} target="_blank" rel="noopener noreferrer">{x.url}</a></div>}
                      </div>
                      {actions(() => approve('links', x.id, `${x.name} is live on Links`), () => decline('links', x.id, x.name))}
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
