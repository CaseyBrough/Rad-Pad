// The two emails sent when someone submits /newmemberintake:
//   applicationReceivedEmail(row)  to the applicant: "we got it"
//   applicationAlertEmail(row)     to the team: the full application
// Both return { subject, html, text }. All applicant-supplied text is escaped.

import { shell, esc, p, label, panel, bullets, link } from './layout'

const HERO = 'https://www.theradpad.org/intake-cover.jpg'

const fullName = r => `${r.first_name} ${r.last_name}`.trim()
const siteHref = s => (/^https?:\/\//i.test(String(s)) ? String(s) : `https://${s}`)

// ── To the applicant ────────────────────────────────────────────────────────
export function applicationReceivedEmail(row) {
  const first = String(row.first_name || '').trim() || 'there'
  const ref = String(row.referred_by || '').trim()

  const html = shell({
    title: 'We got your Rad Pad application',
    preheader: 'Thanks for applying to The Rad Pad. Here is what happens next.',
    sub: 'New Member Intake',
    hero: HERO,
    eyebrow: 'Application received',
    heading: 'Thanks for applying',
    footer: 'You’re receiving this because you applied at theradpad.org/newmemberintake.',
    sections: [
      p(`Hi ${esc(first)},`) + p('Thanks for applying to The Rad Pad. We’ve got your application and it’s in the queue.'),
      panel(
        label('What happens next') +
          bullets([
            ref
              ? `We read every application. Because The Rad Pad is referral-only, we also check in with ${esc(ref)}, who referred you.`
              : 'We read every application. Because The Rad Pad is referral-only, we also check in with the member who referred you.',
            'If it’s a fit, you’ll hear from us at this email address with how to get in.',
            'Want to add something? Just reply to this email.',
          ]),
        true,
      ),
      `<div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;color:#F8F5FF;">The Rad Pad</div>`,
    ],
  })

  const text = `Hi ${first},

Thanks for applying to The Rad Pad. We've got your application and it's in the queue.

What happens next:
- We read every application. Because The Rad Pad is referral-only, we also check in with ${ref || 'the member who referred you'}${ref ? ', who referred you' : ''}.
- If it's a fit, you'll hear from us at this email address with how to get in.
- Want to add something? Just reply to this email.

The Rad Pad
theradpad.org
`
  return { subject: 'We got your Rad Pad application', html, text }
}

// ── To the team ─────────────────────────────────────────────────────────────
const DETAILS = [
  ['Email', 'email', 'mail'],
  ['Business', 'business_name'],
  ['Website', 'website', 'url'],
  ['Location', 'location'],
  ['Referred by', 'referred_by'],
  ['Years in business', 'years_in_business'],
  ['Annual revenue', 'annual_revenue'],
  ['Best recent project', 'best_project_link', 'url'],
]

const ANSWERS = [
  ['About the business', 'about_business'],
  ['Going well / the challenge', 'going_well_challenge'],
  ['Hoping to get from the community', 'hoping_to_get'],
  ['What they’d bring to the group', 'strengths'],
  ['Anything else', 'anything_else'],
]

export function applicationAlertEmail(row) {
  const name = fullName(row)

  const detailRows = DETAILS.filter(([, k]) => row[k])
    .map(([lab, k, kind]) => {
      const v = String(row[k])
      const val = kind === 'mail' ? link(`mailto:${v}`, v) : kind === 'url' ? link(siteHref(v), v) : esc(v)
      return `<tr><td valign="top" width="150" style="padding:0 12px 8px 0;font-family:'DM Mono','Courier New',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a94ad;">${esc(lab)}</td><td valign="top" style="padding:0 0 8px 0;font-size:15px;line-height:1.5;color:#F8F5FF;word-break:break-word;">${val}</td></tr>`
    })
    .join('')

  const answerBlocks = ANSWERS.filter(([, k]) => row[k]).map(([lab, k]) =>
    panel(label(lab, '#00F5E4') + `<div style="font-size:15px;line-height:1.7;color:#D8D4E8;">${esc(row[k]).replace(/\r?\n/g, '<br>')}</div>`),
  )

  const html = shell({
    title: `New Rad Pad application: ${name}`,
    preheader: `${name}${row.business_name ? ` from ${row.business_name}` : ''} just applied.`,
    sub: 'New Member Intake',
    eyebrow: 'New application',
    heading: name,
    footer: 'Reply to this email to reach the applicant directly.',
    sections: [
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>`,
      ...answerBlocks,
    ],
  })

  const lines = DETAILS.filter(([, k]) => row[k]).map(([lab, k]) => `${lab}: ${row[k]}`)
  const answers = ANSWERS.filter(([, k]) => row[k]).map(([lab, k]) => `${lab}\n${row[k]}`)
  const text = `New Rad Pad application: ${name}\n\n${lines.join('\n')}\n\n${answers.join('\n\n')}\n\nReply to this email to reach the applicant directly.\n`

  return { subject: `New Rad Pad application: ${name}`, html, text }
}
