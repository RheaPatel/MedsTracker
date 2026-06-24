import { useState } from 'react'
import { getCalls, addCall, deleteCall, getMeds } from '../db/localStore.js'
import { STATUSES, US_STATES, DEFAULT_MED } from '../lib/meds.js'
import { formatDate, todayISODate } from '../lib/format.js'
import StatusPill from '../components/StatusPill.jsx'

function defaultMed() {
  const tracked = getMeds()[0]
  return tracked
    ? { medName: tracked.medName, genericName: tracked.genericName, form: tracked.form, dose: tracked.dose || '' }
    : { medName: DEFAULT_MED.brand, genericName: DEFAULT_MED.generic, form: 'generic', dose: '' }
}

function emptyEntry() {
  const m = defaultMed()
  return {
    date: todayISODate(),
    pharmacyName: '',
    city: '',
    state: '',
    medName: m.medName,
    genericName: m.genericName,
    form: m.form,
    dose: m.dose,
    status: 'out',
    notes: '',
  }
}

export default function CallLogView({ onShare, onToast }) {
  const [calls, setCalls] = useState(() => getCalls())
  const [entry, setEntry] = useState(null)

  function refresh() {
    setCalls(getCalls())
  }
  function save() {
    if (!entry.pharmacyName?.trim()) return
    addCall(entry)
    setEntry(null)
    refresh()
  }
  function remove(id) {
    deleteCall(id)
    refresh()
  }
  function share(c) {
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
    })
    onToast?.('Prefilled a sighting — just confirm & share')
  }

  const set = (patch) => setEntry((e) => ({ ...e, ...patch }))

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">Your record</div>
        <h1 className="page-title">Call log</h1>
        <p className="page-intro">
          A private record of who you called and what they said — the most reliable stock map there
          is. Tap <em>Share</em> on any entry to add it to the community sightings.
        </p>
      </div>

      <div className="pad">
        {calls.length === 0 && !entry && (
          <div className="empty">
            <div className="empty-emoji">📞</div>
            <div className="empty-title">No calls logged</div>
            <p>Log each pharmacy you call so you never re-dial the same “out” twice — and can share the wins.</p>
          </div>
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
              {(c.city || c.state) ? ' · ' : ''}
              {formatDate(c.date)}
            </div>
            {c.notes && (
              <div className="s-note" style={{ paddingLeft: 0 }}>
                “{c.notes}”
              </div>
            )}
            <div className="flex section-gap">
              <button className="btn btn-sm btn-primary" onClick={() => share(c)}>
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
            <div className="card-title">Log a call</div>
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
            <div className="row-2">
              <div className="field">
                <label>Dose</label>
                <input className="input" placeholder="e.g. 30 mg" value={entry.dose} onChange={(e) => set({ dose: e.target.value })} />
              </div>
              <div className="field">
                <label>Date</label>
                <input className="input" type="date" value={entry.date} onChange={(e) => set({ date: e.target.value })} />
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
                placeholder="“Call back Tuesday”, “had 50mg not 30”, “wouldn’t confirm”…"
                value={entry.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </div>
            <div className="flex section-gap">
              <button className="btn btn-primary" onClick={save}>
                Save entry
              </button>
              <button className="btn" onClick={() => setEntry(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary btn-block section-gap" onClick={() => setEntry(emptyEntry())}>
            ⊕ Log a call
          </button>
        )}
      </div>
    </div>
  )
}
