// "New since your last visit" tracking for the member hub.
//
// Each section remembers the moment the member last opened it (localStorage,
// per browser). Anything added after that moment counts as new. Nothing is
// stored on the server, so this adds no database tables or columns.
//
// The very first time a browser loads the site there is no history to compare
// against, so every section is baselined to "now" - members see dots only for
// content that arrives after that, never a wall of "new" on day one.

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// pathname -> what "new" means on that page.
export const NEW_SECTIONS = {
  '/recordings': { key: 'recordings', table: 'recordings', singular: 'recording', plural: 'recordings' },
  '/calendar': { key: 'events', table: 'events', singular: 'event', plural: 'events' },
  '/resources': { key: 'resources', table: 'resources', singular: 'resource', plural: 'resources' },
  '/links': { key: 'links', table: 'links', singular: 'link', plural: 'links', filter: q => q.eq('approved', true) },
  '/the-pad': { key: 'announcements', table: 'announcements', singular: 'announcement', plural: 'announcements', filter: q => q.eq('archived', false) },
}

const SECTIONS = Object.entries(NEW_SECTIONS).map(([href, s]) => ({ href, ...s }))
const PREFIX = 'radpad:seen:'
const INIT_KEY = 'radpad:seen-init'
const CACHE_MS = 60 * 1000

function read(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}
function write(key, value) {
  try { window.localStorage.setItem(key, value) } catch { /* private mode / storage blocked: dots just won't persist */ }
}

export function getSeen(key) {
  if (typeof window === 'undefined') return null
  return read(PREFIX + key)
}

// Postgres timestamps come back without a timezone suffix for some columns
// ("2026-09-28T16:40:00.548") - the database stores UTC, so read them as UTC.
export function parseTs(value) {
  if (!value) return null
  const s = String(value)
  const d = new Date(/[zZ]$|[+-]\d\d(:?\d\d)?$/.test(s) ? s : s + 'Z')
  return Number.isNaN(d.getTime()) ? null : d
}

// True when `createdAt` is later than the snapshot of "last seen" a page took
// when it mounted (see useSeenSnapshot). No snapshot = nothing is new.
export function isNewSince(createdAt, seenSnapshot) {
  if (!seenSnapshot) return false
  const created = parseTs(createdAt)
  const seen = parseTs(seenSnapshot)
  return !!(created && seen && created > seen)
}

// Pages call this during their first render, BEFORE the layout marks the
// section as seen, so the "New" chips reflect the previous visit.
export function useSeenSnapshot(key) {
  const [snapshot] = useState(() => getSeen(key))
  return snapshot
}

const store = { counts: null, at: 0, promise: null }

function ensureBaseline() {
  if (read(INIT_KEY)) return
  const now = new Date().toISOString()
  SECTIONS.forEach(s => write(PREFIX + s.key, now))
  write(INIT_KEY, now)
}

export function markSeen(key) {
  write(PREFIX + key, new Date().toISOString())
  if (store.counts) store.counts = { ...store.counts, [key]: 0 }
}

async function fetchCounts() {
  ensureBaseline()
  const entries = await Promise.all(SECTIONS.map(async s => {
    const since = getSeen(s.key)
    if (!since) return [s.key, 0]
    let q = supabase.from(s.table).select('*', { count: 'exact', head: true }).gt('created_at', since)
    if (s.filter) q = s.filter(q)
    const { count } = await q
    return [s.key, count || 0]
  }))
  return Object.fromEntries(entries)
}

function getNewCounts() {
  if (store.counts && Date.now() - store.at < CACHE_MS) return Promise.resolve(store.counts)
  if (!store.promise) {
    store.promise = fetchCounts()
      .then(counts => { store.counts = counts; store.at = Date.now(); return counts })
      .catch(() => store.counts || {})
      .finally(() => { store.promise = null })
  }
  return store.promise
}

// { recordings: 2, events: 0, ... } once loaded, null before. `currentKey` is
// the section being viewed right now - it always reads 0 (you're looking at it).
export function useNewCounts(currentKey) {
  const [counts, setCounts] = useState(store.counts)

  useEffect(() => {
    let alive = true
    getNewCounts().then(c => { if (alive) setCounts({ ...c }) })
    return () => { alive = false }
  }, [])

  if (!counts) return null
  return currentKey ? { ...counts, [currentKey]: 0 } : counts
}

// Stats for the Home "what's new" line.
export function summarizeNew(counts) {
  if (!counts) return []
  return SECTIONS
    .filter(s => counts[s.key] > 0)
    .map(s => ({ href: s.href, count: counts[s.key], label: counts[s.key] === 1 ? s.singular : s.plural }))
}
