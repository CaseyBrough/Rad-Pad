import { useState, useMemo, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { parseLocation, classifyIntl, REGION_FULL_NAMES, CA_PROVINCE_CODES } from '../lib/geo'
import { US_NATION_D, US_STATE_LINES_D, CANADA_D, CANADA_PROVINCE_LINES_D, MEXICO_D } from '../lib/mapPaths'

// 2026-08-27: the old hand-researched seed list (57 people) and the
// international rail list (4 people) were migrated into the map_pins
// Supabase table as pre-approved rows — see admin's Map Pins tab. Keeping
// everyone in one editable table means a wrong pin no longer needs a code
// change to fix, and it's the only source of truth for the map now.

const LON_MIN = -172, LON_MAX = -52, LAT_MIN = 14, LAT_MAX = 75.5
const W = 1000, H = 600
function project(lat, lon) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H
  return [x, y]
}

function initialsOf(name) {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function placeMembers(members) {
  const groups = {}
  members.forEach(m => {
    const k = `${Math.round(m.lat * 4)}|${Math.round(m.lon * 4)}`
    ;(groups[k] = groups[k] || []).push(m)
  })
  const placed = []
  Object.values(groups).forEach(group => {
    const [bx, by] = project(group[0].lat, group[0].lon)
    const n = group.length
    group.forEach((m, i) => {
      let ox = 0, oy = 0
      if (n > 1) {
        const spread = Math.min(11 + n * 1.2, 26)
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        ox = Math.cos(angle) * spread
        oy = Math.sin(angle) * spread * 0.6
      }
      placed.push({ ...m, x: bx + ox, y: by + oy - 14, stemX: bx + ox, stemY: by + oy })
    })
  })
  return placed
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

// Search matches name, city, state/province (either "TX" or "Texas"), and country.
function matchesQuery(m, f) {
  if (!f) return true
  const regionFull = REGION_FULL_NAMES[(m.region || '').toUpperCase()]
  const hay = [m.name, m.city, m.region, m.country, regionFull].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(f)
}

// A simple "off-map" rail for the handful of members outside North America —
// not a world map, just a labeled strip of initials bubbles to the side.
function SideRail({ label, members }) {
  if (members.length === 0) return null
  return (
    <div style={{
      flex: '0 0 74px',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '12px 6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </div>
      {members.map(m => (
        <div key={m.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }} title={m.location}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(0,245,228,0.55)', color: '#04201d',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initialsOf(m.name)}
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--muted)', lineHeight: 1.25 }}>{m.name.split(' ')[0]}</div>
        </div>
      ))}
    </div>
  )
}

export default function MemberMap() {
  const [search, setSearch] = useState('')
  const [activeIdx, setActiveIdx] = useState(null)
  const [selfReported, setSelfReported] = useState([])
  const [intlSelfReported, setIntlSelfReported] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const vx = ((e.clientX - rect.left) / rect.width) * W
      const vy = ((e.clientY - rect.top) / rect.height) * H
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      setZoom(prevZoom => {
        const newZoom = clamp(prevZoom * factor, 1, 8)
        setPan(prevPan => ({
          x: vx - (newZoom / prevZoom) * (vx - prevPan.x),
          y: vy - (newZoom / prevZoom) * (vy - prevPan.y),
        }))
        return newZoom
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomButton(factor) {
    setZoom(prevZoom => {
      const newZoom = clamp(prevZoom * factor, 1, 8)
      setPan(prevPan => ({
        x: W / 2 - (newZoom / prevZoom) * (W / 2 - prevPan.x),
        y: H / 2 - (newZoom / prevZoom) * (H / 2 - prevPan.y),
      }))
      return newZoom
    })
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }) }

  function handleMouseDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsDragging(true)
  }
  function handleMouseMove(e) {
    if (!dragRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * W
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * H
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }
  function handleMouseUp() {
    dragRef.current = null
    setIsDragging(false)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('map_pins')
        .select('name, location')
        .eq('approved', true)
      const naPins = []
      const intlPins = []
      ;(data || []).forEach(m => {
        const parsed = parseLocation(m.location)
        if (parsed) {
          naPins.push({
            name: m.name,
            city: parsed.city,
            region: parsed.region || '',
            country: CA_PROVINCE_CODES.has(parsed.region) ? 'Canada' : 'USA',
            // 'precise' = matched an actual city; 'approximate' = no city
            // match, fell back to the whole state/province's centroid —
            // this is what used to show up as a pin hundreds of miles off.
            confidence: parsed.precision === 'city' ? 'precise' : 'approximate',
            lat: parsed.lat,
            lon: parsed.lon,
          })
          return
        }
        const region = classifyIntl(m.location)
        if (region) {
          intlPins.push({ name: m.name, location: m.location, region })
        }
        // else: couldn't place it on the map or a rail — still lives in the
        // map_pins admin queue, just not visualized here.
      })
      setSelfReported(naPins)
      setIntlSelfReported(intlPins)
    }
    load()
  }, [])

  const MEMBERS = selfReported
  const INTL_MERGED = intlSelfReported

  const placed = useMemo(() => placeMembers(MEMBERS), [MEMBERS])
  const sorted = useMemo(() => [...placed].sort((a, b) => a.name.localeCompare(b.name)), [placed])

  const f = search.trim().toLowerCase()
  const matchSet = new Set(
    placed
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => matchesQuery(m, f))
      .map(({ i }) => i)
  )

  const preciseCount = MEMBERS.filter(m => m.confidence === 'precise').length
  const approximateCount = MEMBERS.filter(m => m.confidence === 'approximate').length

  function pinFill(confidence) {
    return confidence === 'precise' ? 'var(--pink)' : 'rgba(255,45,120,0.45)'
  }

  async function submitLocation() {
    if (!name.trim() || !location.trim()) {
      setFormError('Name and location are required.')
      return
    }
    setSaving(true)
    setFormError('')
    const { error } = await supabase.from('map_pins').insert([{ name: name.trim(), location: location.trim(), approved: false }])
    if (error) {
      setFormError('Submission failed. Try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setSubmitted(true)
  }

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">Where The Pad Actually Is</div>
      <p className="section-desc">
        {placed.length} members mapped — {preciseCount} placed at their exact city
        {approximateCount > 0 ? `, ${approximateCount} approximate (city not recognized, showing state/province center instead)` : ''}. Not on here yet? Add yourself below.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: 8, padding: '10px 18px', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,120,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            + Add Yourself To The Map
          </button>
        )}
      </div>

      {showForm && !submitted && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.25)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.04em', marginBottom: 6 }}>Add Yourself</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>Just for the map — separate from your Directory listing. Reviewed before it goes live, usually within 24 hours.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Casey O'Farrell" style={{ fontFamily: 'inherit' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Charleston, SC" style={{ fontFamily: 'inherit' }} />
            </div>
          </div>
          {formError && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)', marginBottom: 12 }}>{formError}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="submit-btn" style={{ margin: 0 }} onClick={submitLocation} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ background: 'rgba(0,245,228,0.06)', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 14, padding: '24px 28px', marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>📍</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, letterSpacing: '0.04em', marginBottom: 6 }}>You're in the queue</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Your pin will appear once it's approved.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap', marginBottom: 18 }}>
        <SideRail label="Oceania" members={INTL_MERGED.filter(i => i.region === 'oceania')} />
        <div style={{
          position: 'relative',
          flex: '1 1 260px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <radialGradient id="mapGlow" cx="30%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(0,245,228,0.10)" />
              <stop offset="100%" stopColor="rgba(0,245,228,0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#mapGlow)" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <path d={CANADA_D} fill="rgba(240,235,248,0.05)" stroke="rgba(0,245,228,0.2)" strokeWidth={1.1 / zoom} />
          <path d={MEXICO_D} fill="rgba(240,235,248,0.05)" stroke="rgba(0,245,228,0.2)" strokeWidth={1.1 / zoom} />
          <path d={US_NATION_D} fill="rgba(240,235,248,0.05)" stroke="rgba(0,245,228,0.28)" strokeWidth={1.3 / zoom} />
          <path d={US_STATE_LINES_D} fill="none" stroke="rgba(0,245,228,0.16)" strokeWidth={0.6 / zoom} />
          <path d={CANADA_PROVINCE_LINES_D} fill="none" stroke="rgba(0,245,228,0.16)" strokeWidth={0.6 / zoom} />
          {placed.map((m, i) => {
            const dimmed = f && !matchSet.has(i)
            const isActive = activeIdx === i
            // Pins stay a constant screen size (divide by zoom to cancel the
            // group's scale) while their positions still spread apart as you
            // zoom in — that's what actually untangles overlapping same-city
            // pins, since scaling everything uniformly would keep the same
            // relative overlap at any zoom level.
            const inv = 1 / zoom
            const rBase = (isActive ? 12 : 10.5) * inv
            return (
              <g
                key={i}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 120ms ease' }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <line x1={m.x} y1={m.y + 7 * inv} x2={m.stemX} y2={m.stemY} stroke="rgba(216,212,232,0.55)" strokeWidth={1.2 * inv} />
                <circle cx={m.stemX} cy={m.stemY} r={1.6 * inv} fill="rgba(216,212,232,0.7)" />
                <circle
                  cx={m.x} cy={m.y} r={rBase}
                  fill={pinFill(m.confidence)}
                  stroke="var(--card)"
                  strokeWidth={2 * inv}
                  style={{
                    transition: 'r 120ms ease, filter 120ms ease',
                    filter: isActive ? `drop-shadow(0 0 ${8 * inv}px var(--pink-glow-soft))` : 'none',
                  }}
                />
                <text
                  x={m.x} y={m.y + 0.5 * inv}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="var(--font-mono)" fontWeight="500" fontSize={9.5 * inv}
                  fill="#1a0511"
                  style={{ pointerEvents: 'none' }}
                >
                  {initialsOf(m.name)}
                </text>
                {isActive && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={m.x - 62 * inv} y={m.y - 40 * inv} width={124 * inv} height={30 * inv} rx={6 * inv}
                      fill="#09070D" stroke="var(--border)"
                    />
                    <text x={m.x} y={m.y - 27 * inv} textAnchor="middle" fontFamily="var(--font-body)" fontSize={10.5 * inv} fontWeight="500" fill="var(--text)">
                      {m.name}
                    </text>
                    <text x={m.x} y={m.y - 15 * inv} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8.5 * inv} fill="var(--muted)">
                      {m.city}{m.region ? `, ${m.region}` : ''}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
          </g>
        </svg>

        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: '+', onClick: () => zoomButton(1.4), title: 'Zoom in' },
            { label: '−', onClick: () => zoomButton(1 / 1.4), title: 'Zoom out' },
            { label: '⟲', onClick: resetView, title: 'Reset view' },
          ].map(btn => (
            <button
              key={btn.title}
              onClick={btn.onClick}
              title={btn.title}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(9,7,13,0.85)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 15, lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pink)'; e.currentTarget.style.color = 'var(--pink)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
          color: 'rgba(216,212,232,0.55)', background: 'rgba(9,7,13,0.6)',
          padding: '4px 8px', borderRadius: 6, pointerEvents: 'none',
        }}>
          SCROLL TO ZOOM · DRAG TO PAN
        </div>
        </div>
        <SideRail label="Europe" members={INTL_MERGED.filter(i => i.region === 'europe')} />
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--pink)', display: 'inline-block' }} />
          EXACT CITY
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,45,120,0.45)', display: 'inline-block' }} />
          APPROXIMATE — CITY NOT RECOGNIZED
        </span>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search name, city, or state…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10, marginBottom: 40 }}>
        {sorted
          .filter(m => matchesQuery(m, f))
          .map((m) => {
            const realIdx = placed.indexOf(m)
            return (
              <div
                key={m.name + m.city}
                className="card"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 16px' }}
                onMouseEnter={() => setActiveIdx(realIdx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <div style={{
                  flex: '0 0 auto', width: 32, height: 32, borderRadius: '50%',
                  background: pinFill(m.confidence),
                  color: '#1a0511', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initialsOf(m.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{m.city}{m.region ? `, ${m.region}` : ''}</div>
                </div>
              </div>
            )
          })}
      </div>
    </Layout>
  )
}
