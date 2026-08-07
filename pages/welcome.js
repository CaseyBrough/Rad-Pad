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

        {/* ── CONTENT ── */}
        <div style={{ padding: '40px 24px 100px', position: 'relative' }}>
          {/* ── VIDEO ── */}
          {/* Deliberately much wider than the text column below - roughly
              2.5x the old 640px reading width, capped so it doesn't get silly
              on ultra-wide monitors, nearly edge-to-edge on typical desktops. */}
          <div style={{ maxWidth: 1800, width: '97%', margin: '0 auto 36px' }}>
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 12,
            }}>
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
              <span
                onClick={goToSlack}
                style={{
                  cursor: 'pointer',
                  display: 'block',
                  background: 'var(--pink)',
                  color: '#fff',
                  fontFamily: 'var(--font-head)',
                  fontSize: 18,
                  letterSpacing: '0.04em',
                  borderRadius: 12,
                  padding: '18px 24px',
                  boxShadow: '0 0 30px var(--pink-glow-soft)',
                }}
              >
                Join the Slack →
              </span>

              <span
                onClick={goToHub}
                style={{
                  cursor: 'pointer',
                  display: 'block',
                  background: 'var(--card)',
                  border: '1px solid var(--border-hover-cyan)',
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-head)',
                  fontSize: 18,
                  letterSpacing: '0.04em',
                  borderRadius: 12,
                  padding: '18px 24px',
                }}
              >
                Go to the Hub →
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
