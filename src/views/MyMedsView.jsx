import { useState } from 'react'
import { getMeds, upsertMed, deleteMed } from '../db/localStore.js'
import { DEFAULT_MED } from '../lib/meds.js'
import { addDays, daysUntil, formatDate, todayISODate } from '../lib/format.js'
import MedFields from '../components/MedFields.jsx'

function emptyForm() {
  return {
    medName: DEFAULT_MED.brand,
    genericName: DEFAULT_MED.generic,
    form: 'generic',
    dose: '',
    prescriber: '',
    daysSupply: 30,
    lastFillDate: todayISODate(),
    alertLeadDays: 10,
  }
}

function runOutInfo(med) {
  if (!med.lastFillDate || !med.daysSupply) return null
  const runOut = addDays(med.lastFillDate, Number(med.daysSupply))
  const left = daysUntil(runOut)
  const lead = Number(med.alertLeadDays) || 10
  let tone = 'good'
  if (left <= 0) tone = 'bad'
  else if (left <= lead) tone = 'warn'
  return { runOut, left, lead, tone }
}

export default function MyMedsView({ onMedsChange }) {
  const [meds, setMeds] = useState(() => getMeds())
  const [form, setForm] = useState(null) // null = closed; object = add/edit

  function refresh() {
    setMeds(getMeds())
    onMedsChange?.()
  }

  function save() {
    if (!form.medName?.trim()) return
    upsertMed(form)
    setForm(null)
    refresh()
  }

  function logRefill(med) {
    upsertMed({ ...med, lastFillDate: todayISODate() })
    refresh()
  }

  function remove(id) {
    deleteMed(id)
    refresh()
  }

  return (
    <div>
      <h1 className="view-title">My meds</h1>
      <p className="view-intro">
        Track your run-out date so you start the refill hunt <strong>early</strong> — before you’re
        at zero. The whole game during a shortage is lead time.
      </p>

      {meds.length === 0 && !form && (
        <div className="empty">
          <div className="empty-emoji">💊</div>
          <p>Add the medication you’re tracking and we’ll warn you before it runs out.</p>
        </div>
      )}

      <div className="section-gap">
        {meds.map((med) => {
          const r = runOutInfo(med)
          return (
            <div key={med.id} className="card">
              <div className="card-row">
                <div className="card-title">
                  {med.medName} {med.dose ? `· ${med.dose}` : ''}
                </div>
                <span className="meta">{med.form}</span>
              </div>
              {med.prescriber && <div className="meta" style={{ marginTop: 2 }}>Rx: {med.prescriber}</div>}

              {r ? (
                <>
                  <div className="flex" style={{ marginTop: 10 }}>
                    <span className={`pill tone-${r.tone}`}>
                      {r.left <= 0
                        ? `Out for ${Math.abs(r.left)} day${Math.abs(r.left) === 1 ? '' : 's'}`
                        : `${r.left} day${r.left === 1 ? '' : 's'} left`}
                    </span>
                    <span className="meta">runs out {formatDate(r.runOut)}</span>
                  </div>
                  {r.left <= r.lead && (
                    <div className="banner banner-warn" style={{ marginTop: 10 }}>
                      ⏰ Start the refill hunt now — send the script, call ahead, and check the
                      community map so you’re not scrambling at zero.
                    </div>
                  )}
                </>
              ) : (
                <div className="meta" style={{ marginTop: 8 }}>
                  Add a fill date + days supply to track run-out.
                </div>
              )}

              <div className="flex" style={{ marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => logRefill(med)}>
                  Log refill today
                </button>
                <button className="btn btn-sm" onClick={() => setForm({ ...med })}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(med.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {form ? (
        <div className="card section-gap">
          <div className="card-title">{form.id ? 'Edit medication' : 'Add a medication'}</div>
          <MedFields
            value={form}
            onChange={(m) => setForm((f) => ({ ...f, ...m }))}
          />
          <div className="row-2">
            <div className="field">
              <label>Last fill date</label>
              <input
                className="input"
                type="date"
                value={form.lastFillDate}
                onChange={(e) => setForm((f) => ({ ...f, lastFillDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Days supply</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.daysSupply}
                onChange={(e) => setForm((f) => ({ ...f, daysSupply: e.target.value }))}
              />
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Warn me this many days early</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.alertLeadDays}
                onChange={(e) => setForm((f) => ({ ...f, alertLeadDays: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Prescriber (optional)</label>
              <input
                className="input"
                value={form.prescriber}
                onChange={(e) => setForm((f) => ({ ...f, prescriber: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save}>
              {form.id ? 'Save' : 'Add medication'}
            </button>
            <button className="btn" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block section-gap" onClick={() => setForm(emptyForm())}>
          ＋ Add a medication
        </button>
      )}
    </div>
  )
}
