// Shared branded shell for the emails this site sends (dark card, pink/cyan
// accent bar, script wordmark). Inline styles only, because mail apps ignore
// <style> blocks. Matches lib/emails/membershipEnded.js.

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const BODY = "font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#D8D4E8;"
const MONO = "font-family:'DM Mono','Courier New',monospace;"

export const p = html => `<p style="margin:0 0 16px 0;">${html}</p>`

// A small mono label above a block of content.
export const label = (text, color = '#FF2D78') =>
  `<div style="${MONO}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${color};padding-bottom:10px;">${esc(text)}</div>`

// A rounded panel. `accent` tints the border (cyan callout vs. plain).
export const panel = (inner, accent) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1A1622" style="background-color:#1A1622;border:1px solid ${accent ? 'rgba(0,245,228,0.35)' : '#2a2433'};border-radius:12px;"><tr><td style="padding:20px 22px;">${inner}</td></tr></table>`

export const bullets = items =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#D8D4E8;">${items
    .map((t, i) => `<tr><td width="22" valign="top" style="color:#00F5E4;">&#8226;</td><td style="${i < items.length - 1 ? 'padding-bottom:8px;' : ''}">${t}</td></tr>`)
    .join('')}</table>`

export const link = (href, text) => `<a href="${esc(href)}" style="color:#00F5E4;text-decoration:underline;">${esc(text)}</a>`

// Wraps content rows in the full branded email document.
//   hero:    optional image URL shown across the top of the card
//   sections: array of html strings, each placed in its own padded row
export function shell({ title, preheader, sub = 'The Rad Pad', hero, eyebrow, heading, sections, footer }) {
  const rows = sections
    .map(s => `<tr><td style="padding:0 36px 20px 36px;${BODY}">${s}</td></tr>`)
    .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Bebas+Neue&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0D0A0E;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0D0A0E;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0A0E" style="background-color:#0D0A0E;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr>
          <td align="center" style="padding:8px 0 24px 0;">
            <div style="font-family:'Dancing Script','Brush Script MT',cursive;font-size:46px;line-height:1.1;color:#FF2D78;text-shadow:0 0 24px rgba(255,45,120,0.7);">The Rad Pad</div>
            <div style="${MONO}font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#D8D4E8;padding-top:6px;">${esc(sub)}</div>
          </td>
        </tr>
        <tr>
          <td bgcolor="#13101A" style="background-color:#13101A;border:1px solid #2a2433;border-radius:16px;padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="4" style="height:4px;line-height:4px;font-size:0;border-radius:16px 16px 0 0;background-color:#FF2D78;background-image:linear-gradient(90deg,#FF2D78,#00F5E4);">&nbsp;</td></tr>
              ${hero ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${esc(hero)}" width="600" alt="The Rad Pad" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>` : ''}
              <tr>
                <td style="padding:36px 36px 8px 36px;">
                  ${eyebrow ? `<div style="${MONO}font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#00F5E4;padding-bottom:12px;">${esc(eyebrow)}</div>` : ''}
                  <div style="font-family:'Bebas Neue',Impact,'Arial Narrow',sans-serif;font-size:36px;line-height:1.1;letter-spacing:1px;color:#F8F5FF;">${esc(heading)}</div>
                </td>
              </tr>
              <tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
${rows}
              <tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:22px 12px 8px 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9a94ad;">
            ${footer}<br>theradpad.org
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`
}
