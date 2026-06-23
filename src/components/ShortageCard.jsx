// Live national FDA shortage status for a generic. This is the one piece of
// genuinely public, programmable supply data — so we surface it prominently:
// it tells you whether to even bother asking for brand vs generic.

import { useEffect, useState } from 'react'
import { fetchShortage } from '../api/client.js'
import { formatFdaDate } from '../lib/format.js'

const VERDICT = {
  shortage: { tone: 'bad', label: 'Active shortage on file', icon: '⚠️' },
  resolved: { tone: 'good', label: 'Listed as resolved', icon: '✓' },
  none: { tone: 'muted', label: 'No shortage on file', icon: '—' },
}

// Color a presentation by what the maker actually reports for it. A row can be on
// the shortage list ("Current") yet still be "Available" from that manufacturer —
// so the availability text, not the list-status, drives the color.
function availTone(it) {
  const a = (it.availability || '').toLowerCase()
  if (a.includes('not available') || a.includes('discontinu') || a.includes('no ')) return 'bad'
  if (a.includes('limited') || a.includes('demand') || a.includes('delay')) return 'warn'
  if (a.includes('available')) return 'good'
  return (it.status || '').toLowerCase() === 'current' ? 'warn' : 'good'
}

export default function ShortageCard({ generic }) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    fetchShortage(generic)
      .then((d) => alive && setState({ loading: false, data: d }))
      .catch((e) => alive && setState({ loading: false, error: e.message }))
    return () => {
      alive = false
    }
  }, [generic])

  const { loading, data, error } = state
  const v = data ? VERDICT[data.overall] || VERDICT.none : VERDICT.none

  return (
    <div className="card">
      <div className="card-row">
        <div className="card-title">FDA shortage status</div>
        <span className="meta">{generic}</span>
      </div>

      {loading && <p className="dim section-gap">Checking openFDA…</p>}
      {error && <p className="dim section-gap">Couldn’t reach the FDA feed right now.</p>}

      {data && (
        <>
          <div className="flex section-gap">
            <span className={`pill tone-${v.tone}`}>
              {v.icon} {v.label}
            </span>
            {data.updatedAt && <span className="meta">FDA updated {formatFdaDate(data.updatedAt)}</span>}
          </div>

          {data.items.length > 0 && (
            <div className="section-gap stack">
              {data.items.slice(0, 6).map((it, i) => (
                <div key={i} className="spread" style={{ fontSize: 13 }}>
                  <span className="dim" style={{ flex: 1 }}>
                    {it.company || 'Unknown maker'}
                    {it.presentation ? ` · ${it.presentation.replace(/\s*\(NDC.*\)/, '')}` : ''}
                  </span>
                  <span className={`pill tone-${availTone(it)}`}>
                    {it.availability || it.status}
                  </span>
                </div>
              ))}
              {data.items.length > 6 && (
                <span className="meta">+ {data.items.length - 6} more presentations</span>
              )}
            </div>
          )}

          <p className="meta section-gap">
            National, manufacturer-level data — it does not reflect what’s on the shelf at any
            specific pharmacy. Source: openFDA drug shortages.
          </p>
        </>
      )}
    </div>
  )
}
