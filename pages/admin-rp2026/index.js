import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const SECTIONS = ['Recording', 'Resource', 'Event', 'Link', 'Member', 'Map', 'Access', 'Announcement']
const CALL_TYPES = ['Community Call', 'Skills Call', 'Theme Call']
const RES_CATS = ['Templates', 'Guides', 'Scripts', 'Finance']
const EVENT_TYPES = ['Community Call', 'Skills Call', 'Theme Call']
const LINK_CATS = ['Software', 'Gear', 'Finance', 'Education']

const EMPTY = {
  Recording: { title: '', description: '', date: '', duration: '', host: '', video_url: '', call_type: '', sub_topic: '' },
  Resource: { title: '', description: '', category: 'Templates', file_url: '', file_type: 'PDF' },
  Event: { title: '', description: '', event_date: '', time: '', duration: '', type: 'Community Call', platform: 'Zoom', zoom_url: '' },
  Link: { name: '', description: '', url: '', category: 'Software', emoji: '' }
}

const TABLE = { Recording: 'recordings', Resource: 'resources', Event: 'events', Link: 'links' }

// Case-insensitive "does this row match the search box" check across
// whichever fields matter for that list — pass only the fields you want
// searchable (undefined/null ones are dropped automatically).
function matchesSearch(query, ...fields) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.filter(Boolean).join(' ').toLowerCase().includes(q)
}

const searchInputStyle = {
  fontFamily: 'inherit',
  width: '100%',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 14px',
  color: 'var(--text)',
  fontSize: 13,
  marginBottom: 14,
}

export default function Admin() {
  const [section, setSection] = useState('Recording')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(EMPTY['Recording'])
  const [editId, setEditId] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [linkPendingCount, setLinkPendingCount] = useState(0)
  const [pendingMembers, setPendingMembers] = useState([])
  const [approvedMembers, setApprovedMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [memberForm, setMemberForm] = useState({})
  const [savingMember, setSavingMember] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  // Map pins — separate from Members/Directory on purpose (see project notes):
  // someone can be on the map without a full Directory profile and vice versa.
  const [pendingPins, setPendingPins] = useState([])
  const [approvedPins, setApprovedPins] = useState([])
  const [loadingPins, setLoadingPins] = useState(false)
  const [editingPin, setEditingPin] = useState(null)
  const [pinForm, setPinForm] = useState({})
  const [savingPin, setSavingPin] = useState(false)
  const [pinSearch, setPinSearch] = useState('')

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  // Login Access (authorized emails)
  const [authorizedEmails, setAuthorizedEmails] = useState([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [singleEmail, setSingleEmail] = useState('')
  const [singleName, setSingleName] = useState('')
  const [savingAccess, setSavingAccess] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [accessSearch, setAccessSearch] = useState('')

  useEffect(() => {
    if (section === 'Member') {
      loadMembers()
    } else if (section === 'Map') {
      loadPins()
    } else if (section === 'Announcement') {
      loadAnnouncements()
    } else if (section === 'Access') {
      loadAccess()
    } else {
      setForm(EMPTY[section])
      setEditId(null)
      setSuccess('')
      loadItems()
    }
  }, [section])

  async function loadItems() {
    setLoadingItems(true)
    const orderCol = section === 'Event' ? 'event_date' : 'created_at'
    const { data } = await supabase.from(TABLE[section]).select('*').order(orderCol, { ascending: false })
    setItems(data || [])
    if (section === 'Link') setLinkPendingCount((data || []).filter(i => !i.approved).length)
    setLoadingItems(false)
  }

  async function approveLink(id) {
    await supabase.from('links').update({ approved: true }).eq('id', id)
    setSuccess('Link approved.')
    loadItems()
  }

  async function declineLink(id) {
    if (!confirm('Decline and delete this suggestion?')) return
    await supabase.from('links').delete().eq('id', id)
    setSuccess('Declined.')
    loadItems()
  }

  async function loadMembers() {
    setLoadingMembers(true)
    const { data: pending } = await supabase.from('members').select('*').eq('approved', false).order('created_at', { ascending: false })
    const { data: approved } = await supabase.from('members').select('*').eq('approved', true).order('created_at', { ascending: false })
    setPendingMembers(pending || [])
    setApprovedMembers(approved || [])
    setLoadingMembers(false)
  }

  async function loadPins() {
    setLoadingPins(true)
    const { data: pending } = await supabase.from('map_pins').select('*').eq('approved', false).order('created_at', { ascending: false })
    const { data: approved } = await supabase.from('map_pins').select('*').eq('approved', true).order('created_at', { ascending: false })
    setPendingPins(pending || [])
    setApprovedPins(approved || [])
    setLoadingPins(false)
  }

  async function approvePin(id) {
    await supabase.from('map_pins').update({ approved: true }).eq('id', id)
    setSuccess('Added to the map.')
    loadPins()
  }

  async function deletePin(id) {
    if (!confirm('Delete this map pin?')) return
    await supabase.from('map_pins').delete().eq('id', id)
    setSuccess('Deleted.')
    loadPins()
  }

  async function savePin() {
    setSavingPin(true)
    const { id, created_at, ...rest } = pinForm
    await supabase.from('map_pins').update(rest).eq('id', pinForm.id)
    setSavingPin(false)
    setEditingPin(null)
    setSuccess('Pin updated.')
    loadPins()
  }

  async function loadAnnouncements() {
    setLoadingAnnouncements(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoadingAnnouncements(false)
  }

  async function postAnnouncement() {
    if (!announcementText.trim()) return
    setSavingAnnouncement(true)
    const { error } = await supabase.from('announcements').insert([{ message: announcementText.trim(), archived: false }])
    if (!error) {
      setAnnouncementText('')
      setSuccess('Posted.')
      loadAnnouncements()
    } else {
      setSuccess(`Error: ${error.message}`)
    }
    setSavingAnnouncement(false)
  }

  async function archiveAnnouncement(id) {
    await supabase.from('announcements').update({ archived: true }).eq('id', id)
    setSuccess('Archived.')
    loadAnnouncements()
  }

  async function unarchiveAnnouncement(id) {
    await supabase.from('announcements').update({ archived: false }).eq('id', id)
    setSuccess('Restored.')
    loadAnnouncements()
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement permanently?')) return
    await supabase.from('announcements').delete().eq('id', id)
    setSuccess('Deleted.')
    loadAnnouncements()
  }

  async function loadAccess() {
    setLoadingAccess(true)
    const { data } = await supabase.from('authorized_emails').select('*').order('created_at', { ascending: false })
    setAuthorizedEmails(data || [])
    setLoadingAccess(false)
  }

  async function addSingleEmail() {
    const email = singleEmail.trim().toLowerCase()
    if (!email) return
    setSavingAccess(true)
    const { error } = await supabase.from('authorized_emails').upsert([{ email, name: singleName.trim() || null }], { onConflict: 'email' })
    setSavingAccess(false)
    if (error) { setSuccess(`Error: ${error.message}`); return }
    setSingleEmail('')
    setSingleName('')
    setSuccess('Email added.')
    loadAccess()
  }

  async function removeEmail(id) {
    if (!confirm('Remove this email? They will lose access.')) return
    await supabase.from('authorized_emails').delete().eq('id', id)
    setSuccess('Removed.')
    loadAccess()
  }

  function parseBulkEmails(text) {
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const seen = new Set()
    const rows = []
    for (const line of lines) {
      const match = line.match(emailRe)
      if (!match) continue
      const email = match[0].toLowerCase()
      if (seen.has(email)) continue
      seen.add(email)
      const rest = line.replace(match[0], '').replace(/["',]+/g, ' ').replace(/\s+/g, ' ').trim()
      rows.push({ email, name: rest || null })
    }
    return rows
  }

  function previewBulk() {
    const rows = parseBulkEmails(bulkText)
    setBulkPreview(rows)
  }

  async function confirmBulkImport() {
    if (!bulkPreview || bulkPreview.length === 0) return
    setBulkSaving(true)
    const { error } = await supabase.from('authorized_emails').upsert(bulkPreview, { onConflict: 'email' })
    setBulkSaving(false)
    if (error) { setSuccess(`Error: ${error.message}`); return }
    setSuccess(`Imported ${bulkPreview.length} email${bulkPreview.length === 1 ? '' : 's'}.`)
    setBulkText('')
    setBulkPreview(null)
    loadAccess()
  }

  async function approveMember(id) {
    await supabase.from('members').update({ approved: true }).eq('id', id)
    setSuccess('Member approved.')
    loadMembers()
  }

  async function deleteMember(id) {
    if (!confirm('Delete this member?')) return
    await supabase.from('members').delete().eq('id', id)
    setSuccess('Deleted.')
    loadMembers()
  }

  async function saveMember() {
    setSavingMember(true)
    const { id, created_at, ...rest } = memberForm
    await supabase.from('members').update(rest).eq('id', memberForm.id)
    setSavingMember(false)
    setEditingMember(null)
    setSuccess('Member updated.')
    loadMembers()
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function startEdit(item) {
    setEditId(item.id)
    const { id, created_at, ...rest } = item
    setForm({ ...EMPTY[section], ...rest })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY[section])
    setSuccess('')
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return
    await supabase.from(TABLE[section]).delete().eq('id', id)
    setSuccess('Deleted.')
    loadItems()
  }

  async function save() {
    setSaving(true)
    setSuccess('')
    let error
    if (editId) {
      ;({ error } = await supabase.from(TABLE[section]).update(form).eq('id', editId))
      if (!error) { setEditId(null); setForm(EMPTY[section]); setSuccess('Updated.') }
    } else {
      // Links added directly by admin go live immediately — the approval
      // step only applies to member-submitted suggestions from /links.
      const payload = section === 'Link' ? { ...form, approved: true } : form
      ;({ error } = await supabase.from(TABLE[section]).insert([payload]))
      if (!error) { setForm(EMPTY[section]); setSuccess(`${section} added.`) }
    }
    setSaving(false)
    if (error) setSuccess(`Error: ${error.message}`)
    else loadItems()
  }

  const inp = { fontFamily: 'inherit' }

  const linkPending = section === 'Link' ? items.filter(i => !i.approved) : []
  const displayedItems = section === 'Link' ? items.filter(i => i.approved) : items

  const filteredMembers = approvedMembers.filter(m => matchesSearch(memberSearch, m.name, m.location, m.specialty))
  const filteredPins = approvedPins.filter(p => matchesSearch(pinSearch, p.name, p.location))
  const filteredEmails = authorizedEmails.filter(a => matchesSearch(accessSearch, a.name, a.email))

  function getItemLabel(item) { return item.title || item.name || '(untitled)' }
  function getItemMeta(item) {
    if (section === 'Recording') {
      const type = item.call_type ? (item.sub_topic ? `${item.call_type} · ${item.sub_topic}` : item.call_type) : ''
      return [item.date, item.duration ? item.duration : '', type].filter(Boolean).join(' · ')
    }
    if (section === 'Resource') return `${item.category || ''} · ${item.file_type || ''}`
    if (section === 'Event') return `${item.event_date || ''} ${item.time ? '· ' + item.time : ''}`
    if (section === 'Link') return `${item.category || ''}`
    return ''
  }

  const activeAnnouncements = announcements.filter(a => !a.archived)
  const archivedAnnouncements = announcements.filter(a => a.archived)

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 36px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--pink)', textShadow: '0 0 44px rgba(255,45,120,0.8)', marginBottom: 4 }}>The Rad Pad</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Admin Panel</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <button key={s} className={`filter-tag${section === s ? ' active' : ''}`} onClick={() => setSection(s)}>
              {s === 'Member' ? `Members ${pendingMembers.length > 0 ? `(${pendingMembers.length} pending)` : ''}`
                : s === 'Map' ? `Map Pins ${pendingPins.length > 0 ? `(${pendingPins.length} pending)` : ''}`
                : s === 'Link' ? `Links ${linkPendingCount > 0 ? `(${linkPendingCount} pending)` : ''}`
                : s === 'Access' ? `Login Access (${authorizedEmails.length})`
                : `${s}s`}
            </button>
          ))}
        </div>

        {/* ANNOUNCEMENTS */}
        {section === 'Announcement' && (
          <div>
            {success && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: success.startsWith('Error') ? 'var(--pink)' : 'var(--cyan)', marginBottom: 16 }}>{success}</div>}

            <div className="admin-form" style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 16 }}>Post Announcement</h2>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea"
                  style={{ fontFamily: 'inherit', minHeight: 120 }}
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  placeholder="What do you want the community to know..."
                />
              </div>
              <button
                className="submit-btn"
                style={{ margin: 0, marginTop: 12 }}
                onClick={postAnnouncement}
                disabled={savingAnnouncement || !announcementText.trim()}
              >
                {savingAnnouncement ? 'Posting...' : 'Post to Bulletin Board'}
              </button>
            </div>

            {/* Active */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pink)', marginBottom: 12 }}>
              Live ({activeAnnouncements.length})
            </div>
            {loadingAnnouncements ? (
              <div className="loading">Loading...</div>
            ) : activeAnnouncements.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 32 }}>Nothing posted yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 36 }}>
                {activeAnnouncements.map(a => (
                  <div key={a.id} style={{ background: 'rgba(255,45,120,0.04)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--pink)', marginBottom: 8, letterSpacing: '0.1em' }}>{formatDate(a.created_at)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{a.message}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => archiveAnnouncement(a.id)} style={{ background: 'rgba(216,212,232,0.08)', border: '1px solid rgba(216,212,232,0.2)', borderRadius: 6, padding: '5px 12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Archive</button>
                      <button onClick={() => deleteAnnouncement(a.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '5px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Archived */}
            {archivedAnnouncements.length > 0 && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
                  Archived ({archivedAnnouncements.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {archivedAnnouncements.map(a => (
                    <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', opacity: 0.7 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.1em' }}>{formatDate(a.created_at)}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{a.message}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => unarchiveAnnouncement(a.id)} style={{ background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '5px 12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Restore</button>
                        <button onClick={() => deleteAnnouncement(a.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '5px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* MEMBER APPROVALS */}
        {section === 'Member' && (
          <div>
            {success && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginBottom: 16 }}>{success}</div>}

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pink)', marginBottom: 12 }}>
              Pending Approval ({pendingMembers.length})
            </div>
            {loadingMembers ? <div className="loading">Loading...</div> : pendingMembers.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 32 }}>No pending submissions.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                {pendingMembers.map(m => (
                  <div key={m.id} style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    {m.photo_url && (
                      <img src={m.photo_url} alt={m.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{m.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                        {[m.specialty, m.location].filter(Boolean).join(' · ')}
                      </div>
                      {m.bio && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{m.bio}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', textDecoration: 'none' }}>{m.website}</a>}
                        {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', textDecoration: 'none' }}>LinkedIn</a>}
                        {m.instagram && <a href={m.instagram} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', textDecoration: 'none' }}>Instagram</a>}
                      </div>
                    </div>
                    <button onClick={() => approveMember(m.id)} style={{ background: 'rgba(0,245,228,0.1)', border: '1px solid rgba(0,245,228,0.3)', borderRadius: 6, padding: '7px 14px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Approve
                    </button>
                    <button onClick={() => deleteMember(m.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '7px 14px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              Approved Members ({memberSearch.trim() ? `${filteredMembers.length} of ${approvedMembers.length}` : approvedMembers.length})
            </div>
            {approvedMembers.length > 5 && (
              <input
                type="text"
                placeholder="Search by name, location, or specialty…"
                style={searchInputStyle}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            )}
            {memberSearch.trim() && filteredMembers.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>No matches.</div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredMembers.map(m => (
                <div key={m.id}>
                  {editingMember === m.id ? (
                    <div style={{ background: 'var(--card)', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 10, padding: '16px 18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div className="form-group"><label className="form-label">Name</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.name || ''} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Location</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.location || ''} onChange={e => setMemberForm(f => ({ ...f, location: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Specialty</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.specialty || ''} onChange={e => setMemberForm(f => ({ ...f, specialty: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Website</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.website || ''} onChange={e => setMemberForm(f => ({ ...f, website: e.target.value }))} /></div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Bio</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.bio || ''} onChange={e => setMemberForm(f => ({ ...f, bio: e.target.value }))} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <div className="form-group"><label className="form-label">LinkedIn</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.linkedin || ''} onChange={e => setMemberForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Instagram</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={memberForm.instagram || ''} onChange={e => setMemberForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveMember} disabled={savingMember} style={{ background: 'var(--pink)', border: 'none', borderRadius: 6, padding: '7px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{savingMember ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {m.photo_url && <img src={m.photo_url} alt={m.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{[m.specialty, m.location].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button onClick={() => { setEditingMember(m.id); setMemberForm(m) }} style={{ background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Edit</button>
                      <button onClick={() => deleteMember(m.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* MAP PINS */}
        {section === 'Map' && (
          <div>
            {success && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginBottom: 16 }}>{success}</div>}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Submissions from the "Add Yourself To The Map" button on /map. Separate from Directory — approving here only adds a pin, it doesn't create or touch a Directory profile.
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pink)', marginBottom: 12 }}>
              Pending Approval ({pendingPins.length})
            </div>
            {loadingPins ? <div className="loading">Loading...</div> : pendingPins.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 32 }}>No pending submissions.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                {pendingPins.map(p => (
                  <div key={p.id} style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{p.location}</div>
                    </div>
                    <button onClick={() => approvePin(p.id)} style={{ background: 'rgba(0,245,228,0.1)', border: '1px solid rgba(0,245,228,0.3)', borderRadius: 6, padding: '7px 14px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Approve
                    </button>
                    <button onClick={() => deletePin(p.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '7px 14px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              On The Map ({pinSearch.trim() ? `${filteredPins.length} of ${approvedPins.length}` : approvedPins.length})
            </div>
            {approvedPins.length > 5 && (
              <input
                type="text"
                placeholder="Search by name or location…"
                style={searchInputStyle}
                value={pinSearch}
                onChange={e => setPinSearch(e.target.value)}
              />
            )}
            {pinSearch.trim() && filteredPins.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>No matches.</div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredPins.map(p => (
                <div key={p.id}>
                  {editingPin === p.id ? (
                    <div style={{ background: 'var(--card)', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 10, padding: '16px 18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <div className="form-group"><label className="form-label">Name</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={pinForm.name || ''} onChange={e => setPinForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Location</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={pinForm.location || ''} onChange={e => setPinForm(f => ({ ...f, location: e.target.value }))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={savePin} disabled={savingPin} style={{ background: 'var(--pink)', border: 'none', borderRadius: 6, padding: '7px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{savingPin ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => setEditingPin(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{p.location}</div>
                      </div>
                      <button onClick={() => { setEditingPin(p.id); setPinForm(p) }} style={{ background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Edit</button>
                      <button onClick={() => deletePin(p.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* LOGIN ACCESS */}
        {section === 'Access' && (
          <div>
            {success && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: success.startsWith('Error') ? 'var(--pink)' : 'var(--cyan)', marginBottom: 16 }}>{success}</div>}
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              This is just the list of emails allowed to log in — it doesn't touch the public Directory. Add people one at a time, or paste a whole CSV export and bulk-import it.
            </div>

            <div className="admin-form" style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 16 }}>Add One Email</h2>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" style={{ fontFamily: 'inherit' }} value={singleEmail} onChange={e => setSingleEmail(e.target.value)} placeholder="member@email.com" /></div>
                <div className="form-group"><label className="form-label">Name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label><input className="form-input" style={{ fontFamily: 'inherit' }} value={singleName} onChange={e => setSingleName(e.target.value)} placeholder="Jamie Smith" /></div>
              </div>
              <button className="submit-btn" style={{ margin: 0, marginTop: 8 }} onClick={addSingleEmail} disabled={savingAccess || !singleEmail.trim()}>
                {savingAccess ? 'Adding...' : 'Add Email'}
              </button>
            </div>

            <div className="admin-form" style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 8 }}>Bulk Import</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Paste your Slack member export here (or any list with emails in it — one row per line). We'll pull out the emails automatically.
              </div>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  style={{ fontFamily: 'inherit', minHeight: 160 }}
                  value={bulkText}
                  onChange={e => { setBulkText(e.target.value); setBulkPreview(null) }}
                  placeholder="Jamie Smith, jamie@email.com&#10;Alex Rivera, alex@email.com&#10;..."
                />
              </div>
              {!bulkPreview ? (
                <button className="submit-btn" style={{ margin: 0, marginTop: 8 }} onClick={previewBulk} disabled={!bulkText.trim()}>
                  Preview Import
                </button>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {bulkPreview.length === 0 ? (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)' }}>No email addresses found in that text.</div>
                  ) : (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginBottom: 10 }}>
                        Found {bulkPreview.length} email{bulkPreview.length === 1 ? '' : 's'} — review below, then confirm.
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
                        {bulkPreview.map((r, i) => (
                          <div key={i} style={{ padding: '8px 14px', borderBottom: i < bulkPreview.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span>{r.name || <span style={{ color: 'var(--muted)' }}>(no name)</span>}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{r.email}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="submit-btn" style={{ margin: 0 }} onClick={confirmBulkImport} disabled={bulkSaving}>
                          {bulkSaving ? 'Importing...' : `Import ${bulkPreview.length} Email${bulkPreview.length === 1 ? '' : 's'}`}
                        </button>
                        <button onClick={() => setBulkPreview(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              Authorized Emails ({accessSearch.trim() ? `${filteredEmails.length} of ${authorizedEmails.length}` : authorizedEmails.length})
            </div>
            {authorizedEmails.length > 5 && (
              <input
                type="text"
                placeholder="Search by name or email…"
                style={searchInputStyle}
                value={accessSearch}
                onChange={e => setAccessSearch(e.target.value)}
              />
            )}
            {loadingAccess ? <div className="loading">Loading...</div> : authorizedEmails.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>No one added yet.</div>
            ) : accessSearch.trim() && filteredEmails.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>No matches.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredEmails.map(a => (
                  <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {a.name && <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{a.name}</div>}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{a.email}</div>
                    </div>
                    <button onClick={() => removeEmail(a.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTENT FORMS */}
        {section !== 'Member' && section !== 'Map' && section !== 'Announcement' && section !== 'Access' && (
          <>
            <div className="admin-form">
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center' }}>
                {editId ? `Edit ${section}` : `Add ${section}`}
                {editId && (
                  <button onClick={cancelEdit} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancel</button>
                )}
              </h2>

              {section === 'Recording' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Title *</label><input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Q2 Sales Sprint..." /></div>
                    <div className="form-group"><label className="form-label">Host</label><input className="form-input" style={inp} value={form.host || ''} onChange={e => setField('host', e.target.value)} placeholder="Casey" /></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} /></div></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Date</label><input className="form-input" style={inp} type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Duration</label><input className="form-input" style={inp} value={form.duration || ''} onChange={e => setField('duration', e.target.value)} placeholder="58m" /></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Video URL</label><input className="form-input" style={inp} value={form.video_url || ''} onChange={e => setField('video_url', e.target.value)} placeholder="https://..." /></div></div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Call Type</label>
                      <select className="form-select" style={inp} value={form.call_type || ''} onChange={e => setField('call_type', e.target.value)}>
                        <option value="">Select type...</option>
                        {CALL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    {(form.call_type === 'Skills Call' || form.call_type === 'Theme Call') && (
                      <div className="form-group">
                        <label className="form-label">Sub-topic <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                        <input className="form-input" style={inp} value={form.sub_topic || ''} onChange={e => setField('sub_topic', e.target.value)} placeholder={form.call_type === 'Skills Call' ? 'e.g. DaVinci Resolve' : 'e.g. Pricing'} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {section === 'Resource' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Title *</label><input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Discovery Call Script" /></div>
                    <div className="form-group"><label className="form-label">Category</label><select className="form-select" style={inp} value={form.category || 'Templates'} onChange={e => setField('category', e.target.value)}>{RES_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} /></div></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">File / Link URL</label><input className="form-input" style={inp} value={form.file_url || ''} onChange={e => setField('file_url', e.target.value)} placeholder="https://..." /></div>
                    <div className="form-group"><label className="form-label">File Type</label><select className="form-select" style={inp} value={form.file_type || 'PDF'} onChange={e => setField('file_type', e.target.value)}>{['PDF', 'Notion', 'Google Sheets', 'Google Doc', 'Link'].map(t => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </>
              )}

              {section === 'Event' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Title *</label><input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Weekly Group Call" /></div>
                    <div className="form-group"><label className="form-label">Type</label><select className="form-select" style={inp} value={form.type || 'Community Call'} onChange={e => setField('type', e.target.value)}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} /></div></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Date</label><input className="form-input" style={inp} type="date" value={form.event_date || ''} onChange={e => setField('event_date', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Time</label><input className="form-input" style={inp} value={form.time || ''} onChange={e => setField('time', e.target.value)} placeholder="12:00 PM EST" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Duration</label><input className="form-input" style={inp} value={form.duration || ''} onChange={e => setField('duration', e.target.value)} placeholder="90 min" /></div>
                    <div className="form-group"><label className="form-label">Platform</label><input className="form-input" style={inp} value={form.platform || ''} onChange={e => setField('platform', e.target.value)} placeholder="Zoom" /></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Zoom Link (members click to join)</label><input className="form-input" style={inp} value={form.zoom_url || ''} onChange={e => setField('zoom_url', e.target.value)} placeholder="https://zoom.us/j/..." /></div></div>
                </>
              )}

              {section === 'Link' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" style={inp} value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="HoneyBook" /></div>
                    <div className="form-group"><label className="form-label">Category</label><select className="form-select" style={inp} value={form.category || 'Software'} onChange={e => setField('category', e.target.value)}>{LINK_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
                  </div>
                  <div className="form-row single"><div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} /></div></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">URL *</label><input className="form-input" style={inp} value={form.url || ''} onChange={e => setField('url', e.target.value)} placeholder="https://..." /></div>
                    <div className="form-group"><label className="form-label">Emoji</label><input className="form-input" style={inp} value={form.emoji || ''} onChange={e => setField('emoji', e.target.value)} placeholder="📋" /></div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                <button className="submit-btn" style={{ margin: 0 }} onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Save Changes' : `Add ${section}`}
                </button>
                {editId && <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancel</button>}
              </div>
              {success && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: success.startsWith('Error') ? 'var(--pink)' : 'var(--cyan)', marginTop: 12 }}>{success}</div>}
            </div>

            {section === 'Link' && linkPending.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pink)', marginBottom: 12 }}>
                  Pending Suggestions ({linkPending.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                  {linkPending.map(item => (
                    <div key={item.id} style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji || '🔗'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{item.category}</div>
                        {item.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.description}</div>}
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)' }}>{item.url}</a>}
                      </div>
                      <button onClick={() => approveLink(item.id)} style={{ background: 'rgba(0,245,228,0.1)', border: '1px solid rgba(0,245,228,0.3)', borderRadius: 6, padding: '7px 14px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Approve
                      </button>
                      <button onClick={() => declineLink(item.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '7px 14px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Existing {section}s ({displayedItems.length})</div>
              {loadingItems ? <div className="loading">Loading...</div> : displayedItems.length === 0 ? <div className="empty">None yet.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayedItems.map(item => (
                    <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{getItemLabel(item)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.05em' }}>{getItemMeta(item)}</div>
                      </div>
                      <button onClick={() => startEdit(item)} style={{ background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Edit</button>
                      <button onClick={() => deleteItem(item.id)} style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 32 }}>Keep this URL private.</div>
      </div>
    </div>
  )
}
