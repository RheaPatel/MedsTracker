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
  let tone = 'in'
  if (left <= 0) tone = 'out'
  else if (left <= lead) tone = 'expect'
  return { runOut, left, lead, tone }
}

const TONE_COLOR = { in: 'var(--in)', expect: 'var(--expect)', out: 'var(--out)' }

export default function MyMedsView({ onMedsChange, onFind }) {
  const [meds, setMeds] = useState(() => getMeds())
  const [form, setForm] = useState(null)

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
      <div className="page-head">
        <div className="page-kicker">Your supply</div>
        <h1 className="page-title">My meds</h1>
        <p className="page-intro">
          Track your run-out date so you start the refill hunt <em>early</em> — before you’re at
          zero. During a shortage, lead time is the whole game.
        </p>
      </div>

      <div className="pad">
        {meds.length === 0 && !form && (
          <div className="empty">
            <div className="empty-emoji">💊</div>
            <div className="empty-title">Nothing tracked yet</div>
            <p>Add the medication you’re tracking and we’ll warn you before it runs out.</p>
          </div>
        )}

        {meds.map((med) => {
          const r = runOutInfo(med)
          return (
            <div key={med.id} className="card section-gap">
              <div className="spread">
                <div className="card-title">
                  {med.medName} {med.dose ? `· ${med.dose}` : ''}
                </div>
                <span className="meta">{med.form}</span>
              </div>
              {med.prescriber && <div className="meta" style={{ marginTop: 2 }}>Rx: {med.prescriber}</div>}

              {r ? (
                <>
                  <div className="countdown section-gap" style={{ color: TONE_COLOR[r.tone] }}>
                    <span className="num">{r.left <= 0 ? Math.abs(r.left) : r.left}</span>
                    <span className="unit">
                      {r.left <= 0
                        ? `day${Math.abs(r.left) === 1 ? '' : 's'} overdue`
                        : `day${r.left === 1 ? '' : 's'} left`}
                    </span>
                  </div>
                  <div className="meta" style={{ marginTop: 4 }}>runs out {formatDate(r.runOut)}</div>
                  {r.left <= r.lead && (
                    <div className="banner banner-warn section-gap">
                      ⏰ Start the refill hunt now — send the script, call ahead.{' '}
                      <button className="link-btn" onClick={onFind}>
                        Find it nearby →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="meta section-gap">Add a fill date + days supply to track run-out.</div>
              )}

              <div className="flex section-gap">
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

        {form ? (
          <div className="card section-gap">
            <div className="card-title">{form.id ? 'Edit medication' : 'Add a medication'}</div>
            <MedFields value={form} onChange={(m) => setForm((f) => ({ ...f, ...m }))} />
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
                <label>Warn me this early</label>
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
            <div className="flex section-gap">
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
            ⊕ Add a medication
          </button>
        )}
      </div>
    </div>
  )
}
