// One searchable index over everything in the hub. The whole library is small
// (a few hundred rows), so it is loaded once per visit and searched in the
// browser - instant results, no search service.

import { supabase } from './supabase'

export const KIND_ORDER = ['page', 'recording', 'event', 'member', 'resource', 'link']
export const KIND_LABEL = { page: 'Go to', recording: 'Calls', event: 'Events', member: 'People', resource: 'Resources', link: 'Links' }

const PAGES = [
  { title: 'Home', href: '/', sub: 'Your dashboard' },
  { title: 'The Pad', href: '/the-pad', sub: 'Channels, bulletin board, refer someone' },
  { title: 'Resources', href: '/resources', sub: 'Guides and templates' },
  { title: 'Call Recordings', href: '/recordings', sub: 'Every call, watch in the hub' },
  { title: 'Calendar', href: '/calendar', sub: 'Upcoming calls in your time' },
  { title: 'Member Directory', href: '/directory', sub: 'Find collaborators and referral partners' },
  { title: 'Map', href: '/map', sub: 'Where the community is' },
  { title: 'Links', href: '/links', sub: 'Vetted tools and services' },
]

let cached = null

export function loadIndex() {
  if (cached) return cached
  cached = Promise.all([
    supabase.from('recordings').select('id,title,description,date,host,call_type,sub_topic').order('date', { ascending: false }),
    supabase.from('events').select('id,title,description,event_date,time,type').order('event_date', { ascending: false }),
    supabase.from('resources').select('id,title,description,category,file_url,file_type'),
    supabase.from('links').select('id,name,description,url,category,emoji').eq('approved', true),
    supabase.from('members').select('id,name,specialty,location,bio,photo_url').eq('approved', true),
  ]).then(([rec, ev, res, links, mem]) => {
    const items = []
    PAGES.forEach(p => items.push({ kind: 'page', key: 'p' + p.href, title: p.title, sub: p.sub, href: p.href, hay: `${p.title} ${p.sub}`.toLowerCase(), titleLc: p.title.toLowerCase() }))
    ;(rec.data || []).forEach(r => items.push({
      kind: 'recording', key: 'r' + r.id, title: r.title,
      sub: [r.date, r.host && r.host.replace(/\.\s*$/, ''), r.call_type].filter(Boolean).join(' · '),
      href: { pathname: '/recordings', query: { v: r.id } },
      hay: [r.title, r.description, r.host, r.call_type, r.sub_topic].filter(Boolean).join(' ').toLowerCase(), titleLc: (r.title || '').toLowerCase(),
    }))
    ;(ev.data || []).forEach(e => items.push({
      kind: 'event', key: 'e' + e.id, title: e.title,
      sub: [e.event_date, e.time, e.type].filter(Boolean).join(' · '),
      href: '/calendar',
      hay: [e.title, e.description, e.type].filter(Boolean).join(' ').toLowerCase(), titleLc: (e.title || '').toLowerCase(),
    }))
    ;(mem.data || []).forEach(m => items.push({
      kind: 'member', key: 'm' + m.id, title: m.name,
      sub: [m.specialty, m.location].filter(Boolean).join(' · '),
      photo: m.photo_url,
      href: { pathname: '/directory', query: { q: m.name } },
      hay: [m.name, m.specialty, m.location, m.bio].filter(Boolean).join(' ').toLowerCase(), titleLc: (m.name || '').toLowerCase(),
    }))
    ;(res.data || []).forEach(r => items.push({
      kind: 'resource', key: 'f' + r.id, title: r.title,
      sub: [r.category, r.file_type].filter(Boolean).join(' · '),
      external: r.file_url || null,
      href: { pathname: '/resources', query: { q: r.title } },
      hay: [r.title, r.description, r.category].filter(Boolean).join(' ').toLowerCase(), titleLc: (r.title || '').toLowerCase(),
    }))
    ;(links.data || []).forEach(l => items.push({
      kind: 'link', key: 'l' + l.id, title: l.name, icon: l.emoji || '🔗',
      sub: [l.category, l.description].filter(Boolean).join(' · '),
      external: l.url || null,
      href: { pathname: '/links' },
      hay: [l.name, l.description, l.category].filter(Boolean).join(' ').toLowerCase(), titleLc: (l.name || '').toLowerCase(),
    }))
    return items
  }).catch(() => { cached = null; return [] })
  return cached
}

// Every word typed must appear somewhere; title matches rank above body matches.
export function search(items, query, perKind = 5) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const scored = []
  for (const it of items) {
    if (!words.every(w => it.hay.includes(w))) continue
    let score = 0
    if (it.titleLc.includes(words.join(' '))) score += 10
    for (const w of words) {
      if (it.titleLc.startsWith(w)) score += 6
      else if (it.titleLc.includes(' ' + w)) score += 4
      else if (it.titleLc.includes(w)) score += 3
      else score += 1
    }
    scored.push({ it, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const counts = {}
  const out = []
  for (const { it } of scored) {
    counts[it.kind] = (counts[it.kind] || 0) + 1
    if (counts[it.kind] <= perKind) out.push(it)
  }
  return out.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
}

// What to show before anything is typed: the newest calls plus the main pages.
export function suggestions(items) {
  const calls = items.filter(i => i.kind === 'recording').slice(0, 4)
  const pages = items.filter(i => i.kind === 'page').slice(0, 8)
  return [...pages.filter(p => ['/calendar', '/recordings', '/directory', '/map'].includes(p.href)), ...calls]
}
