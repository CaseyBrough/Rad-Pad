// The one email this site sends to former members. Branded HTML for the inbox,
// plain text as the fallback. Placeholders are filled (and HTML-escaped) by
// membershipEndedEmail().

export const MEMBERSHIP_ENDED_SUBJECT = 'Your Rad Pad membership has ended'

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Your Rad Pad membership</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Bebas+Neue&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0D0A0E;">

<!-- Preheader (the grey preview text in the inbox) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0D0A0E;">An update on your access to The Rad Pad.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0A0E" style="background-color:#0D0A0E;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- Wordmark -->
        <tr>
          <td align="center" style="padding:8px 0 24px 0;">
            <div style="font-family:'Dancing Script','Brush Script MT',cursive;font-size:46px;line-height:1.1;color:#FF2D78;text-shadow:0 0 24px rgba(255,45,120,0.7);">The Rad Pad</div>
            <div style="font-family:'DM Mono','Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#D8D4E8;padding-top:6px;">Members Hub</div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="#13101A" style="background-color:#13101A;border:1px solid #2a2433;border-radius:16px;padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Accent bar -->
              <tr><td height="4" style="height:4px;line-height:4px;font-size:0;border-radius:16px 16px 0 0;background-color:#FF2D78;background-image:linear-gradient(90deg,#FF2D78,#00F5E4);">&nbsp;</td></tr>

              <tr>
                <td style="padding:36px 36px 8px 36px;">
                  <div style="font-family:'DM Mono','Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#00F5E4;padding-bottom:12px;">Membership update</div>
                  <div style="font-family:'Bebas Neue',Impact,'Arial Narrow',sans-serif;font-size:36px;line-height:1.1;letter-spacing:1px;color:#F8F5FF;">Your Rad Pad membership has ended</div>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 36px 0 36px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#D8D4E8;">
                  <p style="margin:0 0 16px 0;">Hi {{first_name}},</p>
                  <p style="margin:0 0 16px 0;">We're writing to let you know that your membership in The Rad Pad has ended, effective <strong style="color:#F8F5FF;font-weight:500;">{{end_date}}</strong>.</p>

                  <p style="margin:0 0 16px 0;">The Rad Pad works best when everyone shows up and gets something out of it. Since you joined, we haven't seen you in the community or on the community calls. To keep the group focused on members who want to take part and find value, we've closed your access.</p>
                  <p style="margin:0 0 16px 0;">This isn't a judgment on you or your business. It just means it wasn't the right timing.</p>
                </td>
              </tr>

              <!-- What changes -->
              <tr>
                <td style="padding:8px 36px 0 36px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1A1622" style="background-color:#1A1622;border:1px solid #2a2433;border-radius:12px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <div style="font-family:'DM Mono','Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FF2D78;padding-bottom:10px;">What this means</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#D8D4E8;">
                          <tr><td width="22" valign="top" style="color:#00F5E4;">&#8226;</td><td style="padding-bottom:8px;">Your access to the Member Hub at theradpad.org has been turned off.</td></tr>
                          <tr><td width="22" valign="top" style="color:#00F5E4;">&#8226;</td><td style="padding-bottom:8px;">You've been removed from The Rad Pad Slack workspace.</td></tr>
                          <tr><td width="22" valign="top" style="color:#00F5E4;">&#8226;</td><td>Your Directory profile and map pin have been taken down.</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 36px 0 36px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#D8D4E8;">
                  <p style="margin:0 0 16px 0;">Thank you for the time and energy you put into this community. We appreciate it, and we wish you the best with your business.</p>
                </td>
              </tr>

              <!-- Coming back -->
              <tr>
                <td style="padding:0 36px 8px 36px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1A1622" style="background-color:#1A1622;border:1px solid rgba(0,245,228,0.35);border-radius:12px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <div style="font-family:'DM Mono','Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00F5E4;padding-bottom:10px;">If you'd like to come back</div>
                        <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#D8D4E8;">If there's ever interest in re-entering the group, please reach out to your referring member. We'll put you back through the interview or onboarding process.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Sign-off -->
              <tr>
                <td style="padding:20px 36px 36px 36px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#D8D4E8;">
                  <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;color:#F8F5FF;">The Rad Pad</div>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:22px 12px 8px 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9a94ad;">
            You're receiving this because you were a member of The Rad Pad.<br>
            theradpad.org
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`

const TEXT = `Hi {{first_name}},

We're writing to let you know that your membership in The Rad Pad has ended, effective {{end_date}}.

The Rad Pad works best when everyone shows up and gets something out of it. Since you joined, we haven't seen you in the community or on the community calls. To keep the group focused on members who want to take part and find value, we've closed your access.

This isn't a judgment on you or your business. It just means it wasn't the right timing.

What this means:
- Your access to the Member Hub at theradpad.org has been turned off.
- You've been removed from The Rad Pad Slack workspace.
- Your Directory profile and map pin have been taken down.

Thank you for the time and energy you put into this community. We appreciate it, and we wish you the best with your business.

If you'd like to come back:
If there's ever interest in re-entering the group, please reach out to your referring member. We'll put you back through the interview or onboarding process.

The Rad Pad
`

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function membershipEndedEmail({ firstName, endDate }) {
  const name = String(firstName || '').trim() || 'there'
  const date = String(endDate || '').trim() || 'today'
  return {
    subject: MEMBERSHIP_ENDED_SUBJECT,
    html: HTML.split('{{first_name}}').join(esc(name)).split('{{end_date}}').join(esc(date)),
    text: TEXT.split('{{first_name}}').join(name).split('{{end_date}}').join(date),
  }
}
