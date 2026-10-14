import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import RecordingPlayer from '../components/RecordingPlayer'
import Thumb from '../components/Thumb'
import { supabase } from '../lib/supabase'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'
import { durationMinutes, formatHours } from '../lib/youtube'

function getTypeColor(type) {
  if (type === 'Community Call') return 'tag-cyan'
  if (type === 'Skills Call') return 'tag-amber'
  if (type === 'Theme Call') return 'tag-purple'
  return 'tag-amber'
}

const FILTERS = ['All', 'Community Call', 'Skills Call', 'Theme Call']
const PAGE_SIZE = 12

// Hosts are typed by hand, so the same person shows up as "Casey O.",
// "Casey OFarrell" and "Casey O'Farrell". Group them by first name + the first
// letter of the last name, and split co-hosted calls ("A and B") into people.
function hostNames(host) {
  if (!host) return []
  return host
    .split(/\s*(?:,|&|\+|\band\b)\s*/i)
    .map(n => n.trim().replace(/\.+$/, ''))
    .filter(Boolean)
}

function hostKey(name) {
  const parts = name.toLowerCase().replace(/[’'`.]/g, '').split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}` : parts[0]
}

function Skeleton() {
  return (
    <div className="lib-grid">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rec-card skel">
          <div className="thumb shimmer" />
          <div className="rc-body">
            <div className="shimmer" style={{ height: 12, width: '35%', borderRadius: 4, marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 16, width: '85%', borderRadius: 4, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 11, width: '55%', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Recordings() {
  const router = useRouter()
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [host, setHost] = useState('All')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const seenSnapshot = useSeenSnapshot('recordings')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recordings')
        .select('*')
        .order('date', { ascending: false })
      setRecordings(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Any change to what's being looked at starts the list back at the top page.
  useEffect(() => { setLimit(PAGE_SIZE) }, [filter, search, sort, host])

  // A host typed with just a first name ("Mattin") is the same person as the one
  // full name that shares it ("Mattin Peikari") - but only when that match is unique.
  const hostAlias = useMemo(() => {
    const keys = new Set()
    recordings.forEach(r => hostNames(r.host).forEach(n => keys.add(hostKey(n))))
    const alias = new Map()
    keys.forEach(k => {
      if (k.includes(' ')) return
      const full = [...keys].filter(x => x.startsWith(k + ' '))
      if (full.length === 1) alias.set(k, full[0])
    })
    return alias
  }, [recordings])
  const canon = name => { const k = hostKey(name); return hostAlias.get(k) || k }

  // Hosts with at least two calls, most-hosted first, labelled by their most common full-name spelling.
  const hostOptions = useMemo(() => {
    const groups = new Map()
    recordings.forEach(r => {
      const seen = new Set()
      hostNames(r.host).forEach(name => {
        const key = canon(name)
        if (seen.has(key)) return
        seen.add(key)
        const g = groups.get(key) || { key, count: 0, spellings: new Map() }
        g.count += 1
        g.spellings.set(name, (g.spellings.get(name) || 0) + 1)
        groups.set(key, g)
      })
    })
    return [...groups.values()]
      .filter(g => g.count >= 2)
      .map(g => ({
        key: g.key,
        count: g.count,
        // "Rebecca H" -> "Rebecca H." (a lone trailing initial reads better with its period)
        label: [...g.spellings.entries()].sort((a, b) => (+b[0].includes(' ') - +a[0].includes(' ')) || b[1] - a[1] || b[0].length - a[0].length)[0][0].replace(/\s([A-Za-z])$/, ' $1.'),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [recordings, hostAlias]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const visible = useMemo(() => {
    const list = recordings.filter(r => {
      const matchFilter = filter === 'All' || r.call_type === filter
      const matchHost = host === 'All' || hostNames(r.host).some(n => canon(n) === host)
      const matchSearch = !q ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.sub_topic?.toLowerCase().includes(q) ||
        r.host?.toLowerCase().includes(q)
      return matchFilter && matchHost && matchSearch
    })
    return sort === 'oldest' ? [...list].reverse() : list
  }, [recordings, filter, host, q, sort, hostAlias]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = visible.slice(0, limit)
  const remaining = visible.length - shown.length
  const pristine = filter === 'All' && host === 'All' && !q && sort === 'newest'
  const featured = pristine ? shown[0] : null
  const gridItems = pristine ? shown.slice(1) : shown

  // Library stats for the header: "44 calls · 71 hours".
  const totalMinutes = useMemo(() => recordings.reduce((sum, r) => sum + (durationMinutes(r.duration) || 0), 0), [recordings])

  // The open recording lives in the URL (?v=<id>) so it can be shared and the
  // browser Back button closes the player.
  const playingId = router.isReady ? router.query.v : null
  const playing = playingId ? recordings.find(r => r.id === playingId) : null
  const playingIdx = playing ? visible.findIndex(r => r.id === playing.id) : -1
  // Opening adds one history entry, so Back closes the player. If the page was
  // loaded straight onto a shared ?v= link there is nothing to go back to, so
  // Close just rewrites the address instead.
  const openedHere = useRef(false)
  const open = id => { openedHere.current = true; router.push({ pathname: '/recordings', query: { v: id } }, undefined, { shallow: true }) }
  const close = () => {
    if (openedHere.current) { openedHere.current = false; router.back() }
    else router.replace('/recordings', undefined, { shallow: true })
  }
  const go = delta => { const next = visible[playingIdx + delta]; if (next) router.replace({ pathname: '/recordings', query: { v: next.id } }, undefined, { shallow: true }) }

  const card = rec => {
    const isNew = isNewSince(rec.created_at, seenSnapshot)
    return (
      <button key={rec.id} type="button" className="rec-card" onClick={() => open(rec.id)} aria-label={`Play ${rec.title}`}>
        <Thumb rec={rec}>
          {isNew && <span className="new-chip thumb-new">New</span>}
        </Thumb>
        <div className="rc-body">
          {rec.call_type && <span className={`tag ${getTypeColor(rec.call_type)}`}>{rec.call_type}{rec.sub_topic ? ` · ${rec.sub_topic}` : ''}</span>}
          <div className="rc-title">{rec.title}</div>
          <div className="rc-meta">{[rec.date, rec.host && rec.host.replace(/\.\s*$/, '')].filter(Boolean).join('  ·  ')}</div>
          {rec.description && <div className="rc-desc">{rec.description}</div>}
        </div>
      </button>
    )
  }

  return (
    <Layout>
      <div className="section-label">Archive</div>
      <div className="section-title">Call Recordings</div>
      <p className="section-desc">
        {recordings.length > 0
          ? <>Every call, one click away — <strong className="strong">{recordings.length} calls</strong>{totalMinutes > 0 && <> and <strong className="strong">{formatHours(totalMinutes)} hours</strong> of real conversations</>}. Watch right here.</>
          : 'Every community call, skills session, and themed deep dive — searchable and organized.'}
      </p>

      {featured && (
        <button type="button" className="lib-hero" onClick={() => open(featured.id)} aria-label={`Play ${featured.title}`}>
          <Thumb rec={featured} size="max">
            {isNewSince(featured.created_at, seenSnapshot) && <span className="new-chip thumb-new">New</span>}
          </Thumb>
          <div className="lib-hero-body">
            <span className="lib-eyebrow"><span className="dot" />Latest call</span>
            {featured.call_type && <span className={`tag ${getTypeColor(featured.call_type)}`} style={{ alignSelf: 'flex-start' }}>{featured.call_type}{featured.sub_topic ? ` · ${featured.sub_topic}` : ''}</span>}
            <div className="lib-hero-title">{featured.title}</div>
            <div className="lib-hero-desc">{featured.description}</div>
            <div className="rc-meta">{[featured.date, featured.duration, featured.host && `Host: ${featured.host.replace(/\.\s*$/, '')}`].filter(Boolean).join('  ·  ')}</div>
            <span className="lib-watch">▶ Watch now</span>
          </div>
        </button>
      )}

      <div className="controls">
        <input className="search-input" placeholder="Search calls, topics, hosts..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="controls" style={{ marginTop: -12 }}>
        {hostOptions.length > 0 && (
          <select className="ctl-select" value={host} onChange={e => setHost(e.target.value)} aria-label="Filter by host">
            <option value="All">All hosts</option>
            {hostOptions.map(h => <option key={h.key} value={h.key}>{h.label} ({h.count})</option>)}
          </select>
        )}
        <select className="ctl-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort order">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {!loading && <span className="more-count" style={{ marginLeft: 'auto' }}>{visible.length} {visible.length === 1 ? 'call' : 'calls'}</span>}
      </div>

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No recordings found.</div>
      ) : (
        <>
          {gridItems.length > 0 && <div className="lib-grid">{gridItems.map(card)}</div>}
          {remaining > 0 && (
            <div className="more-wrap">
              <span className="more-count">Showing {shown.length} of {visible.length}</span>
              <button className="more-btn" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, remaining)} more
              </button>
            </div>
          )}
        </>
      )}

      {playing && (
        <RecordingPlayer
          rec={playing}
          typeClass={getTypeColor(playing.call_type)}
          onClose={close}
          onPrev={playingIdx > 0 ? () => go(-1) : null}
          onNext={playingIdx >= 0 && playingIdx < visible.length - 1 ? () => go(1) : null}
        />
      )}
    </Layout>
  )
}
