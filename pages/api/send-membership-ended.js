import crypto from 'crypto'
import { membershipEndedEmail } from '../../lib/emails/membershipEnded'

// Sends the "membership ended" email through Resend. Called from the admin
// dashboard only. The admin page has no login of its own, so this route is
// protected by a passphrase (ADMIN_SEND_PASSPHRASE) and can only ever send this
// one fixed email: the sender can choose the recipient, first name and date, and
// nothing else.
//
// Vercel environment variables:
//   RESEND_API_KEY          a Resend key with "Sending access" for theradpad.org
//   ADMIN_SEND_PASSPHRASE   a long phrase only Casey knows (typed in the admin)
//   EMAIL_FROM              optional, default: The Rad Pad <hello@theradpad.org>
//   EMAIL_REPLY_TO          optional reply-to address
//   RESEND_API_URL          optional, for tests only

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
const MAX_PER_HOUR = 30
const sentAt = []

const sleep = ms => new Promise(r => setTimeout(r, ms))

function samePassphrase(given, expected) {
  const a = Buffer.from(String(given || ''))
  const b = Buffer.from(String(expected || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const passphrase = process.env.ADMIN_SEND_PASSPHRASE
  if (!apiKey || !passphrase) return res.status(503).json({ error: 'not-configured' })

  if (!samePassphrase(req.headers['x-admin-passphrase'], passphrase)) {
    await sleep(800) // slows down guessing
    return res.status(401).json({ error: 'bad-passphrase' })
  }

  const now = Date.now()
  while (sentAt.length && now - sentAt[0] > 3600 * 1000) sentAt.shift()
  if (sentAt.length >= MAX_PER_HOUR) return res.status(429).json({ error: 'too-many' })

  const { to, firstName, endDate } = req.body || {}
  if (typeof to !== 'string' || !EMAIL_RE.test(to.trim()) || to.length > 200) return res.status(400).json({ error: 'bad-recipient' })
  if (firstName != null && (typeof firstName !== 'string' || firstName.length > 60)) return res.status(400).json({ error: 'bad-name' })
  if (endDate != null && (typeof endDate !== 'string' || endDate.length > 40)) return res.status(400).json({ error: 'bad-date' })

  const mail = membershipEndedEmail({ firstName, endDate })
  const payload = {
    from: process.env.EMAIL_FROM || 'The Rad Pad <hello@theradpad.org>',
    to: [to.trim()],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  }
  if (process.env.EMAIL_REPLY_TO) payload.reply_to = process.env.EMAIL_REPLY_TO

  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return res.status(502).json({ error: 'resend', detail: data.message || `Resend returned ${r.status}` })
    sentAt.push(now)
    return res.status(200).json({ ok: true, id: data.id || null })
  } catch (e) {
    return res.status(502).json({ error: 'resend', detail: 'Could not reach Resend.' })
  }
}
