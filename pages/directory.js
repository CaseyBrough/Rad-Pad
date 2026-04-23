import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

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
  const [form, setForm] = useState({ name: '', location: '', specialty: '', bio: '', website: '', linkedin: '', photo_url: '' })
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
    if (file.size > 3 * 1024 * 1024) { setError('Photo must be under 3MB.'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  async function submit() {
    if (!form.name || !form.specialty) { setError('Name and specialty are required.'); return }
    setSaving(true)
    setError('')

    let photo_url = ''
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filename, photoFile, { contentType: photoFile.type })
      if (uploadError) { setError('Photo upload failed. Try a smaller image.'); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(filename)
      photo_url = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('members').insert([{ ...form, photo_url, approved: false }])
    if (insertError) { setError('Submission failed. Try again.'); setSaving(false); return }
    setSaving(false)
    setSubmitted(true)
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
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: 8, padding: '10px 18px', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,120,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            + Add Yourself
          </button>
        )}
      </div>

      {/* SUBMIT FORM */}
      {showForm && !submitted && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.25)', borderRadius: 14, padding: 28, marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', marginBottom: 6 }}>Join the Directory</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>Your profile will be reviewed before it goes live — usually within 24 hours.</div>

          {/* Photo upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: photoPreview ? 'transparent' : 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoPreview
                ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24 }}>👤</span>
              }
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.22)', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', display: 'inline-block' }}>
                Upload Photo
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.05em' }}>JPG or PNG, max 3MB</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Casey Brough" style={{ fontFamily: 'inherit' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Charleston, SC" style={{ fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }} className="form-group">
            <label className="form-label">Specialty *</label>
            <select className="form-select" value={form.specialty} onChange={e => setField('specialty', e.target.value)} style={{ fontFamily: 'inherit' }}>
              <option value="">Select...</option>
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }} className="form-group">
            <label className="form-label">One-line bio</label>
            <input className="form-input" value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="I make brand films for service businesses in the Southeast." style={{ fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://..." style={{ fontFamily: 'inherit' }} />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn</label>
              <input className="form-input" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." style={{ fontFamily: 'inherit' }} />
            </div>
          </div>

          {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)', marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="submit-btn" style={{ margin: 0 }} onClick={submit} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ background: 'rgba(0,245,228,0.06)', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 14, padding: '28px 32px', marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.04em', marginBottom: 8 }}>You're in the queue</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>Your profile has been submitted for review. You'll appear in the directory once it's approved — usually within 24 hours.</div>
        </div>
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
              {m.location && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{m.location}</div>}
              {m.specialty && (
                <span className="tag tag-pink" style={{ alignSelf: 'center' }}>{m.specialty}</span>
              )}
              {m.bio && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{m.bio}</div>}
              {(m.website || m.linkedin) && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                  {m.website && (
                    <a href={m.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cyan)', background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.22)', borderRadius: 5, padding: '4px 10px', textDecoration: 'none' }}>
                      Website
                    </a>
                  )}
                  {m.linkedin && (
                    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pink)', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.22)', borderRadius: 5, padding: '4px 10px', textDecoration: 'none' }}>
                      LinkedIn
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
