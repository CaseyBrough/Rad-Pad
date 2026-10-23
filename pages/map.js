import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import SidePanel from '../components/SidePanel'
import CountUp from '../components/CountUp'
import { toast } from '../components/Toaster'
import { REGION_FULL_NAMES } from '../lib/geo'
import { placePin, AREAS, AREA_LABEL } from '../lib/placement'
import { US_NATION_D, US_STATE_LINES_D, CANADA_D, CANADA_PROVINCE_LINES_D, MEXICO_D } from '../lib/mapPaths'
import { REGIONS, regionOfCode, milesBetween } from '../lib/regions'

// Everyone on the map lives in the map_pins Supabase table (pre-approved rows
// migrated 2026-08-27, plus member submissions after admin review) - see the
// admin's Map Pins tab. A wrong pin is fixed there, not in code.

const LON_MIN = -172, LON_MAX = -52, LAT_MIN = 14, LAT_MAX = 75.5
const W = 1000, H = 600
function project(lat, lon) {
  return [((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W, ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H]
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function initialsOf(name) {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// The view is {z, x, y}: zoom plus the pan offset in map units. It can never
// leave the map (the clamp), so a member can't fling it off into the void.
function clampView(v) {
  const z = clamp(v.z, 1, 8)
  return { z, x: clamp(v.x, W - W * z, 0), y: clamp(v.y, H - H * z, 0) }
}
function zoomAt(v, factor, cx, cy) {
  const z = clamp(v.z * factor, 1, 8)
  const k = z / v.z
  return clampView({ z, x: cx - k * (cx - v.x), y: cy - k * (cy - v.y) })
}
function fitBox(minX, minY, maxX, maxY, maxZoom = 6, fill = 0.72) {
  const bw = Math.max(maxX - minX, 80)
  const bh = Math.max(maxY - minY, 48)
  const z = clamp(Math.min(W / bw, H / bh) * fill, 1, maxZoom)
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  return clampView({ z, x: W / 2 - z * cx, y: H / 2 - z * cy })
}

function cityLabel(m) { return `${m.city}${m.region ? `, ${m.region}` : ''}` }

// Search matches name, city, state/province (either "TX" or "Texas"), and country.
function matchesQuery(m, f) {
  if (!f) return true
  const regionFull = REGION_FULL_NAMES[(m.region || '').toUpperCase()]
  const hay = [m.name, m.city, m.region, m.country, regionFull, m.location, AREA_LABEL[m.area]].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(f)
}

export default function MemberMap() {
  const [pins, setPins] = useState([])
  const [intl, setIntl] = useState([])
  const [unplaced, setUnplaced] = useState([])
  const [loaded, setLoaded] = useState(false)

  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hoverKey, setHoverKey] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [regionId, setRegionId] = useState(null)
  const [mode, setMode] = useState('find') // 'find' = filter by text, 'near' = sort by distance
  const [search, setSearch] = useState('')
  const [nearText, setNearText] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const stageRef = useRef(null)
  const listRef = useRef(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const animRef = useRef(0)
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const movedRef = useRef(false)

  // ── data ──
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('map_pins').select('name, location, map_area').eq('approved', true)
      const na = []
      const abroad = []
      const lost = []
      ;(data || []).forEach(m => {
        const where = placePin(m)
        if (where.kind === 'na') {
          const parsed = where.parsed
          const [x, y] = project(parsed.lat, parsed.lon)
          na.push({
            id: `${m.name}|${m.location}|${na.length}`,
            name: m.name,
            location: m.location,
            city: parsed.city,
            region: parsed.region || '',
            country: where.country,
            // 'precise' = matched an actual city; 'approximate' = no city match,
            // fell back to the state/province centre.
            confidence: parsed.precision === 'city' ? 'precise' : 'approximate',
            lat: parsed.lat, lon: parsed.lon, x, y,
            group: regionOfCode(parsed.region),
          })
        } else if (where.kind === 'intl') {
          abroad.push({ id: `${m.name}|${m.location}`, name: m.name, location: m.location.replace(/[.\s]+$/, ''), area: where.area })
        } else {
          lost.push({ id: `${m.name}|${m.location}`, name: m.name, location: m.location.replace(/[.\s]+$/, '') })
        }
      })
      setPins(na)
      setIntl(abroad)
      setUnplaced(lost)
      setLoaded(true)
    }
    load()
  }, [])

  // Members who round to the same city share one marker.
  const spots = useMemo(() => {
    const byKey = {}
    pins.forEach(m => {
      const k = `${Math.round(m.lat * 4)}|${Math.round(m.lon * 4)}`
      ;(byKey[k] = byKey[k] || { key: k, x: m.x, y: m.y, members: [] }).members.push(m)
    })
    return Object.values(byKey)
  }, [pins])
  const spotOf = useMemo(() => {
    const idx = {}
    spots.forEach(s => s.members.forEach(m => { idx[m.id] = s }))
    return idx
  }, [spots])

  // Opening view: fitted to where members actually are, not the whole continent.
  const home = useMemo(() => {
    if (!pins.length) return { z: 1, x: 0, y: 0 }
    const xs = pins.map(m => m.x), ys = pins.map(m => m.y)
    return fitBox(Math.min(...xs) - 30, Math.min(...ys) - 30, Math.max(...xs) + 30, Math.max(...ys) + 30, 3, 0.95)
  }, [pins])

  // ── view control ──
  const stopFly = () => cancelAnimationFrame(animRef.current)
  const flyTo = useCallback(target => {
    cancelAnimationFrame(animRef.current)
    const from = viewRef.current
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setView(target); return }
    const t0 = performance.now()
    const D = 520
    const step = now => {
      const p = Math.min(1, (now - t0) / D)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      setView({ z: from.z + (target.z - from.z) * e, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e })
      if (p < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])
  useEffect(() => { if (loaded) flyTo(home) }, [loaded, home, flyTo])

  // Wheel zoom has to be a native, non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      stopFly()
      const rect = el.getBoundingClientRect()
      const cx = ((e.clientX - rect.left) / rect.width) * W
      const cy = ((e.clientY - rect.top) / rect.height) * H
      setView(v => zoomAt(v, e.deltaY < 0 ? 1.18 : 1 / 1.18, cx, cy))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function stagePoint(e) {
    const rect = stageRef.current.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H, rect }
  }

  // Mouse drag + touch drag + two-finger pinch, all through pointer events.
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return
    stopFly()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movedRef.current = false
    if (pointers.current.size === 1) {
      gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view: viewRef.current, captured: false }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), view: viewRef.current }
      movedRef.current = true
    }
  }
  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const { rect } = stagePoint(e)
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (((a.x + b.x) / 2 - rect.left) / rect.width) * W
      const my = (((a.y + b.y) / 2 - rect.top) / rect.height) * H
      setView(zoomAt(g.view, dist / g.dist, mx, my))
      return
    }
    if (g.kind === 'pan') {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy
      if (!g.captured && Math.hypot(dx, dy) > 4) {
        g.captured = true
        movedRef.current = true
        setIsDragging(true)
        try { stageRef.current.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      }
      if (g.captured) setView(clampView({ z: g.view.z, x: g.view.x + (dx / rect.width) * W, y: g.view.y + (dy / rect.height) * H }))
    }
  }
  function onPointerUp(e) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) { gesture.current = null; setIsDragging(false) }
    else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()]
      gesture.current = { kind: 'pan', sx: p.x, sy: p.y, view: viewRef.current, captured: true }
    }
  }

  function zoomButton(factor) { stopFly(); flyTo(zoomAt(viewRef.current, factor, W / 2, H / 2)) }
  function resetView() { setRegionId(null); setSelectedKey(null); flyTo(home) }

  function focusSpot(spot, minZoom = 3.4) {
    setSelectedKey(spot.key)
    const z = Math.max(viewRef.current.z, minZoom)
    flyTo(clampView({ z, x: W / 2 - z * spot.x, y: H / 2 - z * spot.y }))
  }

  function chooseRegion(id) {
    setSelectedKey(null)
    if (!id || id === regionId) { setRegionId(null); flyTo(home); return }
    setRegionId(id)
    const inRegion = pins.filter(m => m.group?.id === id)
    if (!inRegion.length) return
    const xs = inRegion.map(m => m.x), ys = inRegion.map(m => m.y)
    flyTo(fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)))
  }

  // ── derived lists ──
  const f = search.trim().toLowerCase()
  // Where "Near me" measures from: a US or Canadian city. Anywhere else gets a
  // note instead, since the map itself is North America only.
  const nearPlace = useMemo(() => {
    if (mode !== 'near' || !nearText.trim()) return null
    try { return placePin({ location: nearText.trim() }) } catch { return null } // half-typed text must never take the page down
  }, [mode, nearText])
  const origin = nearPlace?.kind === 'na' ? nearPlace.parsed : null
  const nearAbroad = nearPlace?.kind === 'intl'

  const listItems = useMemo(() => {
    const inRegion = m => !regionId || m.group?.id === regionId
    if (mode === 'near') {
      if (!origin) return []
      return pins
        .filter(inRegion)
        .map(m => ({ ...m, miles: milesBetween(origin.lat, origin.lon, m.lat, m.lon) }))
        .sort((a, b) => a.miles - b.miles)
        .slice(0, 12)
    }
    const na = pins.filter(m => inRegion(m) && matchesQuery(m, f))
      .sort((a, b) => a.name.localeCompare(b.name))
    const others = regionId ? [] : [...intl, ...unplaced].filter(m => matchesQuery(m, f)).sort((a, b) => a.name.localeCompare(b.name))
    return [...na, ...others]
  }, [pins, intl, unplaced, mode, origin, f, regionId])

  const activeSpotKeys = useMemo(() => {
    const keys = new Set()
    listItems.forEach(m => { if (spotOf[m.id]) keys.add(spotOf[m.id].key) })
    return keys
  }, [listItems, spotOf])
  const filtering = !!regionId || (mode === 'find' && !!f) || (mode === 'near' && !!origin)

  // ── stats ──
  const regionCounts = useMemo(() => {
    const counts = {}
    pins.forEach(m => { if (m.group) counts[m.group.id] = (counts[m.group.id] || 0) + 1 })
    return counts
  }, [pins])
  const states = new Set(pins.map(m => m.region).filter(Boolean)).size
  const top = REGIONS.filter(r => regionCounts[r.id]).sort((a, b) => regionCounts[b.id] - regionCounts[a.id])[0]
  const total = pins.length + intl.length + unplaced.length
  const approximate = pins.filter(m => m.confidence === 'approximate').length

  // ── tooltip ──
  const tipSpot = spots.find(s => s.key === (hoverKey || selectedKey))
  const tipStyle = tipSpot ? (() => {
    const px = ((tipSpot.x * view.z + view.x) / W) * 100
    const py = ((tipSpot.y * view.z + view.y) / H) * 100
    return { left: `${clamp(px, 14, 86)}%`, top: `${py}%`, below: py < 30 }
  })() : null

  function pickMember(m) {
    const s = spotOf[m.id]
    if (s) focusSpot(s)
  }

  // Scroll the list to the member(s) at a clicked marker.
  function revealInList(spot) {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector(`[data-spot="${CSS.escape(spot.key)}"]`)
    if (el) list.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: 'smooth' })
  }

  async function submitLocation() {
    if (!name.trim() || !location.trim()) { setFormError('Name and location are required.'); return }
    setSaving(true)
    setFormError('')
    const { error } = await supabase.from('map_pins').insert([{ name: name.trim(), location: location.trim(), approved: false }])
    if (error) { setFormError('Submission failed. Try again.'); setSaving(false); return }
    setSaving(false)
    setShowForm(false)
    setSubmitted(true)
    toast("You're in the queue — your pin will appear once it's approved.")
  }

  const inv = 1 / view.z

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">Where The Pad Actually Is</div>
      <p className="section-desc">Find collaborators, referral partners, and a coffee-and-gear-talk meetup near you.</p>

      <div className="mp-stats">
        <div><b>{loaded ? <CountUp to={total} /> : '–'}</b><span>Members mapped</span></div>
        <div><b>{loaded ? <CountUp to={states} /> : '–'}</b><span>States & provinces</span></div>
        <div><b>{loaded ? <CountUp to={spots.length} /> : '–'}</b><span>Cities</span></div>
        <div><b className="sm">{top ? top.label : '–'}</b><span>Biggest region{top ? ` · ${regionCounts[top.id]}` : ''}</span></div>
      </div>

      <div className="mp-toolbar">
        <div className="mp-chips" role="group" aria-label="Zoom to a region">
          <button className={`filter-tag${!regionId ? ' active' : ''}`} onClick={() => chooseRegion(null)}>All</button>
          {REGIONS.filter(r => regionCounts[r.id]).map(r => (
            <button key={r.id} className={`filter-tag${regionId === r.id ? ' active' : ''}`} onClick={() => chooseRegion(r.id)}>
              <i className="rg-dot" style={{ background: r.color }} />{r.label} · {regionCounts[r.id]}
            </button>
          ))}
        </div>
        {submitted ? <span className="pending-pill">✓ Pin sent for review</span> : (
          <button type="button" className="btn pink" onClick={() => setShowForm(true)}>+ Add yourself</button>
        )}
      </div>

      {showForm && (
        <SidePanel
          title="Add yourself to the map"
          onClose={() => setShowForm(false)}
          onSubmit={submitLocation}
          saving={saving}
          canSave={!!name.trim() && !!location.trim()}
          submitLabel="Submit for review"
        >
          <p className="panel-note">Just for the map — separate from your Directory listing. Reviewed before it goes live, usually within 24 hours.</p>
          <div className="adm-form-grid">
            <div className="form-group full">
              <label className="form-label" htmlFor="map-name">Full name *</label>
              <input id="map-name" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Casey O'Farrell" />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="map-loc">Location *</label>
              <input id="map-loc" className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Charleston, SC" />
            </div>
          </div>
          {formError && <div className="panel-error">{formError}</div>}
        </SidePanel>
      )}

      <div className="mp-shell">
        <div className="mp-map">
          <div
            ref={stageRef}
            className={`mp-stage${isDragging ? ' dragging' : view.z > 1 ? ' zoomed' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => { if (!movedRef.current) setSelectedKey(null) }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="mp-svg" role="img" aria-label="Map of where Rad Pad members are">
              <defs>
                <pattern id="mpDots" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.9" fill="rgba(240,235,248,0.07)" />
                </pattern>
                <radialGradient id="mpGlow" cx="28%" cy="22%" r="70%">
                  <stop offset="0%" stopColor="rgba(0,245,228,0.13)" />
                  <stop offset="100%" stopColor="rgba(0,245,228,0)" />
                </radialGradient>
                <radialGradient id="mpGlow2" cx="82%" cy="85%" r="55%">
                  <stop offset="0%" stopColor="rgba(255,45,120,0.11)" />
                  <stop offset="100%" stopColor="rgba(255,45,120,0)" />
                </radialGradient>
                <linearGradient id="mpLand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(240,235,248,0.10)" />
                  <stop offset="100%" stopColor="rgba(240,235,248,0.04)" />
                </linearGradient>
              </defs>
              <rect width={W} height={H} fill="url(#mpDots)" />
              <rect width={W} height={H} fill="url(#mpGlow)" />
              <rect width={W} height={H} fill="url(#mpGlow2)" />
              <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
                <g className="mp-land">
                  <path d={CANADA_D} fill="url(#mpLand)" stroke="rgba(0,245,228,0.22)" strokeWidth={1.1 * inv} />
                  <path d={MEXICO_D} fill="url(#mpLand)" stroke="rgba(0,245,228,0.22)" strokeWidth={1.1 * inv} />
                  <path d={US_NATION_D} fill="url(#mpLand)" stroke="rgba(0,245,228,0.4)" strokeWidth={1.4 * inv} />
                  <path d={US_STATE_LINES_D} fill="none" stroke="rgba(0,245,228,0.15)" strokeWidth={0.6 * inv} />
                  <path d={CANADA_PROVINCE_LINES_D} fill="none" stroke="rgba(0,245,228,0.15)" strokeWidth={0.6 * inv} />
                </g>
                {spots.map(s => {
                  const n = s.members.length
                  const active = !filtering || activeSpotKeys.has(s.key)
                  const isSel = selectedKey === s.key
                  const isHot = isSel || hoverKey === s.key
                  const approx = s.members[0].confidence === 'approximate'
                  const label = `${s.members.map(m => m.name).join(', ')} — ${cityLabel(s.members[0])}`
                  return (
                    <g
                      key={s.key}
                      className={`mp-spot${isSel ? ' sel' : ''}`}
                      style={{ opacity: active ? 1 : 0.14 }}
                      role="button"
                      tabIndex={active ? 0 : -1}
                      aria-label={label}
                      onPointerEnter={e => { if (e.pointerType === 'mouse') setHoverKey(s.key) }}
                      onPointerLeave={() => setHoverKey(k => (k === s.key ? null : k))}
                      onFocus={() => setHoverKey(s.key)}
                      onBlur={() => setHoverKey(k => (k === s.key ? null : k))}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusSpot(s, viewRef.current.z); revealInList(s) } }}
                      onClick={e => { e.stopPropagation(); if (movedRef.current) return; setSelectedKey(s.key); revealInList(s) }}
                    >
                      <circle className="mp-halo" cx={s.x} cy={s.y} r={(isHot ? 24 : 17) * inv} fill="rgba(255,45,120,0.2)" />
                      <circle
                        cx={s.x} cy={s.y} r={(n > 1 ? 9 : 5.5) * inv}
                        fill={approx ? '#13101A' : 'var(--pink)'}
                        stroke={approx ? 'var(--pink)' : '#fff'}
                        strokeWidth={(approx ? 2 : 1.4) * inv}
                        strokeOpacity={approx ? 1 : 0.85}
                      />
                      {n > 1 && (
                        <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono)" fontWeight="600" fontSize={10 * inv} fill={approx ? 'var(--pink)' : '#1a0511'} style={{ pointerEvents: 'none' }}>{n}</text>
                      )}
                      <circle cx={s.x} cy={s.y} r={16 * inv} fill="transparent" />
                    </g>
                  )
                })}
              </g>
            </svg>

            {tipSpot && tipStyle && (
              <div className={`mp-tip${tipStyle.below ? ' below' : ''}`} style={{ left: tipStyle.left, top: tipStyle.top }}>
                <b>{cityLabel(tipSpot.members[0])}</b>
                {tipSpot.members.slice(0, 5).map(m => <span key={m.id}>{m.name}</span>)}
                {tipSpot.members.length > 5 && <em>+{tipSpot.members.length - 5} more</em>}
              </div>
            )}

            <div className="mp-zoom" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => zoomButton(1.5)} aria-label="Zoom in">+</button>
              <button type="button" onClick={() => zoomButton(1 / 1.5)} aria-label="Zoom out">−</button>
              <button type="button" onClick={resetView} aria-label="Reset view">⟲</button>
            </div>
            <div className="mp-hint">Scroll or pinch to zoom · drag to pan</div>
          </div>

          <div className="mp-legend">
            <span><i className="lg-dot" /> Exact city</span>
            {approximate > 0 && <span><i className="lg-dot ring" /> Approximate ({approximate}) — city not recognised, shown at the state or province centre</span>}
            <span><i className="lg-dot count">3</i> Several members in one city</span>
          </div>

          {intl.length > 0 && (
            <div className="mp-abroad">
              <div className="mp-abroad-head">🌍 Beyond North America <span>{intl.length}</span></div>
              <div className="mp-pods">
                {AREAS.filter(a => intl.some(m => m.area === a.id)).map(a => (
                  <div key={a.id} className="mp-pod">
                    <div className="mp-pod-name">{a.emoji} {a.label}</div>
                    {intl.filter(m => m.area === a.id).map(m => (
                      <div key={m.id} className="mp-pod-m" title={m.location}>
                        <span className="mp-av intl sm">{initialsOf(m.name)}</span>
                        <span className="mp-who"><span className="mp-name">{m.name}</span><span className="mp-where">{m.location}</span></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="mp-panel" aria-label="Member list">
          <div className="mp-panel-inner">
            <div className="mp-modes" role="tablist" aria-label="Search mode">
              <button role="tab" aria-selected={mode === 'find'} className={mode === 'find' ? 'on' : ''} onClick={() => setMode('find')}>Find a member</button>
              <button role="tab" aria-selected={mode === 'near'} className={mode === 'near' ? 'on' : ''} onClick={() => setMode('near')}>Near me</button>
            </div>
            {mode === 'find' ? (
              <input className="search-input" type="search" placeholder="Name, city, or state…" aria-label="Search members" value={search} onChange={e => setSearch(e.target.value)} />
            ) : (
              <input className="search-input" type="search" placeholder="Your city, e.g. Denver, CO" aria-label="Your city" value={nearText} onChange={e => setNearText(e.target.value)} />
            )}
            <div className="mp-count" aria-live="polite">
              {mode === 'near'
                ? (origin ? `Closest to ${cityLabel(origin)}` : nearAbroad ? 'Near me covers the US and Canada for now. Try Find a member.' : nearText.trim() ? 'Couldn’t place that — try “City, ST”.' : 'Type your city to see who’s closest.')
                : `${listItems.length} ${listItems.length === 1 ? 'member' : 'members'}${filtering ? ' match' : ''}`}
            </div>
            <div className="mp-list" ref={listRef}>
              {listItems.length === 0 && loaded && mode === 'find' && <div className="mp-empty">No one matches “{search}”.</div>}
              {listItems.map(m => {
                const spot = spotOf[m.id]
                const sel = spot && selectedKey === spot.key
                const Tag = spot ? 'button' : 'div'
                return (
                  <Tag
                    key={m.id}
                    type={spot ? 'button' : undefined}
                    className={`mp-row${sel ? ' sel' : ''}`}
                    data-spot={spot?.key}
                    onClick={spot ? () => pickMember(m) : undefined}
                    onPointerEnter={spot ? () => setHoverKey(spot.key) : undefined}
                    onPointerLeave={spot ? () => setHoverKey(null) : undefined}
                  >
                    <span className={`mp-av${m.confidence === 'approximate' ? ' ring' : ''}${!spot ? ' intl' : ''}`}>{initialsOf(m.name)}</span>
                    <span className="mp-who">
                      <span className="mp-name">{m.name}</span>
                      <span className="mp-where">{spot ? cityLabel(m) : m.area ? `${m.location} · ${AREA_LABEL[m.area]}` : `${m.location} · not on the map yet`}</span>
                    </span>
                    {m.miles != null && <span className="mp-miles">{m.miles < 10 ? 'Local' : `${Math.round(m.miles).toLocaleString()} mi`}</span>}
                  </Tag>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  )
}
