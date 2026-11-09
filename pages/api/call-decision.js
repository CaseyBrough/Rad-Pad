import { supabase } from '../../lib/supabase'
import { buildIcs } from '../../lib/calendar'
import { callApprovedEmail, callDeclinedEmail } from '../../lib/emails/callEmails'

// Admin > Call Bookings: approve or decline a member's request to host a call.
// The decision itself is made by the database function call_request_decide,
// which checks the admin passphrase (the same one as the New Applications tab)
// and, on approval, creates the Calendar event. This route then emails the host.
// A failed email never undoes the decision; the response says `emailed: false`
// so the admin can tell the host themselves.
//
// Environment variables: RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, RESEND_API_URL (same as the other routes).

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false
  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('call-decision email refused', r.status)
    return r.ok
  } catch (e) {
    console.error('call-decision email failed', e && e.name)
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }
  const { k, id, decision } = req.body || {}
  if (typeof k !== 'string' || typeof id !== 'string' || !['approved', 'declined'].includes(decision)) {
    return res.status(400).json({ error: 'bad-request' })
  }

  const { data: r, error } = await supabase.rpc('call_request_decide', { k, row_id: id, decision })
  if (error) {
    if (error.message.includes('bad-key')) { await sleep(800); return res.status(401).json({ error: 'bad-key' }) }
    const known = ['slot-taken', 'already-decided', 'not-found']
    const code = known.find(c => error.message.includes(c))
    if (code) return res.status(409).json({ error: code })
    console.error('call-decision failed', error.message)
    return res.status(500).json({ error: 'failed' })
  }

  const from = process.env.EMAIL_FROM || 'The Rad Pad <hello@theradpad.org>'
  const reply_to = process.env.EMAIL_REPLY_TO || 'hello@theradpad.org'
  let emailed = false
  if (decision === 'approved') {
    const { data: ev } = await supabase.from('events').select('*').eq('id', r.event_id).maybeSingle()
    const event = ev || { title: r.title, event_date: r.event_date }
    const mail = callApprovedEmail(r, event)
    emailed = await sendEmail({
      from, to: [r.host_email], subject: mail.subject, html: mail.html, text: mail.text, reply_to,
      attachments: [{ filename: 'rad-pad-call.ics', content: Buffer.from(buildIcs(event)).toString('base64') }],
    })
  } else {
    const mail = callDeclinedEmail(r)
    emailed = await sendEmail({ from, to: [r.host_email], subject: mail.subject, html: mail.html, text: mail.text, reply_to })
  }
  return res.status(200).json({ ok: true, emailed })
}
