import { supabase } from '../../lib/supabase'
import { buildFeed } from '../../lib/calendar'

// The subscribable calendar: https://www.theradpad.org/api/calendar.ics?t=<token>
// Google / Apple / Outlook re-fetch it on their own schedule, so new and changed
// calls show up without anyone re-importing. The token (site_settings.feed_token)
// keeps the Zoom links out of casual view; the Calendar page shows members the
// full link. Without the right token this returns 404.

export default async function handler(req, res) {
  const { data: setting } = await supabase.from('site_settings').select('value').eq('key', 'feed_token').maybeSingle()
  const token = setting?.value
  if (!token || req.query.t !== token) return res.status(404).send('Not found')

  const { data: events, error } = await supabase.from('events').select('*').order('event_date', { ascending: true })
  if (error) return res.status(502).send('Calendar unavailable')

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="the-rad-pad.ics"')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(buildFeed(events || []))
}
