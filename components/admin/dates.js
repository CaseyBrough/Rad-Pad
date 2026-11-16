// Date display for the admin. Stored dates are plain YYYY-MM-DD strings.

const pad = n => String(n).padStart(2, '0')

export const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => dateKey(new Date())

// "2026-12-01" -> "Tue, Dec 1" (year added when it isn't this year).
// long: "Tuesday, December 1".
export function fmtDay(key, { long = false } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''))
  if (!m) return ''
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  const opts = long
    ? { weekday: 'long', month: 'long', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}
