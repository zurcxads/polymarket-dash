'use client'

import { useEffect, useState, useRef } from 'react'

interface Market {
  question: string
  outcomePrices: string
  outcomes: string
  volume: string
  liquidity: string
  slug: string
}

interface Event {
  title: string
  slug: string
  image: string
  markets: Market[]
}

function parseProbs(market: Market): { outcomes: string[]; prices: number[] } {
  try {
    const outcomes = JSON.parse(market.outcomes) as string[]
    const prices = (JSON.parse(market.outcomePrices) as string[]).map(Number)
    return { outcomes, prices }
  } catch {
    return { outcomes: ['Yes', 'No'], prices: [0, 0] }
  }
}

function formatNum(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function probColor(p: number): string {
  if (p > 0.7) return '#00d084'
  if (p >= 0.4) return '#f59e0b'
  return '#ef4444'
}

function getEventVolume(e: Event): number {
  return e.markets?.reduce((s, m) => s + (parseFloat(m.volume) || 0), 0) ?? 0
}

function getEventLiquidity(e: Event): number {
  return e.markets?.reduce((s, m) => s + (parseFloat(m.liquidity) || 0), 0) ?? 0
}

function getTopProb(e: Event): number {
  if (!e.markets?.length) return 0
  const { prices } = parseProbs(e.markets[0])
  return Math.max(...prices)
}

// Animated counter
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    prevRef.current = value
    setDisplay(value)
  }, [value])

  return <span>{prefix}{display}{suffix}</span>
}

function Skeleton({ w = '100%', h = 20 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} />
}

function SkeletonCard() {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: 24 }}>
      <Skeleton h={16} w="70%" />
      <div style={{ marginTop: 16 }}><Skeleton h={32} w="40%" /></div>
      <div style={{ marginTop: 12 }}><Skeleton h={8} /></div>
      <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
        <Skeleton h={14} w="30%" />
        <Skeleton h={14} w="30%" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then((data: Event[]) => {
        setEvents(data.filter((e: Event) => e.markets?.length > 0))
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load data')
        setLoading(false)
      })
  }, [])

  const totalVolume = events.reduce((s, e) => s + getEventVolume(e), 0)
  const totalMarkets = events.reduce((s, e) => s + (e.markets?.length ?? 0), 0)
  const featured = events[0]

  // Top mover = highest "yes" probability
  const topMover = events.length > 1
    ? events.slice(1).reduce((best, e) => getTopProb(e) > getTopProb(best) ? e : best, events[1])
    : null

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ padding: '24px 32px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Polymarket
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#666', marginTop: 2 }}>Intelligence Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d084' }} />
          <span style={{ fontSize: 12, color: '#888' }} className="mono">LIVE</span>
        </div>
      </header>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #1a1a1a' }}>
        {[
          { label: 'TOTAL VOLUME', value: loading ? '...' : formatNum(totalVolume) },
          { label: 'ACTIVE MARKETS', value: loading ? '...' : totalMarkets.toString() },
          { label: 'TOP MOVER', value: loading || !topMover ? '...' : topMover.title.slice(0, 30) + (topMover.title.length > 30 ? '...' : '') },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '16px 32px', borderRight: i < 2 ? '1px solid #1a1a1a' : 'none' }}>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: '1px', marginBottom: 4 }}>{stat.label}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
              <AnimatedNumber value={stat.value} />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>{error}</div>
      )}

      {/* Featured Event */}
      {loading ? (
        <div style={{ padding: 32 }}>
          <Skeleton h={200} />
        </div>
      ) : featured && (
        <div style={{
          margin: '24px 32px',
          borderRadius: 16,
          border: '1px solid #1a1a1a',
          overflow: 'hidden',
          position: 'relative',
          background: '#111',
        }}>
          {featured.image && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${featured.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.15,
            }} />
          )}
          <div style={{ position: 'relative', padding: '40px 48px' }}>
            <div style={{ fontSize: 10, color: '#00d084', letterSpacing: '2px', marginBottom: 8 }}>FEATURED EVENT</div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, maxWidth: 700, lineHeight: 1.3 }}>
              {featured.title}
            </h2>
            {featured.markets[0] && (() => {
              const { outcomes, prices } = parseProbs(featured.markets[0])
              const topIdx = prices.indexOf(Math.max(...prices))
              const topPrice = prices[topIdx] ?? 0
              return (
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }} className="mono" >
                      <span style={{ color: probColor(topPrice) }}>{(topPrice * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{outcomes[topIdx]}</div>
                  </div>
                  <div style={{ flex: 1, maxWidth: 400 }}>
                    <div style={{ height: 6, borderRadius: 3, background: '#1a1a1a', overflow: 'hidden' }}>
                      <div className="prob-bar" style={{ height: '100%', width: `${topPrice * 100}%`, background: `linear-gradient(90deg, ${probColor(topPrice)}, ${probColor(topPrice)}88)`, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      {outcomes.map((o, i) => (
                        <span key={i} className="mono" style={{ fontSize: 13, color: '#888' }}>
                          {o}: <span style={{ color: probColor(prices[i]) }}>{(prices[i] * 100).toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: '1px' }}>VOLUME</div>
                      <div className="mono" style={{ fontSize: 16, color: '#ccc' }}>{formatNum(getEventVolume(featured))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: '1px' }}>LIQUIDITY</div>
                      <div className="mono" style={{ fontSize: 16, color: '#ccc' }}>{formatNum(getEventLiquidity(featured))}</div>
                    </div>
                  </div>
                </div>
              )
            })()}
            <a
              href={`https://polymarket.com/event/${featured.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: '#00d084', textDecoration: 'none', borderBottom: '1px solid #00d08444' }}
            >
              View on Polymarket →
            </a>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 16,
        padding: '0 32px 48px',
      }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : events.slice(1).map((event, i) => {
              const m = event.markets[0]
              if (!m) return null
              const { outcomes, prices } = parseProbs(m)
              const topIdx = prices.indexOf(Math.max(...prices))
              const topPrice = prices[topIdx] ?? 0
              const vol = getEventVolume(event)
              const liq = getEventLiquidity(event)

              return (
                <div
                  key={i}
                  className="event-card animate-in"
                  style={{
                    background: '#111',
                    border: '1px solid #1a1a1a',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {event.image && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${event.image})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      opacity: 0.08,
                    }} />
                  )}
                  <div style={{ position: 'relative', padding: '20px 24px' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 16, color: '#f5f5f5' }}>
                      {event.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                      <span className="mono" style={{ fontSize: 32, fontWeight: 800, color: probColor(topPrice) }}>
                        {(topPrice * 100).toFixed(0)}%
                      </span>
                      <span style={{ fontSize: 13, color: '#888' }}>{outcomes[topIdx]}</span>
                    </div>

                    {/* Prob bar */}
                    <div style={{ height: 4, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden', marginBottom: 8 }}>
                      <div className="prob-bar" style={{
                        height: '100%',
                        width: `${topPrice * 100}%`,
                        background: `linear-gradient(90deg, ${probColor(topPrice)}, ${probColor(topPrice)}66)`,
                        borderRadius: 2,
                      }} />
                    </div>

                    {/* Outcomes */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      {outcomes.slice(0, 2).map((o, j) => (
                        <span key={j} className="mono" style={{ fontSize: 12, color: '#666' }}>
                          {o}: <span style={{ color: probColor(prices[j]) }}>{(prices[j] * 100).toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span className="mono" style={{ fontSize: 11, color: '#555' }}>VOL {formatNum(vol)}</span>
                        <span className="mono" style={{ fontSize: 11, color: '#555' }}>LIQ {formatNum(liq)}</span>
                      </div>
                      <a
                        href={`https://polymarket.com/event/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#00d084', textDecoration: 'none' }}
                      >
                        View →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
