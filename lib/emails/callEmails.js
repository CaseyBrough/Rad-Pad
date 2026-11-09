// Emails for in-hub call booking. Each returns { subject, html, text }.
//   callRequestedEmail(req)   to the host: "we got your request"
//   callRequestAlertEmail(req) to the team: a member wants to host
//   callApprovedEmail(req, ev) to the host: it's on the calendar (+ .ics attached by the caller)
//   callDeclinedEmail(req)    to the host: not this date
// All member-supplied text is escaped.

import { shell, esc, p, label, panel, bullets, link } from './layout'

const SITE = 'https://www.theradpad.org'
const first = r => String(r.host_name || '').trim().split(/\s+/)[0] || 'there'

export function prettyDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

const detailRows = (r, when) => [
  ['Date', prettyDate(r.event_date)],
  when ? ['Time', when] : null,
  ['Topic', r.title],
  r.call_type ? ['Type', r.call_type] : null,
  r.description ? ['Description', r.description] : null,
].filter(Boolean)

const detailsPanel = (rows, accent) =>
  panel(rows.map(([k, v]) => `<div style="padding-bottom:10px;">${label(k, '#00F5E4').replace('padding-bottom:10px;', 'padding-bottom:2px;')}<div style="color:#F8F5FF;white-space:pre-wrap;">${esc(v)}</div></div>`).join(''), accent)

// ── To the host, right after they ask ───────────────────────────────────────
export function callRequestedEmail(r, when) {
  const html = shell({
    title: 'We got your call request',
    preheader: `Your request to host on ${prettyDate(r.event_date)} is in.`,
    sub: 'Host a call',
    eyebrow: 'Request received',
    heading: 'You asked to host a call',
    footer: 'You’re receiving this because you asked to host a call in The Rad Pad hub.',
    sections: [
      p(`Hi ${esc(first(r))},`) + p('Thanks for stepping up to lead a call. Your request is in and the date is being held for you while we take a look.'),
      detailsPanel(detailRows(r, when), true),
      panel(label('What happens next') + bullets([
        'We’ll confirm by email, usually within a day or two.',
        'Once it’s confirmed, the call appears on the hub Calendar with the Zoom link, and you’ll get a calendar invite.',
        'Need to change something? Just reply to this email.',
      ])),
    ],
  })
  const text = `Hi ${first(r)},

Thanks for stepping up to lead a call. Your request is in and the date is being held for you while we take a look.

Date: ${prettyDate(r.event_date)}${when ? `\nTime: ${when}` : ''}
Topic: ${r.title}${r.call_type ? `\nType: ${r.call_type}` : ''}${r.description ? `\nDescription: ${r.description}` : ''}

What happens next:
- We'll confirm by email, usually within a day or two.
- Once it's confirmed, the call appears on the hub Calendar with the Zoom link, and you'll get a calendar invite.
- Need to change something? Just reply to this email.

The Rad Pad
theradpad.org
`
  return { subject: `Your request to host on ${prettyDate(r.event_date)}`, html, text }
}

// ── To the team ─────────────────────────────────────────────────────────────
export function callRequestAlertEmail(r, when) {
  const rows = [['Host', `${r.host_name} <${r.host_email}>`], ...detailRows(r, when), r.note ? ['Note from host', r.note] : null].filter(Boolean)
  const adminUrl = `${SITE}/admin-rp2026#bookings`
  const html = shell({
    title: 'New call booking request',
    preheader: `${r.host_name} wants to host on ${prettyDate(r.event_date)}.`,
    sub: 'Call bookings',
    eyebrow: 'Needs your yes or no',
    heading: `${r.host_name} wants to host a call`,
    footer: 'Sent to the Rad Pad team. Reply goes to the host.',
    sections: [
      detailsPanel(rows, true),
      p(`Approve or decline it in the admin under ${link(adminUrl, 'Call Bookings')}. Approving puts it on the Calendar with the standing Zoom link and emails the host.`),
    ],
  })
  const text = `${r.host_name} (${r.host_email}) wants to host a call.

${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}

Approve or decline: ${adminUrl}
`
  return { subject: `Call request: ${r.host_name} on ${prettyDate(r.event_date)}`, html, text }
}

// ── To the host, approved ───────────────────────────────────────────────────
export function callApprovedEmail(r, ev) {
  const when = [ev.time, ev.duration].filter(Boolean).join(' · ')
  const calUrl = `${SITE}/calendar`
  const html = shell({
    title: 'Your Rad Pad call is confirmed',
    preheader: `You’re hosting on ${prettyDate(r.event_date)}. It’s on the calendar.`,
    sub: 'Host a call',
    eyebrow: 'Confirmed',
    heading: 'You’re on the calendar',
    footer: 'You’re receiving this because you asked to host a call in The Rad Pad hub.',
    sections: [
      p(`Hi ${esc(first(r))},`) + p('Your call is confirmed and live on the hub Calendar. Members can see it and add it to their own calendars.'),
      detailsPanel(detailRows(r, when), true),
      ev.zoom_url ? panel(label('Your Zoom link') + `<div style="word-break:break-all;">${link(ev.zoom_url, ev.zoom_url)}</div><div style="padding-top:8px;font-size:14px;color:#9a94ad;">Same room as every community call. Start it from your Zoom account, or ask us to make you co-host.</div>`) : '',
      p(`A calendar invite is attached. You can also see it on the ${link(calUrl, 'hub Calendar')}.`),
    ].filter(Boolean),
  })
  const text = `Hi ${first(r)},

Your call is confirmed and live on the hub Calendar.

Date: ${prettyDate(r.event_date)}${when ? `\nTime: ${when}` : ''}
Topic: ${r.title}
${ev.zoom_url ? `Zoom: ${ev.zoom_url}\n` : ''}
A calendar invite is attached. Calendar: ${calUrl}

The Rad Pad
theradpad.org
`
  return { subject: `Confirmed: you’re hosting on ${prettyDate(r.event_date)}`, html, text }
}

// ── To the host, declined ───────────────────────────────────────────────────
export function callDeclinedEmail(r) {
  const html = shell({
    title: 'About your call request',
    preheader: `An update on your request for ${prettyDate(r.event_date)}.`,
    sub: 'Host a call',
    eyebrow: 'Update',
    heading: 'We can’t do that date',
    footer: 'You’re receiving this because you asked to host a call in The Rad Pad hub.',
    sections: [
      p(`Hi ${esc(first(r))},`) + p(`Thanks for offering to host on ${esc(prettyDate(r.event_date))}. We can’t take that date, so it’s not going on the calendar.`),
      p('The slot is open again and so are the other call days. Pick another Tuesday on the hub Calendar, or reply and we’ll find a date together.'),
    ],
  })
  const text = `Hi ${first(r)},

Thanks for offering to host on ${prettyDate(r.event_date)}. We can't take that date, so it's not going on the calendar.

The slot is open again and so are the other call days. Pick another Tuesday on the hub Calendar, or reply and we'll find a date together.

The Rad Pad
theradpad.org
`
  return { subject: `About your request for ${prettyDate(r.event_date)}`, html, text }
}
