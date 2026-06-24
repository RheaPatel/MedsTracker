import { useEffect, useMemo, useState } from 'react'
import { fetchReports, fetchShortage } from '../api/client.js'
import { relativeTime, formatFdaDate } from '../lib/format.js'
import { getMyLocation, distanceMiles, formatDistance } from '../lib/geo.js'
import StatusPill from '../components/StatusPill.jsx'
import SightingsMap from '../components/SightingsMap.jsx'

const DOT = {
  in_stock: 'var(--dot-in)',
  limited: 'var(--dot-expect)',
  expecting: 'var(--dot-expect)',
  out: 'var(--dot-out)',
  wouldnt_say: 'var(--dot-muted)',
}

const FDA = {
  shortage: { color: 'var(--dot-expect)', text: (d) => `FDA: national shortage active${d ? ` — updated ${formatFdaDate(d)}` : ''}` },
  resolved: { color: 'var(--dot-in)', text: (d) => `FDA: shortage resolved${d ? ` — updated ${formatFdaDate(d)}` : ''}` },
  none: { color: 'var(--dot-muted)', text: () => 'FDA: no shortage on file' },
}

function locShort(r) {
  return [r.city, r.state].filter(Boolean).join(', ')
}

function Sighting({ r, dist }) {
  return (
    <>
      <div className="sighting">
        <span className="s-dot" style={{ background: DOT[r.status] || 'var(--dot-muted)' }} />
        <div>
          <div className="s-name">{r.pharmacyName}</div>
          <div className="s-meta">
            {[locShort(r), formatDistance(dist), r.reporterHandle || 'anonymous'].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="s-right">
          <StatusPill status={r.status} />
          <div className="s-time">{relativeTime(r.createdAt)}</div>
        </div>
      </div>
      {(r.notes || r.shipmentInfo) && (
        <div className="s-note">“{r.shipmentInfo || r.notes}”{r.reporterHandle ? ` — ${r.reporterHandle}` : ''}</div>
      )}
    </>
  )
}

export default function FindView({ med, onReport }) {
  const [mode, setMode] = useState('list')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fda, setFda] = useState(null)
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locErr, setLocErr] = useState(null)
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchReports({ generic: med.genericName, sinceDays: 45 })
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [med.genericName])

  useEffect(() => {
    fetchShortage(med.genericName)
      .then(setFda)
      .catch(() => setFda(null))
  }, [med.genericName])

  function requestLocation() {
    setLocating(true)
    setLocErr(null)
    getMyLocation()
      .then((c) => {
        setCoords(c)
        setSort('nearest')
      })
      .catch((e) => setLocErr(e.message))
      .finally(() => setLocating(false))
  }

  // attach distance + apply sort
  const shown = useMemo(() => {
    const withDist = reports.map((r) => ({
      r,
      dist: coords && r.lat != null ? distanceMiles(coords, { lat: r.lat, lng: r.lng }) : null,
    }))
    if (coords && sort === 'nearest') {
      withDist.sort((a, b) => {
        if (a.dist == null) return 1
        if (b.dist == null) return -1
        return a.dist - b.dist
      })
    }
    return withDist
  }, [reports, coords, sort])

  const fdaMeta = fda ? FDA[fda.overall] || FDA.none : null
  const headline = `${med.medName}${med.dose ? ` ${med.dose}` : ''}`
  const sub = [med.genericName, med.form === 'brand' ? 'brand' : 'generic'].filter(Boolean).join(' · ')

  return (
    <div>
      <div className="hero">
        <div className="hero-top">
          <span className="wordmark"><span className="dot" />FillFinder</span>
          <a className="hero-link" href="#" onClick={(e) => e.preventDefault()}>Sign in</a>
        </div>
        <h1 className="hero-headline">{headline}</h1>
        <div className="hero-sub">{sub}</div>
        <div className="hero-fda">
          <span className="fda-dot" style={{ background: fdaMeta ? fdaMeta.color : 'var(--dot-muted)' }} />
          {fda ? fdaMeta.text(fda.updatedAt) : 'Checking FDA shortage status…'}
        </div>
        <div className="segmented">
          <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>List</button>
          <button className={mode === 'map' ? 'on' : ''} onClick={() => setMode('map')}>Map</button>
        </div>
      </div>

      <div className="pad after-hero">
        {error && <div className="banner banner-warn">Couldn’t load sightings: {error}</div>}
        {locErr && <div className="banner banner-warn section-gap">{locErr}</div>}

        {mode === 'list' ? (
          <>
            <div className="list-head">
              <span className="lbl">Recent sightings</span>
              {coords ? (
                <button
                  className="sort link-sort"
                  onClick={() => setSort((s) => (s === 'nearest' ? 'newest' : 'nearest'))}
                >
                  {sort === 'nearest' ? 'Nearest ↓' : 'Newest ↓'}
                </button>
              ) : (
                <button className="sort link-sort" onClick={requestLocation} disabled={locating}>
                  {locating ? 'Locating…' : '📍 Near me'}
                </button>
              )}
            </div>

            {loading && <p className="dim section-gap">Loading…</p>}

            {!loading && reports.length === 0 && !error && (
              <div className="empty">
                <div className="empty-emoji">🗺️</div>
                <div className="empty-title">No sightings yet</div>
                <p>
                  This map is only as good as what people share. If you call around today, post one
                  sighting — it helps the next person, and future-you.
                </p>
                <button className="btn btn-primary section-gap" onClick={onReport}>
                  Add the first sighting
                </button>
              </div>
            )}

            {shown.map(({ r, dist }) => (
              <Sighting key={r.id} r={r} dist={dist} />
            ))}

            {reports.length > 0 && (
              <button className="btn btn-primary btn-block section-gap" onClick={onReport}>
                ⊕ Report what you found
              </button>
            )}
          </>
        ) : (
          <>
            <SightingsMap sightings={reports} center={coords} />
            <div className="map-caption">
              {reports.filter((r) => r.lat != null).length} of {reports.length} sightings placed.
              Tap a pin for details.
            </div>
            {!coords && (
              <button className="btn btn-block section-gap" onClick={requestLocation} disabled={locating}>
                {locating ? 'Locating…' : '📍 Center on my location'}
              </button>
            )}
            <button className="btn btn-primary btn-block section-gap" onClick={onReport}>
              ⊕ Report what you found
            </button>
          </>
        )}
      </div>
    </div>
  )
}
