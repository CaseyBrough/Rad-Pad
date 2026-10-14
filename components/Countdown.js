import { useState, useEffect } from 'react'

// Ticks once a second so countdowns feel alive. Starts as null so server and
// client markup match; the real time appears right after mount.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

const pad = n => String(n).padStart(2, '0')

// Days / hours / minutes / seconds tiles until `startMs`, then LIVE NOW until `endMs`.
export default function Countdown({ startMs, endMs, allDay = false }) {
  const now = useNow(1000)
  if (now == null) return <div className="cd" aria-hidden="true" style={{ minHeight: 64 }} />

  if (now >= startMs && now < endMs) {
    // No start time was given, so we can't claim the call is "live" - just say it's today.
    return allDay
      ? <div className="cd-live today" role="status">Today</div>
      : <div className="cd-live" role="status"><span className="live-dot" />Happening now</div>
  }
  if (now >= endMs) return null

  const total = Math.max(0, Math.floor((startMs - now) / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const units = [['days', d], ['hrs', h], ['min', m], ['sec', s]]
  return (
    <div className="cd" role="timer" aria-label={`Starts in ${d} days, ${h} hours, ${m} minutes`}>
      {units.map(([label, value]) => (
        <div key={label} className="cd-unit">
          <b>{label === 'days' ? value : pad(value)}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
