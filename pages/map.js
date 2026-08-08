import { useState, useMemo, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { parseLocation, REGION_FULL_NAMES } from '../lib/geo'
import { US_NATION_D, US_STATE_LINES_D, CANADA_D, MEXICO_D } from '../lib/mapPaths'

// Researched from the Slack member export (company sites, indexed bios/profiles) — 2026-08-08.
// Seed data only: any member who submits their own location below takes priority over this.
const SEED_MEMBERS = [
  { name: "Josh Ferguson", city: "Norman Wells", region: "NT", country: "Canada", confidence: "medium", lat: 65.282, lon: -126.8329 },
  { name: "Brandon Neubauer", city: "New York City", region: "NY", country: "USA", confidence: "high", lat: 40.7128, lon: -74.006 },
  { name: "Ashton Ray Hansen", city: "Minneapolis", region: "MN", country: "USA", confidence: "high", lat: 44.9778, lon: -93.265 },
  { name: "Bryan Kirkpatrick", city: "San Luis Obispo", region: "CA", country: "USA", confidence: "medium", lat: 35.2828, lon: -120.6596 },
  { name: "Jordan Turner", city: "Houston", region: "TX", country: "USA", confidence: "high", lat: 29.7604, lon: -95.3698 },
  { name: "Corey Dostal", city: "Missoula", region: "MT", country: "USA", confidence: "high", lat: 46.8721, lon: -113.994 },
  { name: "Bryce Root", city: "Santa Cruz", region: "CA", country: "USA", confidence: "high", lat: 36.9741, lon: -122.0308 },
  { name: "David Glessner", city: "Denver", region: "CO", country: "USA", confidence: "high", lat: 39.7392, lon: -104.9903 },
  { name: "Tamma Phillips", city: "Brick", region: "NJ", country: "USA", confidence: "high", lat: 40.0583, lon: -74.1102 },
  { name: "Mattin Peikari", city: "Falls Church", region: "VA", country: "USA", confidence: "high", lat: 38.8823, lon: -77.1711 },
  { name: "Daniel Ketchelos", city: "Sioux Falls", region: "SD", country: "USA", confidence: "high", lat: 43.5446, lon: -96.7311 },
  { name: "Matthieu Ionesco", city: "Houston", region: "TX", country: "USA", confidence: "high", lat: 29.7604, lon: -95.3698 },
  { name: "Geet Chahil", city: "Beamsville", region: "ON", country: "Canada", confidence: "high", lat: 43.1697, lon: -79.4708 },
  { name: "Aaron Villa", city: "Round Rock", region: "TX", country: "USA", confidence: "high", lat: 30.5083, lon: -97.6789 },
  { name: "Joshua Adams", city: "White House", region: "TN", country: "USA", confidence: "high", lat: 36.4595, lon: -86.6642 },
  { name: "Jesse O", city: "Fort Worth", region: "TX", country: "USA", confidence: "high", lat: 32.7555, lon: -97.3308 },
  { name: "Marshall Moyle", city: "Tallahassee", region: "FL", country: "USA", confidence: "high", lat: 30.4383, lon: -84.2807 },
  { name: "Colin Odle", city: "Birmingham", region: "AL", country: "USA", confidence: "high", lat: 33.5186, lon: -86.8104 },
  { name: "Chad Ressler", city: "Cleveland", region: "OH", country: "USA", confidence: "high", lat: 41.4993, lon: -81.6944 },
  { name: "Matt Davidge", city: "Burlington", region: "ON", country: "Canada", confidence: "medium", lat: 43.3255, lon: -79.799 },
  { name: "Troy Robinson", city: "Burlington", region: "ON", country: "Canada", confidence: "medium", lat: 43.3255, lon: -79.799 },
  { name: "Kasey Bruce", city: "San Francisco", region: "CA", country: "USA", confidence: "high", lat: 37.7749, lon: -122.4194 },
  { name: "Sergio Bravo", city: "Sacramento", region: "CA", country: "USA", confidence: "high", lat: 38.5816, lon: -121.4944 },
  { name: "Jeff Florez", city: "Orlando", region: "FL", country: "USA", confidence: "high", lat: 28.5383, lon: -81.3792 },
  { name: "Cory Englehardt", city: "Brick", region: "NJ", country: "USA", confidence: "high", lat: 40.0583, lon: -74.1102 },
  { name: "Trent Austen", city: "Austin", region: "TX", country: "USA", confidence: "high", lat: 30.2672, lon: -97.7431 },
  { name: "Daniel Krum", city: "San Francisco", region: "CA", country: "USA", confidence: "high", lat: 37.7749, lon: -122.4194 },
  { name: "Dylan Smith", city: "Greensboro", region: "NC", country: "USA", confidence: "high", lat: 36.0726, lon: -79.792 },
  { name: "Adam Genuis", city: "Toronto", region: "ON", country: "Canada", confidence: "high", lat: 43.6532, lon: -79.3832 },
  { name: "Spencer Daniel", city: "Atlanta", region: "GA", country: "USA", confidence: "high", lat: 33.749, lon: -84.388 },
  { name: "Jimmy Renallo", city: "Milwaukee", region: "WI", country: "USA", confidence: "high", lat: 43.0389, lon: -87.9065 },
  { name: "Aaron Yabes", city: "Denver", region: "CO", country: "USA", confidence: "medium", lat: 39.7392, lon: -104.9903 },
  { name: "Colton Trcic", city: "Phoenix", region: "AZ", country: "USA", confidence: "high", lat: 33.4484, lon: -112.074 },
  { name: "Travis Hatch", city: "Denver", region: "CO", country: "USA", confidence: "high", lat: 39.7392, lon: -104.9903 },
  { name: "Jason Topel", city: "Hollywood", region: "FL", country: "USA", confidence: "high", lat: 26.0112, lon: -80.1495 },
  { name: "Tory Hains", city: "Murrieta", region: "CA", country: "USA", confidence: "high", lat: 33.5539, lon: -117.2139 },
  { name: "Chris Murphy", city: "Myrtle Beach", region: "SC", country: "USA", confidence: "medium", lat: 33.6891, lon: -78.8867 },
  { name: "Harry Peluso", city: "Los Angeles", region: "CA", country: "USA", confidence: "medium", lat: 34.0522, lon: -118.2437 },
  { name: "Casey Rogan", city: "Toronto", region: "ON", country: "Canada", confidence: "high", lat: 43.6532, lon: -79.3832 },
  { name: "Samuel Velasco", city: "Winston-Salem", region: "NC", country: "USA", confidence: "high", lat: 36.0999, lon: -80.2442 },
  { name: "Piero Delgado", city: "Los Angeles", region: "CA", country: "USA", confidence: "medium", lat: 34.0522, lon: -118.2437 },
  { name: "Karlo King", city: "Squamish", region: "BC", country: "Canada", confidence: "high", lat: 49.7016, lon: -123.1558 },
  { name: "Dexter Tenn", city: "Boise", region: "ID", country: "USA", confidence: "medium", lat: 43.615, lon: -116.2023 },
  { name: "Caleb Maffey", city: "Orange", region: "CA", country: "USA", confidence: "high", lat: 33.7879, lon: -117.8531 },
  { name: "Cassy Graceflix", city: "Denver", region: "CO", country: "USA", confidence: "high", lat: 39.7392, lon: -104.9903 },
  { name: "Dillon Jacobs", city: "Rexburg", region: "ID", country: "USA", confidence: "medium", lat: 43.8259, lon: -111.7897 },
  { name: "Ben Weichler", city: "Rapid City", region: "SD", country: "USA", confidence: "high", lat: 44.0805, lon: -103.231 },
  { name: "Tyler Furlan", city: "Chicago", region: "IL", country: "USA", confidence: "high", lat: 41.8781, lon: -87.6298 },
  { name: "Jeff Elstone", city: "New York City", region: "NY", country: "USA", confidence: "high", lat: 40.7128, lon: -74.006 },
  { name: "Bryce Joseph-Nelson", city: "San Francisco", region: "CA", country: "USA", confidence: "medium", lat: 37.7749, lon: -122.4194 },
  { name: "Yuliia Zontikova", city: "Saskatoon", region: "SK", country: "Canada", confidence: "high", lat: 52.1332, lon: -106.67 },
  { name: "Lauren Donohue", city: "Santa Barbara", region: "CA", country: "USA", confidence: "high", lat: 34.4208, lon: -119.6982 },
  { name: "Tyson Whitney", city: "Salt Lake City", region: "UT", country: "USA", confidence: "high", lat: 40.7608, lon: -111.891 },
  { name: "Bomani Tyehimba", city: "Cincinnati", region: "OH", country: "USA", confidence: "medium", lat: 39.1031, lon: -84.512 },
  { name: "Junior Saucedo", city: "Los Angeles", region: "CA", country: "USA", confidence: "high", lat: 34.0522, lon: -118.2437 },
  { name: "Dale S", city: "Sacramento", region: "CA", country: "USA", confidence: "high", lat: 38.5816, lon: -121.4944 },
  { name: "Iven Chaqueco", city: "Columbus", region: "OH", country: "USA", confidence: "medium", lat: 39.9612, lon: -82.9988 },
]

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

const INTL = [
  { name: 'Joel Whittle', location: 'Australia', region: 'oceania' },
  { name: 'Robert McGann', location: 'Sydney, Australia', region: 'oceania' },
  { name: 'Karl Somers', location: 'County Meath, Ireland', region: 'europe' },
  { name: 'Zeb Bulthuis', location: 'Netherlands', region: 'europe' },
]

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
        .from('members')
        .select('name, location')
        .eq('approved', true)
        .not('location', 'is', null)
      const resolved = (data || [])
        .map(m => {
          const parsed = parseLocation(m.location)
          if (!parsed) return null
          return {
            name: m.name,
            city: parsed.city,
            region: parsed.region || '',
            country: 'USA', // best-effort; parseLocation resolves US+CA regions
            confidence: 'self',
            lat: parsed.lat,
            lon: parsed.lon,
          }
        })
        .filter(Boolean)
      setSelfReported(resolved)
    }
    load()
  }, [])

  const MEMBERS = useMemo(() => {
    const selfNames = new Set(selfReported.map(m => m.name.toLowerCase()))
    const seedFiltered = SEED_MEMBERS.filter(m => !selfNames.has(m.name.toLowerCase()))
    return [...selfReported, ...seedFiltered]
  }, [selfReported])

  const placed = useMemo(() => placeMembers(MEMBERS), [MEMBERS])
  const sorted = useMemo(() => [...placed].sort((a, b) => a.name.localeCompare(b.name)), [placed])

  const f = search.trim().toLowerCase()
  const matchSet = new Set(
    placed
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => matchesQuery(m, f))
      .map(({ i }) => i)
  )

  const selfCount = MEMBERS.filter(m => m.confidence === 'self').length
  const highCount = MEMBERS.filter(m => m.confidence === 'high').length
  const medCount = MEMBERS.filter(m => m.confidence === 'medium').length

  function pinFill(confidence) {
    if (confidence === 'self') return 'var(--pink)'
    if (confidence === 'high') return 'rgba(255,45,120,0.75)'
    return 'rgba(255,45,120,0.45)'
  }

  async function submitLocation() {
    if (!name.trim() || !location.trim()) {
      setFormError('Name and location are required.')
      return
    }
    setSaving(true)
    setFormError('')
    const { error } = await supabase.from('members').insert([{ name: name.trim(), location: location.trim(), approved: false }])
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
        {placed.length} members mapped — {selfCount > 0 ? `${selfCount} self-reported, ` : ''}{highCount} sourced from public profiles,
        {' '}{medCount} inferred. Not on here yet? Add yourself below.
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
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>Reviewed before it goes live — usually within 24 hours. This also updates your Directory listing if you have one.</div>
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
        <SideRail label="Oceania" members={INTL.filter(i => i.region === 'oceania')} />
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
        <SideRail label="Europe" members={INTL.filter(i => i.region === 'europe')} />
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--pink)', display: 'inline-block' }} />
          SELF-REPORTED
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,45,120,0.75)', display: 'inline-block' }} />
          STATED (SOURCED)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,45,120,0.45)', display: 'inline-block' }} />
          INFERRED
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
