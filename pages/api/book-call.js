import { supabase } from '../../lib/supabase'
import { callRequestedEmail, callRequestAlertEmail } from '../../lib/emails/callEmails'

// A signed-in member asks to host a call (Calendar page -> "Host this call").
// Checks the member's sign-in token, saves the request through the database
// function call_request_create (which also checks the date is a free Tuesday or Thursday),
// then emails the host and the team. A failed email never loses the request.
//
// Environment variables (all optional except the Supabase ones the site already has):
//   RESEND_API_KEY        sending key for theradpad.org
//   BOOKING_NOTIFY_TO     where the team alert goes (comma-separated ok); falls back to INTAKE_NOTIFY_TO
//   EMAIL_FROM            default: The Rad Pad <hello@theradpad.org>
//   EMAIL_REPLY_TO        reply-to on the host's emails (default hello@theradpad.org)
//   RESEND_API_URL        for tests only

const TEXT = [
  ['name', 'Your name', 100, true],
  ['title', 'Call topic', 150, true],
  ['description', 'Description', 2000, false],
  ['note', 'Note', 1000, false],
]
const TYPES = ['Community Call', 'Skills Call', 'Theme Call', 'Guest Speaker']
const MAX_PER_HOUR = 8
const hits = new Map()

function tooMany(key) {
  const now = Date.now()
  const list = (hits.get(key) || []).filter(t => now - t < 3600 * 1000)
  if (list.length >= MAX_PER_HOUR) { hits.set(key, list); return true }
  list.push(now)
  hits.set(key, list)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < 3600 * 1000)) hits.delete(k)
  return false
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('book-call email refused', r.status)
  } catch (e) {
    console.error('book-call email failed', e && e.name)
  }
}

const MESSAGES = {
  'slot-taken': 'Someone just asked for that date. Please pick another one.',
  'date-passed': 'That date has already passed. Please pick a future date.',
  'not-a-call-day': 'Calls can be booked on Tuesdays and Thursdays. Please pick one of those.',
  'bad-date': 'Please pick a date.',
  'too-many-pending': 'You already have two requests waiting. We’ll get to those first.',
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (body.company_url) return res.status(200).json({ ok: true }) // trap field for bots

  // Who is asking: the verified signed-in member, never an email typed into the form.
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'sign-in', message: 'Please sign in again to book a call.' })
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  const email = auth?.user?.email
  if (authError || !email) return res.status(401).json({ error: 'sign-in', message: 'Your sign-in has expired. Please sign in again.' })

  if (tooMany(email.toLowerCase())) return res.status(429).json({ error: 'too-many', message: 'Too many requests. Please try again later.' })

  const row = {}
  for (const [key, label, max, required] of TEXT) {
    const raw = body[key]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (required && !v) return res.status(400).json({ error: 'missing', field: key, message: `${label} is required.` })
    if (v.length > max) return res.status(400).json({ error: 'too-long', field: key, message: `${label} is too long.` })
    // One line only for the fields that end up in email subjects and headings.
    row[key] = key === 'name' || key === 'title' ? v.replace(/\s+/g, ' ') : v
  }
  const type = TYPES.includes(body.type) ? body.type : 'Community Call'
  const date = typeof body.date === 'string' ? body.date : ''

  const { data: id, error } = await supabase.rpc('call_request_create', {
    p_date: date, p_name: row.name, p_email: email, p_title: row.title,
    p_description: row.description || null, p_type: type, p_note: row.note || null,
  })
  if (error) {
    const code = Object.keys(MESSAGES).find(c => error.message.includes(c))
    if (code) return res.status(409).json({ error: code, message: MESSAGES[code] })
    console.error('book-call save failed', error.message)
    return res.status(500).json({ error: 'save-failed', message: 'We couldn’t save that. Please try again in a moment.' })
  }

  // What the host will see for the time (from the shared settings).
  const { data: settings } = await supabase.from('site_settings').select('key,value').in('key', ['default_call_time', 'default_call_duration'])
  const s = Object.fromEntries((settings || []).map(x => [x.key, x.value]))
  const when = [s.default_call_time, s.default_call_duration].filter(Boolean).join(' · ')

  const request = { id, event_date: date, host_name: row.name, host_email: email, title: row.title, description: row.description || null, call_type: type, note: row.note || null }
  const from = process.env.EMAIL_FROM || 'The Rad Pad <hello@theradpad.org>'
  const team = (process.env.BOOKING_NOTIFY_TO || process.env.INTAKE_NOTIFY_TO || '').split(',').map(x => x.trim()).filter(Boolean)
  const ack = callRequestedEmail(request, when)
  const jobs = [sendEmail({ from, to: [email], subject: ack.subject, html: ack.html, text: ack.text, reply_to: process.env.EMAIL_REPLY_TO || 'hello@theradpad.org' })]
  if (team.length) {
    const alert = callRequestAlertEmail(request, when)
    jobs.push(sendEmail({ from, to: team, subject: alert.subject, html: alert.html, text: alert.text, reply_to: email }))
  }
  await Promise.all(jobs)
  return res.status(200).json({ ok: true })
}
