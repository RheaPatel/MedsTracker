import { useEffect, useState } from 'react'
import { fetchReports } from '../api/client.js'
import { MED_PRESETS, US_STATES, statusMeta, presetByGeneric } from '../lib/meds.js'
import { relativeTime } from '../lib/format.js'
import StatusPill from '../components/StatusPill.jsx'
import ShortageCard from '../components/ShortageCard.jsx'

const SOURCE_LABEL = { called: 'called', in_person: 'in person', app_filled: 'filled Rx here' }

function ReportCard({ r }) {
  return (
    <div className="card">
      <div className="card-row">
        <div className="card-title">{r.pharmacyName}</div>
        <StatusPill status={r.status} />
      </div>
      <div className="meta" style={{ marginTop: 4 }}>
        {r.medName}
        {r.dose ? ` · ${r.dose}` : ''}
        {r.form ? ` · ${r.form}` : ''}
      </div>
      <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>
        {[r.pharmacyAddress, [r.city, r.state].filter(Boolean).join(', '), r.zip]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {r.shipmentInfo && (
        <div className="banner banner-info" style={{ marginTop: 8 }}>
          🚚 {r.shipmentInfo}
        </div>
      )}
      {r.notes && <p className="dim" style={{ fontSize: 13, marginTop: 8 }}>{r.notes}</p>}
      <div className="meta" style={{ marginTop: 8 }}>
        {relativeTime(r.createdAt)} · {SOURCE_LABEL[r.source] || r.source}
        {r.reporterHandle ? ` · ${r.reporterHandle}` : ''}
      </div>
    </div>
  )
}

export default function FindView({ defaultGeneric, onReport }) {
  const [filters, setFilters] = useState({
    generic: defaultGeneric || '',
    form: '',
    state: '',
    zip: '',
    q: '',
  })
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function load(f = filters) {
    setLoading(true)
    setError(null)
    fetchReports({ ...f, sinceDays: 45 })
      .then((rs) => setReports(rs))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // initial + whenever the chosen med changes
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.generic, filters.form, filters.state, filters.zip])

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const preset = presetByGeneric(filters.generic)

  return (
    <div>
      <h1 className="view-title">Find it nearby</h1>
      <p className="view-intro">
        Recent community reports of pharmacy stock. Newest first — availability changes fast, so
        treat anything older than a few days as a lead, not a guarantee. Then call to confirm.
      </p>

      <div className="card section-gap">
        <div className="field" style={{ marginTop: 0 }}>
          <label>Medication</label>
          <select
            className="select"
            value={filters.generic}
            onChange={(e) => set({ generic: e.target.value })}
          >
            <option value="">All medications</option>
            {MED_PRESETS.map((m) => (
              <option key={m.id} value={m.generic}>
                {m.brand} ({m.generic})
              </option>
            ))}
          </select>
        </div>
        <div className="row-2">
          <div className="field">
            <label>State</label>
            <select className="select" value={filters.state} onChange={(e) => set({ state: e.target.value })}>
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ZIP</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="optional"
              value={filters.zip}
              onChange={(e) => set({ zip: e.target.value })}
            />
          </div>
        </div>
        <div className="choice-grid" style={{ marginTop: 12 }}>
          {[
            { key: '', label: 'Any form' },
            { key: 'brand', label: 'Brand' },
            { key: 'generic', label: 'Generic' },
          ].map((f) => (
            <button
              key={f.key}
              className={`choice ${filters.form === f.key ? 'selected' : ''}`}
              onClick={() => set({ form: f.key })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {preset && (
        <div className="section-gap">
          <ShortageCard generic={preset.generic} />
        </div>
      )}

      <div className="section-gap spread">
        <span className="meta">
          {loading ? 'Loading…' : `${reports.length} report${reports.length === 1 ? '' : 's'} · last 45 days`}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => onReport()}>
          ＋ Report what you found
        </button>
      </div>

      {error && (
        <div className="banner banner-warn section-gap">
          Couldn’t load reports: {error}. Is the API server running (<code>npm run server</code>)?
        </div>
      )}

      <div className="section-gap">
        {!loading && reports.length === 0 && !error && (
          <div className="empty">
            <div className="empty-emoji">🗺️</div>
            <p>
              No reports here yet. This map is only as good as what people share — if you call
              around today, dropping one report helps the next person (and future-you).
            </p>
            <button className="btn btn-primary section-gap" onClick={() => onReport()}>
              Add the first report
            </button>
          </div>
        )}
        {reports.map((r) => (
          <ReportCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  )
}
