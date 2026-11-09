import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { copyText } from '../lib/referral'

// "Subscribe to the calendar": a live feed (pages/api/calendar.ics.js) that
// Google, Apple and Outlook keep up to date by themselves, so every new or
// changed call shows up without anyone re-importing it.
//   token    the feed token if the page already loaded it; otherwise it is fetched here
//   compact  just the three buttons (for use inside another card)
export default function SubscribeCalendar({ token: given, compact = false }) {
  const [fetched, setFetched] = useState('')
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    if (given !== undefined) return
    let live = true
    supabase.from('site_settings').select('value').eq('key', 'feed_token').maybeSingle().then(({ data }) => { if (live && data?.value) setFetched(data.value) })
    return () => { live = false }
  }, [given])

  const token = given !== undefined ? given : fetched
  if (!token || !origin) return null

  const feed = `${origin}/api/calendar.ics?t=${token}`
  const webcal = feed.replace(/^https?:/, 'webcal:')
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`

  const buttons = (
    <div className="sub-actions">
      <a className="cal-add-btn" href={google} target="_blank" rel="noopener noreferrer">Google Calendar</a>
      <a className="cal-add-btn" href={webcal}>Apple / Outlook</a>
      <button type="button" className="cal-add-btn" onClick={() => copyText(feed, 'Calendar link copied')}>Copy link</button>
    </div>
  )
  if (compact) return buttons

  return (
    <div className="sub-strip">
      <div>
        <div className="sub-title">Subscribe to every call</div>
        <div className="sub-sub">Add the Rad Pad calendar once and new calls appear on their own. Google can take several hours to refresh.</div>
      </div>
      {buttons}
    </div>
  )
}
