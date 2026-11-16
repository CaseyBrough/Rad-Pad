import { useState } from 'react'
import { placePin, AREA_LABEL } from '../../lib/placement'
import { REGION_FULL_NAMES } from '../../lib/geo'

// Block-grid building blocks for the admin: a clickable tile, a filter chip
// row, and the "where is this person" grouping used by Members and Map Pins.

export function Tile({ media, title, meta, desc, chips, foot, onOpen, onDelete, deleteLabel = 'Delete', className = '' }) {
  return (
    <div className={`adm-tile ${className}`} tabIndex={0} role="button" aria-label={`Edit ${title}`}
      onClick={onOpen}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }}>
      {onDelete && (
        <button className="adm-btn danger sm adm-tile-del" aria-label={`${deleteLabel} ${title}`}
          onClick={e => { e.stopPropagation(); onDelete() }}>{deleteLabel}</button>
      )}
      {media && <div className="adm-tile-media">{media}</div>}
      <div className="adm-tile-title">{title}</div>
      {meta && <div className="adm-tile-meta">{meta}</div>}
      {desc && <p className="adm-tile-desc">{desc}</p>}
      {(chips?.length > 0 || foot) && (
        <div className="adm-tile-foot">
          {chips?.filter(Boolean).map((c, i) => <span key={i} className={`adm-chip${c.tone ? ' ' + c.tone : ''}`}>{c.text}</span>)}
          {foot}
        </div>
      )}
    </div>
  )
}

// "All · Software 9 · Gear 4 …" — one active value, '' = all.
export function FilterChips({ options, value, onChange, allLabel = 'All', total }) {
  return (
    <div className="adm-filters" role="group" aria-label="Filter">
      <button className={`adm-filter${value === '' ? ' on' : ''}`} onClick={() => onChange('')}>{allLabel}{total != null && <b>{total}</b>}</button>
      {options.map(o => (
        <button key={o.value} className={`adm-filter${value === o.value ? ' on' : ''}`} onClick={() => onChange(value === o.value ? '' : o.value)}>
          {o.label}<b>{o.count}</b>
        </button>
      ))}
    </div>
  )
}

// Count rows by a key -> [{ value, label, count }] sorted by label.
export function countBy(rows, keyOf, { last } = {}) {
  const m = new Map()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => (a.value === last) - (b.value === last) || a.label.localeCompare(b.label))
}

export const NO_PLACE = 'Location unknown'

const titleCase = s => String(s || '').replace(/\b[a-z]/g, c => c.toUpperCase())

// "Brooklyn, NY" -> "New York"; "Sydney, Australia" -> "Oceania".
export function placeGroup(location, mapArea) {
  if (!String(location || '').trim()) return NO_PLACE
  const w = placePin({ location, map_area: mapArea })
  if (w.kind === 'na') return titleCase(REGION_FULL_NAMES[w.parsed.region]) || w.parsed.region || NO_PLACE
  if (w.kind === 'intl') return AREA_LABEL[w.area] || NO_PLACE
  return NO_PLACE
}

export function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Link logo from Google's favicon service, falling back to the emoji.
export function LinkLogo({ url, emoji }) {
  const [broken, setBroken] = useState(false)
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch {}
  if (!host || broken) return <span className="adm-logo emoji" aria-hidden="true">{emoji || '🔗'}</span>
  return (
    <span className="adm-logo" aria-hidden="true">
      <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`} alt="" width="28" height="28"
        loading="lazy" referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        onLoad={e => { if (e.currentTarget.naturalWidth < 24) setBroken(true) }} />
    </span>
  )
}
