import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import SidePanel from '../components/SidePanel'
import { toast } from '../components/Toaster'

const SPECIALTIES = [
  'Brand Films', 'Paid Ads', 'Social Content', 'Event Coverage',
  'Documentary', 'Real Estate', 'Wedding', 'Corporate', 'Music Video', 'Other'
]

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
          <div style={{ height: 11, width: '45%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
          <div style={{ height: 11, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

export default function Directory() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', location: '', specialty: '', bio: '', website: '', linkedin: '', instagram: '', photo_url: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  async function submit() {
    if (!form.name || !form.specialty) { setError('Name and specialty are required.'); return }
    setSaving(true)
    setError('')

    let photo_url = ''
    let photoFailed = false
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filename, photoFile, { contentType: photoFile.type })
      if (uploadError) {
        photoFailed = true
        photo_url = ''
      } else {
        const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(filename)
        photo_url = urlData.publicUrl
      }
    }

    function ensureHttps(url) {
      if (!url) return ''
      url = url.trim()
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) return 'https://' + url
      return url
    }
    const cleanedForm = { ...form, website: ensureHttps(form.website), linkedin: ensureHttps(form.linkedin), instagram: ensureHttps(form.instagram) }
    const { error: insertError } = await supabase.from('members').insert([{ ...cleanedForm, photo_url, approved: false }])
    if (insertError) { setError('Submission failed. Try again.'); setSaving(false); return }
    setSaving(false)
    setShowForm(false)
    setSubmitted(true)
    toast(
      photoFailed
        ? "Profile sent for review — but your photo didn't upload. Ask an admin to add it."
        : "You're in the queue — your profile will appear once it's approved.",
      { duration: photoFailed ? 8000 : 5000, type: photoFailed ? 'error' : 'success' }
    )
  }

  const visible = members.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    m.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">Member Directory</div>
      <p className="section-desc">The people in this room. Find collaborators, referral partners, and peers doing the same work.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Search by name, specialty, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {submitted && <span className="pending-pill">✓ Profile sent for review</span>}
        {!submitted && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: 8, padding: '10px 18px', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,120,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            + Add Yourself
          </button>
        )}
      </div>

      {showForm && (
        <SidePanel
          title="Join the Directory"
          onClose={() => setShowForm(false)}
          onSubmit={submit}
          saving={saving}
          canSave={!!form.name.trim() && !!form.specialty}
          submitLabel="Submit for review"
        >
          <p className="panel-note">Your profile will be reviewed before it goes live — usually within 24 hours.</p>

          <div className="photo-pick">
            <div className="avatar">
              {photoPreview ? <img src={photoPreview} alt="Your photo preview" /> : <span aria-hidden="true">👤</span>}
            </div>
            <div>
              <label className="pick">
                {photoPreview ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
              <div className="more-count" style={{ marginTop: 8 }}>JPG or PNG</div>
            </div>
          </div>

          <div className="adm-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="dir-name">Full name *</label>
              <input id="dir-name" className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Casey Brough" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dir-loc">Location</label>
              <input id="dir-loc" className="form-input" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Charleston, SC" />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="dir-spec">Specialty *</label>
              <select id="dir-spec" className="form-select" value={form.specialty} onChange={e => setField('specialty', e.target.value)}>
                <option value="">Select...</option>
                {SPECIALTIES.map(sp => <option key={sp}>{sp}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="dir-bio">One-line bio</label>
              <input id="dir-bio" className="form-input" value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="I make brand films for service businesses in the Southeast." />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="dir-web">Website</label>
              <input id="dir-web" className="form-input" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="yoursite.com" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dir-li">LinkedIn</label>
              <input id="dir-li" className="form-input" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="linkedin.com/in/yourname" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dir-ig">Instagram</label>
              <input id="dir-ig" className="form-input" value={form.instagram} onChange={e => setField('instagram', e.target.value)} placeholder="instagram.com/yourhandle" />
            </div>
          </div>
          {error && <div className="panel-error">{error}</div>}
        </SidePanel>
      )}

      {/* DIRECTORY GRID */}
      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">{search ? 'No members match that search.' : 'No approved members yet.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {visible.map(m => (
            <div key={m.id} className="card" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,45,120,0.25)', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {m.photo_url
                  ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>👤</span>
                }
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
              {m.location && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{m.location}</div>}
              {m.specialty && (
                <span className="tag tag-pink" style={{ alignSelf: 'center' }}>{m.specialty}</span>
              )}
              {m.bio && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{m.bio}</div>}
              {(m.website || m.linkedin || m.instagram) && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                  {m.website && (
                    <a href={m.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cyan)', background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.22)', borderRadius: 5, padding: '4px 10px', textDecoration: 'none' }}>
                      Website
                    </a>
                  )}
                  {m.linkedin && (
                    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pink)', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.22)', borderRadius: 5, padding: '4px 10px', textDecoration: 'none' }}>
                      LinkedIn
                    </a>
                  )}
                  {m.instagram && (
                    <a href={m.instagram} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B47EFF', background: 'rgba(160,100,255,0.1)', border: '1px solid rgba(160,100,255,0.25)', borderRadius: 5, padding: '4px 10px', textDecoration: 'none' }}>
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
