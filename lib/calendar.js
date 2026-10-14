// "Add to my calendar" for events.
//
// Events are free-text on purpose (time: "3:00pm EST", duration: "90 min"), so
// this parses leniently and degrades gracefully:
//   - time + recognised timezone -> an exact moment (works in any calendar app)
//   - time, no timezone          -> "floating" local time (shows at that clock time
//                                   wherever the member's calendar is set)
//   - no parseable time          -> an all-day event on that date
//
// "EST"/"EDT"/"ET" are all read as America/New_York (US Eastern, with daylight
// saving), because calls labelled "EST" run on Eastern time year-round.

const ZONES = {
  EST: 'America/New_York', EDT: 'America/New_York', ET: 'America/New_York',
  CST: 'America/Chicago', CDT: 'America/Chicago', CT: 'America/Chicago',
  MST: 'America/Denver', MDT: 'America/Denver', MT: 'America/Denver',
  PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles', PT: 'America/Los_Angeles',
  UTC: 'UTC', GMT: 'UTC',
}

const pad = n => String(n).padStart(2, '0')

function tzOffsetMs(utcMs, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).map(p => [p.type, p.value])
  )
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return asUtc - utcMs
}

// The UTC instant at which the wall clock in `timeZone` reads y-m-d h:mi.
function wallToUtc(y, mo, d, h, mi, timeZone) {
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let utc = wall
  for (let i = 0; i < 2; i++) utc = wall - tzOffsetMs(utc, timeZone) // twice: converges across DST edges
  return utc
}

export function parseTime(str) {
  if (!str) return null
  const m = str.match(/(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m?\b/i)
  let h, mi
  if (m) {
    h = +m[1] % 12
    if (m[3].toLowerCase() === 'p') h += 12
    mi = +(m[2] || 0)
  } else {
    const m24 = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
    if (!m24) return null
    h = +m24[1]; mi = +m24[2]
  }
  const zone = str.match(/\b(EST|EDT|ET|CST|CDT|CT|MST|MDT|MT|PST|PDT|PT|UTC|GMT)\b/i)
  return { h, mi, timeZone: zone ? ZONES[zone[1].toUpperCase()] : null }
}

export function parseDurationMin(str) {
  if (!str) return 60
  const s = String(str).toLowerCase()
  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  const mins = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/)
  if (hours || mins) return Math.round((hours ? +hours[1] * 60 : 0) + (mins ? +mins[1] : 0)) || 60
  const bare = s.match(/^\s*(\d+)\s*$/)
  return bare ? +bare[1] : 60
}

// -> { allDay, start, end } where start/end are ICS-style strings (no punctuation).
export function eventWhen(ev) {
  const [y, mo, d] = String(ev.event_date).split('-').map(Number)
  const t = parseTime(ev.time)
  if (!t) {
    const next = new Date(Date.UTC(y, mo - 1, d + 1))
    return {
      allDay: true,
      start: `${y}${pad(mo)}${pad(d)}`,
      end: `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`,
    }
  }
  const minutes = parseDurationMin(ev.duration)
  if (t.timeZone) {
    const startMs = wallToUtc(y, mo, d, t.h, t.mi, t.timeZone)
    const fmt = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    return { allDay: false, utc: true, start: fmt(startMs), end: fmt(startMs + minutes * 60000) }
  }
  const startMs = Date.UTC(y, mo - 1, d, t.h, t.mi)
  const fmt = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '')
  return { allDay: false, utc: false, start: fmt(startMs), end: fmt(startMs + minutes * 60000) }
}

function describe(ev) {
  return [ev.description, ev.zoom_url && `Join: ${ev.zoom_url}`].filter(Boolean).join('\n\n')
}

export function googleCalendarUrl(ev) {
  const w = eventWhen(ev)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title || 'The Rad Pad call',
    dates: `${w.start}/${w.end}`,
    details: describe(ev),
    location: ev.zoom_url || ev.platform || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')

// RFC 5545: lines over 75 octets are folded onto continuation lines.
function fold(line) {
  const out = []
  let rest = line
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74) }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(ev) {
  const w = eventWhen(ev)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  // w.start/w.end already carry their trailing Z when they are UTC instants.
  const dt = (name, v) => (w.allDay ? `${name};VALUE=DATE:${v}` : `${name}:${v}`)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Rad Pad//Members Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id || ev.event_date + '-' + (ev.title || 'event')}@theradpad.org`,
    `DTSTAMP:${stamp}`,
    dt('DTSTART', w.start),
    dt('DTEND', w.end),
    `SUMMARY:${esc(ev.title || 'The Rad Pad call')}`,
    `DESCRIPTION:${esc(describe(ev))}`,
    ev.zoom_url || ev.platform ? `LOCATION:${esc(ev.zoom_url || ev.platform)}` : null,
    ev.zoom_url ? `URL:${ev.zoom_url}` : null,
    ...(w.allDay ? [] : ['BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Starting soon', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(ev) {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const slug = (ev.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug || 'event'}-${ev.event_date}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
