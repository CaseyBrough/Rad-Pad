import { REFERRAL_URL, INVITE_MESSAGE, copyText } from '../lib/referral'

// The big "refer someone" call to action, used on Home and The Pad.
export default function ReferralCard() {
  const shown = REFERRAL_URL.replace(/^https?:\/\//, '')
  return (
    <section className="refer-card" aria-label="Refer someone">
      <div className="refer-copy">
        <div className="lib-eyebrow"><span className="dot" />Refer someone</div>
        <h2>Know someone who’d be a great fit?</h2>
        <p>The Rad Pad grows by referral. Send them this link. The form is for the person joining to fill out, not you.</p>
      </div>
      <div className="refer-actions">
        <div className="refer-url" title={REFERRAL_URL}>{shown}</div>
        <div className="refer-buttons">
          <button type="button" className="btn pink refer-big" onClick={() => copyText(REFERRAL_URL, 'Referral link copied')}>Copy link</button>
          <a className="btn refer-big" href={REFERRAL_URL} target="_blank" rel="noopener noreferrer">Open form ↗</a>
        </div>
        <button type="button" className="refer-msg" onClick={() => copyText(INVITE_MESSAGE, 'Invite message copied')}>Copy a ready-to-send message</button>
      </div>
    </section>
  )
}
