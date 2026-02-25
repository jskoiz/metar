import { Header } from './components/Header'
import { CopyButton } from './components/CopyButton'

const CODE_SNIPPET = `import { MetarClient } from '@metar/client'

const client = new MetarClient({
  wallet: 'YOUR_WALLET_ADDRESS',
})

// Search recent tweets – auto-pays $0.05 USDC
const tweets = await client.get('/x/2/tweets/search/recent', {
  query: 'bitcoin lang:en',
  max_results: 10,
})`

const ENDPOINTS = [
  // Tier 1 – Read
  { tier: 'Read', price: '$0.05', method: 'GET', path: '/x/2/tweets/search/recent',     desc: 'Search recent tweets' },
  { tier: 'Read', price: '$0.05', method: 'GET', path: '/x/2/tweets/:id',                desc: 'Get a single tweet' },
  { tier: 'Read', price: '$0.05', method: 'GET', path: '/x/2/users/:id/tweets',          desc: 'User timeline' },
  { tier: 'Read', price: '$0.05', method: 'GET', path: '/x/2/lists/:id/tweets',          desc: 'List tweets' },
  // Tier 2 – User
  { tier: 'User', price: '$0.10', method: 'GET', path: '/x/2/users/:id',                 desc: 'Get a user by ID' },
  { tier: 'User', price: '$0.10', method: 'GET', path: '/x/2/users/by/username/:user',   desc: 'Get user by handle' },
  { tier: 'User', price: '$0.10', method: 'GET', path: '/x/2/users/:id/followers',       desc: 'Get followers' },
  { tier: 'User', price: '$0.10', method: 'POST', path: '/x/2/tweets',                   desc: 'Post a tweet' },
  // Tier 3 – Action
  { tier: 'Action', price: '$0.15', method: 'POST', path: '/x/2/users/:id/following',    desc: 'Follow a user' },
  { tier: 'Action', price: '$0.15', method: 'POST', path: '/x/2/users/:id/likes',        desc: 'Like a tweet' },
  { tier: 'Action', price: '$0.15', method: 'POST', path: '/x/2/users/:id/retweets',     desc: 'Retweet' },
  { tier: 'Action', price: '$0.15', method: 'POST', path: '/x/2/dm_conversations/with/:id/messages', desc: 'Send a DM' },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Pay Per Request',
    desc: 'No subscriptions. No monthly bills. Pay only for what you use — fractions of a cent per call.',
  },
  {
    icon: '🔑',
    title: 'No API Keys',
    desc: 'Zero signup friction. Your wallet is your identity. Start querying in seconds.',
  },
  {
    icon: '🌐',
    title: 'Multi-Chain',
    desc: 'Pay with USDC on Solana, Base, or Ethereum. Low fees, instant settlement.',
  },
  {
    icon: '🤖',
    title: 'Agent Native',
    desc: 'Built on the x402 protocol — designed for autonomous AI agents and automated pipelines.',
  },
]

const TIERS = [
  {
    name: 'Read',
    price: '$0.05',
    desc: 'Public data, tweets, lists, spaces',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    examples: ['/x/2/tweets/search/recent', '/x/2/tweets/:id', '/x/2/lists/:id/tweets'],
  },
  {
    name: 'User',
    price: '$0.10',
    desc: 'User data, DMs, social graph, write',
    color: '#0066FF',
    bg: 'rgba(0,102,255,0.08)',
    border: 'rgba(0,102,255,0.3)',
    examples: ['/x/2/users/:id', '/x/2/users/:id/followers', '/x/2/tweets (POST)'],
    featured: true,
  },
  {
    name: 'Action',
    price: '$0.15',
    desc: 'Follow, like, retweet, DM conversations',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    examples: ['/x/2/users/:id/following', '/x/2/users/:id/likes', '/x/2/dm_conversations'],
  },
]

const TIER_COLORS: Record<string, string> = {
  Read: '#22c55e',
  User: '#0066FF',
  Action: '#f59e0b',
}

export default function App() {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#f0f0f0' }}>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          paddingTop: '140px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: '100px',
              border: '1px solid rgba(0,102,255,0.3)',
              color: '#6699ff',
              background: 'rgba(0,102,255,0.07)',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0066FF', display: 'inline-block' }} />
            x402 Protocol · USDC Payments
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 'clamp(42px, 7vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-2px',
            lineHeight: 1.05,
            marginBottom: '24px',
            color: '#f0f0f0',
          }}
        >
          X Data API.{' '}
          <span style={{ color: '#0066FF' }}>Pay per request.</span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '18px',
            color: '#888',
            maxWidth: '560px',
            margin: '0 auto 48px',
            lineHeight: 1.65,
          }}
        >
          Access the full Twitter/X API v2 — no API keys, no subscriptions.
          Each request costs a fraction of a cent, paid instantly via the{' '}
          <span style={{ color: '#0066FF' }}>x402 protocol</span>.
        </p>

        {/* Code snippet */}
        <div
          id="install"
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '12px',
            padding: '28px 32px',
            maxWidth: '680px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #1a1a1a',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
                <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#555', marginLeft: '8px', fontFamily: 'monospace' }}>
              metar-demo.ts
            </span>
            <div style={{ marginLeft: 'auto' }}>
              <CopyButton text={CODE_SNIPPET} />
            </div>
          </div>

          <pre
            style={{
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              fontSize: '13px',
              lineHeight: '1.75',
              color: '#d4d4d4',
              overflowX: 'auto',
              margin: 0,
            }}
          >
            {CODE_SNIPPET
              .split('\n')
              .map((line, i) => {
                // Very simple syntax highlight
                const highlighted = line
                  .replace(/(import|from|const|await)/g, '<span style="color:#c792ea">$1</span>')
                  .replace(/('[^']*')/g, '<span style="color:#c3e88d">$1</span>')
                  .replace(/(\/\/[^\n]*)/g, '<span style="color:#546e7a">$1</span>')
                  .replace(/(\$0\.\d+)/g, '<span style="color:#f78c6c">$1</span>')
                return (
                  <span key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />
                )
              })
              .reduce<React.ReactNode[]>((acc, el, i, arr) => {
                acc.push(el)
                if (i < arr.length - 1) acc.push('\n')
                return acc
              }, [])}
          </pre>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px', flexWrap: 'wrap' }}>
          <a
            href="#pricing"
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              background: '#0066FF',
              color: '#fff',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            View Pricing →
          </a>
          <a
            href="https://github.com/metar-dev/metar"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: '1px solid #2a2a2a',
              color: '#888',
              fontWeight: 500,
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
        </div>
      </section>

      {/* ── Why Metar ─────────────────────────────────────────────────────── */}
      <section
        id="why"
        style={{
          padding: '100px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-1px',
            marginBottom: '12px',
          }}
        >
          Why Metar
        </h2>
        <p style={{ textAlign: 'center', color: '#555', marginBottom: '64px', fontSize: '16px' }}>
          The programmable X API, reinvented for autonomous systems.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '12px',
                padding: '28px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px', color: '#f0f0f0' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          padding: '100px 24px',
          background: '#070707',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-1px',
              marginBottom: '12px',
            }}
          >
            Simple, Usage-Based Pricing
          </h2>
          <p style={{ textAlign: 'center', color: '#555', marginBottom: '64px', fontSize: '16px' }}>
            Three tiers based on operation type. Payments settle on-chain in USDC.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {TIERS.map((t) => (
              <div
                key={t.name}
                style={{
                  background: t.bg,
                  border: `1px solid ${t.border}`,
                  borderRadius: '14px',
                  padding: '32px',
                  position: 'relative',
                  ...(t.featured
                    ? { boxShadow: `0 0 40px rgba(0,102,255,0.15)` }
                    : {}),
                }}
              >
                {t.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0066FF',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 14px',
                      borderRadius: '100px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    MOST USED
                  </div>
                )}
                <div style={{ color: t.color, fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '8px' }}>
                  TIER — {t.name.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 700,
                    letterSpacing: '-2px',
                    color: '#f0f0f0',
                    lineHeight: 1,
                    marginBottom: '8px',
                  }}
                >
                  {t.price}
                  <span style={{ fontSize: '16px', fontWeight: 400, color: '#555', letterSpacing: 0 }}>
                    {' '}/ request
                  </span>
                </div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '28px' }}>{t.desc}</p>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px', fontWeight: 500 }}>
                    EXAMPLE ENDPOINTS
                  </div>
                  {t.examples.map((ex) => (
                    <div
                      key={ex}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#888',
                        padding: '6px 0',
                        borderBottom: '1px solid #111',
                      }}
                    >
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Endpoints ─────────────────────────────────────────────────────── */}
      <section
        id="endpoints"
        style={{
          padding: '100px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-1px',
            marginBottom: '12px',
          }}
        >
          All Endpoints
        </h2>
        <p style={{ color: '#555', marginBottom: '48px', fontSize: '16px' }}>
          Every Twitter/X API v2 resource, price-gated by tier.
        </p>

        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 70px 200px 1fr',
              gap: '16px',
              padding: '12px 24px',
              borderBottom: '1px solid #1a1a1a',
              fontSize: '11px',
              fontWeight: 600,
              color: '#444',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>Tier</span>
            <span>Method</span>
            <span>Path</span>
            <span>Description</span>
          </div>

          {ENDPOINTS.map((ep, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 70px 200px 1fr',
                gap: '16px',
                padding: '14px 24px',
                borderBottom: '1px solid #0f0f0f',
                alignItems: 'center',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  color: TIER_COLORS[ep.tier],
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                {ep.tier} <span style={{ color: '#333', fontWeight: 400 }}>{ep.price}</span>
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: '#151515',
                  color: '#888',
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {ep.method}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#aaa', wordBreak: 'break-all' }}>
                {ep.path}
              </span>
              <span style={{ color: '#555', fontSize: '13px' }}>{ep.desc}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#333', marginTop: '24px', fontSize: '13px' }}>
          + 50 more endpoints across all tiers
        </p>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid #111',
          padding: '40px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1100px',
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fff', transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>metar</span>
          <span style={{ color: '#333', fontSize: '13px' }}>· X Data API · x402 Protocol</span>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ color: '#333', fontSize: '13px' }}>© 2025 Metar</span>
          <a
            href="https://github.com/metar-dev/metar"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#555', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
