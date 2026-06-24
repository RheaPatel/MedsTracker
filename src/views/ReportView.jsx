import { useState } from 'react'
import { submitReport } from '../api/client.js'
import { STATUSES, SOURCES, US_STATES, DEFAULT_MED } from '../lib/meds.js'
import { getDeviceId, getHandle, setHandle } from '../lib/identity.js'
import MedFields from '../components/MedFields.jsx'

function blankForm(prefill) {
  return {
    medName: prefill?.medName || DEFAULT_MED.brand,
    genericName: prefill?.genericName || DEFAULT_MED.generic,
    form: prefill?.form || 'generic',
    dose: prefill?.dose || '',
    pharmacyName: prefill?.pharmacyName || '',
    pharmacyAddress: prefill?.pharmacyAddress || '',
    city: prefill?.city || '',
    state: prefill?.state || '',
    zip: prefill?.zip || '',
    status: prefill?.status || 'in_stock',
    source: prefill?.source || 'called',
    shipmentInfo: prefill?.shipmentInfo || '',
    quantity: '',
    notes: prefill?.notes || '',
  }
}

export default function ReportView({ prefill, onDone, onToast }) {
  const [form, setForm] = useState(() => blankForm(prefill))
  const [handle, setHandleState] = useState(getHandle())
  const [shareHandle, setShareHandle] = useState(Boolean(getHandle()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const med = { medName: form.medName, genericName: form.genericName, form: form.form, dose: form.dose }

  const canSubmit =
    form.medName.trim() && form.pharmacyName.trim() && (form.city || form.state || form.zip)

  async function submit() {
    setErr(null)
    if (!canSubmit) {
      setErr('Need at least a medication, a pharmacy name, and a location.')
      return
    }
    setBusy(true)
    try {
      if (shareHandle && handle.trim()) setHandle(handle)
      await submitReport({
        ...form,
        ...med,
        quantity: form.quantity || null,
        reporterId: getDeviceId(),
        reporterHandle: shareHandle ? handle.trim() || null : null,
      })
      onToast?.('Thank you — sighting shared')
      onDone?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">Add a sighting</div>
        <h1 className="page-title">Report stock</h1>
        <p className="page-intro">
          Just called around or picked up a fill? Share what you found so it shows up for everyone
          searching nearby. Posting is anonymous — no account needed.
        </p>
      </div>

      <div className="pad">
        <div className="card">
          <MedFields value={med} onChange={(m) => set(m)} />

          <div className="field">
            <label>What did you find?</label>
            <div className="choice-grid">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`choice ${form.status === s.key ? 'selected' : ''}`}
                  onClick={() => set({ status: s.key })}
                  title={s.blurb}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {(form.status === 'expecting' || form.status === 'limited') && (
            <div className="field">
              <label>Shipment / detail (optional)</label>
              <input
                className="input"
                placeholder="e.g. expecting a shipment Tuesday"
                value={form.shipmentInfo}
                onChange={(e) => set({ shipmentInfo: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="card section-gap">
          <div className="field" style={{ marginTop: 0 }}>
            <label>Pharmacy</label>
            <input
              className="input"
              placeholder="e.g. CVS on 5th Ave"
              value={form.pharmacyName}
              onChange={(e) => set({ pharmacyName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Street address (optional)</label>
            <input
              className="input"
              placeholder="optional, helps people find the right one"
              value={form.pharmacyAddress}
              onChange={(e) => set({ pharmacyAddress: e.target.value })}
            />
          </div>
          <div className="row-2">
            <div className="field">
              <label>City</label>
              <input className="input" value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
            <div className="field">
              <label>State</label>
              <select className="select" value={form.state} onChange={(e) => set({ state: e.target.value })}>
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
              <label>ZIP</label>
              <input
                className="input"
                inputMode="numeric"
                value={form.zip}
                onChange={(e) => set({ zip: e.target.value })}
              />
            </div>
            <div className="field">
              <label>How did you find out?</label>
              <select className="select" value={form.source} onChange={(e) => set({ source: e.target.value })}>
                {SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card section-gap">
          <div className="field" style={{ marginTop: 0 }}>
            <label>Notes (optional)</label>
            <textarea
              className="textarea"
              placeholder="Anything useful — quantity, which doses they had, attitude on the phone…"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="flex" style={{ cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
              <input
                type="checkbox"
                checked={shareHandle}
                onChange={(e) => setShareHandle(e.target.checked)}
              />
              Show a display name on this sighting
            </label>
            {shareHandle && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                placeholder="a handle (optional)"
                value={handle}
                onChange={(e) => setHandleState(e.target.value)}
              />
            )}
          </div>
        </div>

        {err && <div className="banner banner-warn section-gap">{err}</div>}

        <button
          className="btn btn-primary btn-block section-gap"
          disabled={busy || !canSubmit}
          onClick={submit}
        >
          {busy ? 'Sharing…' : 'Share sighting'}
        </button>
      </div>
    </div>
  )
}
