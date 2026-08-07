import Head from 'next/head'
import { useRouter } from 'next/router'

// Standalone landing page for newly-accepted members, linked from the
// acceptance email. Sits behind the same Supabase auth gate as the rest of
// the Hub (see pages/_app.js) - this route is intentionally NOT listed in
// PUBLIC_ROUTES or UNGATED_ROUTES there, so it inherits the normal login
// check automatically. No Layout/nav/footer on purpose: this page has
// exactly one job (play the video, send them to Slack, send them to the
// Hub) and nothing else to click.

// Casey's onboarding video - youtube-nocookie.com is YouTube's
// privacy-enhanced embed domain, same video, no third-party cookies until
// the visitor actually presses play.
const VIDEO_EMBED_URL = 'https://www.youtube-nocookie.com/embed/8BSIfJjo4RQ'

// Slack invite link Casey provided.
const SLACK_INVITE_URL = 'https://join.slack.com/t/theradpad/shared_invite/zt-44lnbp95g-oVG_szvp6B05m66xdyWx8A'

export default function Welcome() {
  const router = useRouter()

  // Anchor tags have gotten stripped in this codebase before when pasted
  // via chat, so external links use span+onClick+window.open per existing
  // convention. The Hub link is internal, so it uses router.push (still a
  // span, never an <a>) for a normal client-side Next.js navigation instead
  // of a full page reload.
  function goToSlack() {
    window.open(SLACK_INVITE_URL, '_blank')
  }

  function goToHub() {
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Welcome to The Rad Pad</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* ── HERO / HEADER ── */}
        {/* Image is now just moody backdrop, not the focal point - darkened
            across its whole height (not only a bottom fade) so the headline
            reads as a proper overlaid page header, with an extra radial
            shadow behind the text itself for legibility over the artwork. */}
        <div style={{ position: 'relative', width: '100%', height: 'min(62vw, 520px)', minHeight: 320, overflow: 'hidden' }}>
          <img
            src="/welcome-hero.jpg"
            alt="The Rad Pad"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(13,10,14,0.55) 0%, rgba(13,10,14,0.4) 40%, rgba(13,10,14,0.8) 78%, var(--bg) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 65% 55% at 50% 82%, rgba(13,10,14,0.9), transparent 70%)',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ maxWidth: 640, padding: '0 24px 36px', textAlign: 'center' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(38px, 7vw, 60px)',
                color: 'var(--pink)',
                textShadow: '0 0 44px rgba(255,45,120,0.8)',
                lineHeight: 1.1,
                marginBottom: 14,
              }}>
                Welcome to the club.
              </h1>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--muted)',
                lineHeight: 1.65,
                maxWidth: 440,
                margin: '0 auto',
              }}>
                You're officially a Rad Pad member. Here's everything you need to get plugged in.
              </p>
            </div>
          </div>
        </div>

        {/* ── VIDEO ── */}
        {/* About 2in (192px, CSS reference pixel = 1/96in) of side margin on
            desktop. clamp() scales that down on narrow viewports instead of
            applying a flat 192px, which would eat the whole width on mobile -
            13.3vw lands on ~192px right around a 1440px laptop screen and
            holds there for anything wider. */}
        <div style={{ margin: '40px clamp(24px, 13.3vw, 192px) 36px' }}>
          <div className="welcome-video-card">
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
              <iframe
                src={VIDEO_EMBED_URL}
                title="Rad Pad Onboarding"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: '0 24px 100px', position: 'relative' }}>
          {/* ── NEXT STEPS ── */}
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-head)',
              fontSize: 13,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 16,
            }}>
              Next steps
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span onClick={goToSlack} className="welcome-btn welcome-btn-slack">
                Join the Slack →
              </span>

              <span onClick={goToHub} className="welcome-btn welcome-btn-hub">
                Go to the Hub →
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
