import { supabase } from '../../lib/supabase'

// Receives the public new-member intake form (/newmemberintake), checks it, and
// saves it to the new_member_intake table (insert-only for the public; see
// docs/migrations/2026-11-08-new-member-intake.sql).
//
// Optional email alert, sent only if these Vercel environment variables exist
// (otherwise it is skipped and the application is still saved):
//   RESEND_API_KEY     sending key for theradpad.org (same one the revoke email uses)
//   INTAKE_NOTIFY_TO   where the "new application" alert goes (comma-separated ok)
//   EMAIL_FROM         optional, default: The Rad Pad <hello@theradpad.org>
//   RESEND_API_URL     optional, for tests only

const YEARS = ['Under 1', '1-2', '2-5', '5+']
const REVENUE = ['Under $50K', '$50-100K', '$100-250K', '$250K+', 'Prefer not to say']
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

// [field, label, max length, required]
const TEXT = [
  ['first_name', 'First name', 100, true],
  ['last_name', 'Last name', 100, true],
  ['email', 'Email', 200, true],
  ['business_name', 'Business name', 200, true],
  ['website', 'Website', 500, true],
  ['location', 'Location', 200, true],
  ['referred_by', 'Referred by', 200, true],
  ['best_project_link', 'Project link', 500, false],
  ['about_business', 'About your business', 5000, true],
  ['going_well_challenge', 'What’s going well / challenge', 5000, true],
  ['hoping_to_get', 'What you hope to get', 5000, true],
  ['strengths', 'Strengths', 5000, true],
  ['anything_else', 'Anything else', 5000, false],
]

const MAX_PER_HOUR = 6
const hits = new Map()

function tooMany(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter(t => now - t < 3600 * 1000)
  if (list.length >= MAX_PER_HOUR) { hits.set(ip, list); return true }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < 3600 * 1000)) hits.delete(k)
  return false
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

async function notify(row) {
  const apiKey = process.env.RESEND_API_KEY
  const to = (process.env.INTAKE_NOTIFY_TO || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!apiKey || !to.length) return
  const name = `${row.first_name} ${row.last_name}`
  const lines = [
    ['Email', row.email], ['Business', row.business_name], ['Website', row.website], ['Location', row.location],
    ['Referred by', row.referred_by], ['Years in business', row.years_in_business], ['Annual revenue', row.annual_revenue],
    ['Best project', row.best_project_link], ['About the business', row.about_business],
    ['Going well / challenge', row.going_well_challenge], ['Hoping to get', row.hoping_to_get],
    ['Strengths', row.strengths], ['Anything else', row.anything_else],
  ].filter(([, v]) => v)
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">
<h2 style="margin:0 0 12px">New Rad Pad application: ${esc(name)}</h2>
${lines.map(([k, v]) => `<p style="margin:0 0 10px"><b>${esc(k)}</b><br>${esc(v).replace(/\n/g, '<br>')}</p>`).join('')}
<p style="color:#666">Review it in the admin panel under New Applications.</p></div>`
  const text = `New Rad Pad application: ${name}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join('\n\n')}\n\nReview it in the admin panel under New Applications.`
  const payload = {
    from: process.env.EMAIL_FROM || 'The Rad Pad <hello@theradpad.org>',
    to,
    subject: `New Rad Pad application: ${name}`,
    html,
    text,
    reply_to: row.email,
  }
  try {
    await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    // The application is already saved; a failed alert must never lose it.
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}

  // Hidden trap field: people never fill it in, bots do. Pretend it worked.
  if (body.company_url) return res.status(200).json({ ok: true })

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  if (tooMany(ip)) return res.status(429).json({ error: 'too-many' })

  const row = {}
  for (const [key, label, max, required] of TEXT) {
    const raw = body[key]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (required && !v) return res.status(400).json({ error: 'missing', field: key, message: `${label} is required.` })
    if (v.length > max) return res.status(400).json({ error: 'too-long', field: key, message: `${label} is too long.` })
    row[key] = v || null
  }
  if (!EMAIL_RE.test(row.email)) return res.status(400).json({ error: 'bad-email', field: 'email', message: 'Please enter a valid email address.' })
  if (!YEARS.includes(body.years_in_business)) return res.status(400).json({ error: 'missing', field: 'years_in_business', message: 'Please choose your years in business.' })
  if (!REVENUE.includes(body.annual_revenue)) return res.status(400).json({ error: 'missing', field: 'annual_revenue', message: 'Please choose your annual revenue.' })
  row.years_in_business = body.years_in_business
  row.annual_revenue = body.annual_revenue

  const { error } = await supabase.from('new_member_intake').insert(row)
  if (error) return res.status(500).json({ error: 'save-failed', message: 'We couldn’t save that. Please try again in a moment.' })

  await notify(row)
  return res.status(200).json({ ok: true })
}
