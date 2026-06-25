import { useEffect, useState } from 'react'
import { getCalls, addCall, deleteCall, getMeds } from '../db/localStore.js'
import { STATUSES, US_STATES, DEFAULT_MED, statusMeta } from '../lib/meds.js'
import { formatDate, todayISODate } from '../lib/format.js'
import { formatDistance } from '../lib/geo.js'
import { fetchNearby } from '../api/client.js'
import StatusPill from '../components/StatusPill.jsx'

// Compact one-tap outcomes for the to-call list (full set is in the manual form).
const QUICK = STATUSES.filter((s) => s.key !== 'limited')

function trackedMed() {
  const t = getMeds()[0]
  return t
    ? { medName: t.medName, genericName: t.genericName, form: t.form, dose: t.dose || '' }
    : { medName: DEFAULT_MED.brand, genericName: DEFAULT_MED.generic, form: 'generic', dose: '' }
}

function emptyEntry(med) {
  return {
    date: todayISODate(),
    pharmacyName: '',
    city: '',
    state: '',
    medName: med.medName,
    genericName: med.genericName,
    form: med.form,
    dose: med.dose,
    status: 'out',
    notes: '',
  }
}

const pkey = (p) => `${p.name}|${p.lat.toFixed(4)},${p.lng.toFixed(4)}`

export default function CallLogView({ coords, onShare, onToast }) {
  const med = trackedMed()
  const [calls, setCalls] = useState(() => getCalls())
  const [entry, setEntry] = useState(null)
  const [scriptOpen, setScriptOpen] = useState(true)

  const [nearby, setNearby] = useState([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [nearbyErr, setNearbyErr] = useState(null)
  const [logged, setLogged] = useState({})

  const refresh = () => setCalls(getCalls())

  function loadNearby() {
    if (!coords) return
    setLoadingNearby(true)
    setNearbyErr(null)
    fetchNearby({ lat: coords.lat, lng: coords.lng })
      .then((ps) => setNearby(ps))
      .catch((e) => setNearbyErr(e.message))
      .finally(() => setLoadingNearby(false))
  }

  // Auto-load the to-call list as soon as we know where the user is.
  useEffect(() => {
    loadNearby()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng])

  function quickLog(p, status) {
    addCall({
      date: todayISODate(),
      pharmacyName: p.name,
      pharmacyAddress: p.address,
      city: p.city,
      state: p.state,
      medName: med.medName,
      genericName: med.genericName,
      form: med.form,
      dose: med.dose,
      status,
      notes: '',
      lat: p.lat,
      lng: p.lng,
    })
    setLogged((prev) => ({ ...prev, [pkey(p)]: status }))
    refresh()
    onToast?.(`Logged: ${statusMeta(status).label} — ${p.name}`)
  }

  function shareNearby(p, status) {
    onShare?.({
      medName: med.medName,
      genericName: med.genericName,
      form: med.form,
      dose: med.dose,
      pharmacyName: p.name,
      pharmacyAddress: p.address,
      city: p.city,
      state: p.state,
      status,
      lat: p.lat,
      lng: p.lng,
    })
  }

  function saveManual() {
    if (!entry.pharmacyName?.trim()) return
    addCall(entry)
    setEntry(null)
    refresh()
  }
  function remove(id) {
    deleteCall(id)
    refresh()
  }
  function shareHistory(c) {
    onShare?.({
      medName: c.medName,
      genericName: c.genericName,
      form: c.form,
      dose: c.dose,
      pharmacyName: c.pharmacyName,
      city: c.city,
      state: c.state,
      status: c.status,
      notes: c.notes,
      lat: c.lat,
      lng: c.lng,
    })
    onToast?.('Prefilled a sighting — just confirm & share')
  }
  const set = (patch) => setEntry((e) => ({ ...e, ...patch }))

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">Your calls</div>
        <h1 className="page-title">Call assistant</h1>
        <p className="page-intro">
          Calling around is the only way to know what’s on the shelf. This lines up the pharmacies
          near you, hands you a script, and logs each result in one tap — so you never re-dial the
          same “out” twice.
        </p>
      </div>

      <div className="pad">
        {/* call script */}
        <div className="card">
          <button className="script-toggle" onClick={() => setScriptOpen((v) => !v)}>
            <span className="card-title">What to say</span>
            <span className="meta">{scriptOpen ? 'Hide' : 'Show'}</span>
          </button>
          {scriptOpen && (
            <div className="script-body">
              <p>
                “Hi — I have a prescription for <strong>{med.medName}{med.dose ? ` ${med.dose}` : ''}</strong>
                {med.form === 'generic' ? ' (generic lisdexamfetamine)' : ''}. Do you have it in stock
                right now?”
              </p>
              <p className="dim">If no → “Do you know when your next shipment comes in, or can you order it for me?”</p>
              <p className="dim">If yes → “Can you set it aside, and how long will you hold it?”</p>
            </div>
          )}
        </div>

        {/* to-call list */}
        <div className="list-head section-gap">
          <span className="lbl">Pharmacies near you</span>
          {coords && (
            <button className="link-sort" onClick={loadNearby} disabled={loadingNearby}>
              {loadingNearby ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {nearbyErr && <div className="banner banner-warn">{nearbyErr}</div>}

        {!coords && (
          <p className="dim">
            Turn on location to see the pharmacies around you. Otherwise, log a call manually below.
          </p>
        )}

        {loadingNearby && <p className="dim">Finding pharmacies near you…</p>}

        {coords && !loadingNearby && nearby.length === 0 && !nearbyErr && (
          <p className="dim">No pharmacies found nearby. Try the manual log below.</p>
        )}

        {nearby.map((p) => {
          const k = pkey(p)
          const done = logged[k]
          return (
            <div key={k} className="call-card">
              <div className="call-top">
                <div className="call-info">
                  <div className="call-name">{p.name}</div>
                  <div className="call-sub">
                    {[formatDistance(p.distance), p.address, [p.city, p.state].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {p.hours && <div className="call-hours">{p.hours}</div>}
                </div>
                {p.phone && (
                  <a className="btn btn-sm call-tel" href={`tel:${p.phone}`}>
                    Call
                  </a>
                )}
              </div>
              {done ? (
                <div className="call-logged">
                  <StatusPill status={done} />
                  {(done === 'in_stock' || done === 'expecting' || done === 'limited') && (
                    <button className="link-btn" onClick={() => shareNearby(p, done)}>
                      Share to community →
                    </button>
                  )}
                </div>
              ) : (
                <div className="call-acts">
                  {QUICK.map((s) => (
                    <button key={s.key} className="call-act" onClick={() => quickLog(p, s.key)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* history */}
        <div className="list-head section-gap">
          <span className="lbl">Your call log</span>
        </div>

        {calls.length === 0 && !entry && (
          <p className="dim">Nothing logged yet — log a call above, or add one manually.</p>
        )}

        {calls.map((c) => (
          <div key={c.id} className="card section-gap">
            <div className="spread">
              <div className="card-title" style={{ fontSize: 17 }}>{c.pharmacyName}</div>
              <StatusPill status={c.status} />
            </div>
            <div className="meta" style={{ marginTop: 3 }}>
              {[c.medName, c.dose, c.form].filter(Boolean).join(' · ')}
            </div>
            <div className="meta">
              {[c.city, c.state].filter(Boolean).join(', ')}
              {c.city || c.state ? ' · ' : ''}
              {formatDate(c.date)}
            </div>
            {c.notes && <div className="s-note" style={{ paddingLeft: 0 }}>“{c.notes}”</div>}
            <div className="flex section-gap">
              <button className="btn btn-sm btn-primary" onClick={() => shareHistory(c)}>
                Share to community
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {entry ? (
          <div className="card section-gap">
            <div className="card-title">Log a call manually</div>
            <div className="field">
              <label>Pharmacy</label>
              <input
                className="input"
                placeholder="e.g. Walgreens on Main"
                value={entry.pharmacyName}
                onChange={(e) => set({ pharmacyName: e.target.value })}
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label>City</label>
                <input className="input" value={entry.city} onChange={(e) => set({ city: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <select className="select" value={entry.state} onChange={(e) => set({ state: e.target.value })}>
                  <option value="">—</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>What did they say?</label>
              <div className="choice-grid">
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`choice ${entry.status === s.key ? 'selected' : ''}`}
                    onClick={() => set({ status: s.key })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea
                className="textarea"
                placeholder="“Call back Tuesday”, “had 50mg not 30”…"
                value={entry.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </div>
            <div className="flex section-gap">
              <button className="btn btn-primary" onClick={saveManual}>
                Save entry
              </button>
              <button className="btn" onClick={() => setEntry(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-block section-gap" onClick={() => setEntry(emptyEntry(med))}>
            ⊕ Log a call manually
          </button>
        )}
      </div>
    </div>
  )
}
