import { useState, useMemo } from 'react'
import Layout from '../components/Layout'

// Researched from the Slack member export (company sites, indexed bios/profiles) — 2026-08-08.
// confidence: 'high' = stated explicitly (own site/address) · 'medium' = inferred from search snippets
const MEMBERS = [
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

const COAST = [
  [-166,68.8],[-156,71.2],[-141,70.1],[-130,70.3],[-110,68.2],[-95,68.4],[-85,66.8],
  [-83,62.5],[-93,62],[-85,58],[-80,55.2],[-78,60],[-70,62],[-65,59.5],[-60,58],
  [-56,53.2],[-53,48.3],[-56,46.2],[-60,45.1],[-64,44.3],[-67,44.2],[-70,43.1],
  [-70,42.2],[-74,40.4],[-75,38.6],[-76,37.2],[-78,34.2],[-81,32.1],[-81,29.5],
  [-80,25.2],[-81,25.5],[-82,27.2],[-83.5,29.7],[-88,30.1],[-90,29.2],[-94,29.5],
  [-97,26.1],[-97.3,22.2],[-94.5,18.2],[-90.5,19.5],[-90.2,21.3],[-87.5,21.2],
  [-88,18.2],[-94.2,16.1],[-99.5,16.3],[-105.2,20.1],[-109.5,23.2],[-114.3,28.1],
  [-117.1,32.1],[-117.2,32.6],[-118.3,33.9],[-120.6,34.5],[-121.9,36.6],[-122.5,37.8],
  [-124.1,41.8],[-124.4,46.1],[-123.4,48.4],[-125.1,49.4],[-127.5,50.6],[-130.2,54.2],
  [-133.5,57.5],[-135.4,58.4],[-141,60.1],[-147,60.5],[-152,58.7],[-158,58.8],
  [-160,59.5],[-163,59.8],[-165.5,60.8],[-166.5,64.5],[-166,68.8],
]
const LAND_D = COAST.map(([lon, lat], i) => {
  const [x, y] = project(lat, lon)
  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
}).join(' ') + ' Z'

function initialsOf(name) {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function placeMembers(members) {
  const groups = {}
  members.forEach(m => {
    const k = `${m.city}|${m.region}|${m.country}`
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

const UNKNOWN_COUNT = 40
const INTL = [
  { name: 'Joel Whittle', location: 'Australia' },
  { name: 'Robert McGann', location: 'Sydney, Australia' },
  { name: 'Karl Somers', location: 'County Meath, Ireland' },
  { name: 'Zeb Bulthuis', location: 'Netherlands' },
]

export default function MemberMap() {
  const [search, setSearch] = useState('')
  const [activeIdx, setActiveIdx] = useState(null)
  const placed = useMemo(() => placeMembers(MEMBERS), [])
  const sorted = useMemo(() => [...placed].sort((a, b) => a.name.localeCompare(b.name)), [placed])

  const f = search.trim().toLowerCase()
  const matchSet = new Set(
    placed
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !f || m.name.toLowerCase().includes(f) || m.city.toLowerCase().includes(f) || m.region.toLowerCase().includes(f))
      .map(({ i }) => i)
  )

  const highCount = MEMBERS.filter(m => m.confidence === 'high').length
  const medCount = MEMBERS.filter(m => m.confidence === 'medium').length

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">Where The Pad Actually Is</div>
      <p className="section-desc">
        {placed.length} members mapped from public info (company sites, profiles) — {highCount} stated their
        city directly, {medCount} inferred from indirect mentions. {UNKNOWN_COUNT} more couldn't be placed yet.
      </p>

      <div style={{
        position: 'relative',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 18,
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <radialGradient id="mapGlow" cx="30%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(0,245,228,0.10)" />
              <stop offset="100%" stopColor="rgba(0,245,228,0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#mapGlow)" />
          <path d={LAND_D} fill="rgba(240,235,248,0.045)" stroke="rgba(0,245,228,0.25)" strokeWidth="1.4" />
          {placed.map((m, i) => {
            const dimmed = f && !matchSet.has(i)
            const isActive = activeIdx === i
            const bubbleFill = m.confidence === 'high' ? 'var(--pink)' : 'rgba(255,45,120,0.55)'
            return (
              <g
                key={i}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 120ms ease' }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <line x1={m.x} y1={m.y + 7} x2={m.stemX} y2={m.stemY} stroke="rgba(216,212,232,0.55)" strokeWidth="1.2" />
                <circle cx={m.stemX} cy={m.stemY} r="1.6" fill="rgba(216,212,232,0.7)" />
                <circle
                  cx={m.x} cy={m.y} r={isActive ? 12 : 10.5}
                  fill={bubbleFill}
                  stroke="var(--card)"
                  strokeWidth="2"
                  style={{
                    transition: 'r 120ms ease, filter 120ms ease',
                    filter: isActive ? `drop-shadow(0 0 8px var(--pink-glow-soft))` : 'none',
                  }}
                />
                <text
                  x={m.x} y={m.y + 0.5}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="var(--font-mono)" fontWeight="500" fontSize="9.5"
                  fill="#1a0511"
                  style={{ pointerEvents: 'none' }}
                >
                  {initialsOf(m.name)}
                </text>
                {isActive && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={m.x - 62} y={m.y - 40} width="124" height="30" rx="6"
                      fill="#09070D" stroke="var(--border)"
                    />
                    <text x={m.x} y={m.y - 27} textAnchor="middle" fontFamily="var(--font-body)" fontSize="10.5" fontWeight="500" fill="var(--text)">
                      {m.name}
                    </text>
                    <text x={m.x} y={m.y - 15} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--muted)">
                      {m.city}, {m.region}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--pink)', display: 'inline-block' }} />
          STATED LOCATION
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,45,120,0.55)', display: 'inline-block' }} />
          INFERRED
        </span>
        <span style={{ color: 'rgba(216,212,232,0.5)' }}>STYLIZED MAP — NOT TO SCALE</span>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10, marginBottom: 40 }}>
        {sorted
          .filter(m => !f || m.name.toLowerCase().includes(f) || m.city.toLowerCase().includes(f) || m.region.toLowerCase().includes(f))
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
                  background: m.confidence === 'high' ? 'var(--pink)' : 'rgba(255,45,120,0.55)',
                  color: '#1a0511', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initialsOf(m.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{m.city}, {m.region}</div>
                </div>
              </div>
            )
          })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 10 }}>
          Not Yet On The Map
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 640, marginBottom: 8 }}>
          {UNKNOWN_COUNT} members don't have a public, stated location I could find — drop your city in{' '}
          <span
            onClick={() => window.open('https://theradpad.slack.com/archives/C0A3JCTLDL3', '_blank')}
            style={{ color: 'var(--cyan)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            #regional-meetups
          </span>{' '}
          and we'll get you pinned.
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 640 }}>
          Outside North America (off this map): {INTL.map(i => `${i.name} (${i.location})`).join(' · ')}
        </p>
      </div>
    </Layout>
  )
}
