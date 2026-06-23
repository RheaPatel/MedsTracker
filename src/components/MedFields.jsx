// Reusable medication picker: med (preset or custom) + form + dose.
// Controlled via `value` { medName, genericName, form, dose } and `onChange`.

import { MED_PRESETS, FORMS, presetByGeneric, normalizeGeneric } from '../lib/meds.js'

export default function MedFields({ value, onChange }) {
  const preset = presetByGeneric(value.genericName)
  const isCustom = Boolean(value.medName) && !preset
  const selectVal = preset ? preset.id : isCustom ? 'custom' : ''

  function pickPreset(id) {
    if (id === 'custom') {
      onChange({ ...value, medName: '', genericName: '', dose: '' })
      return
    }
    const p = MED_PRESETS.find((m) => m.id === id)
    if (!p) return
    onChange({
      ...value,
      medName: value.form === 'generic' ? p.generic : p.brand,
      genericName: p.generic,
      dose: '',
    })
  }

  function setForm(form) {
    // Keep the display name aligned with brand/generic when using a preset.
    let medName = value.medName
    if (preset) medName = form === 'generic' ? preset.generic : preset.brand
    onChange({ ...value, form, medName })
  }

  return (
    <>
      <div className="field">
        <label>Medication</label>
        <select className="select" value={selectVal} onChange={(e) => pickPreset(e.target.value)}>
          <option value="" disabled>
            Choose a medication…
          </option>
          {MED_PRESETS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.brand} ({m.generic})
            </option>
          ))}
          <option value="custom">Other / not listed…</option>
        </select>
      </div>

      {isCustom && (
        <div className="field">
          <label>Medication name</label>
          <input
            className="input"
            placeholder="e.g. guanfacine"
            value={value.medName}
            onChange={(e) =>
              onChange({ ...value, medName: e.target.value, genericName: normalizeGeneric(e.target.value) })
            }
          />
        </div>
      )}

      <div className="field">
        <label>Form</label>
        <div className="choice-grid">
          {FORMS.map((f) => (
            <button
              type="button"
              key={f.key}
              className={`choice ${value.form === f.key ? 'selected' : ''}`}
              onClick={() => setForm(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Dose / strength</label>
        <input
          className="input"
          list="dose-options"
          placeholder="e.g. 30 mg"
          value={value.dose}
          onChange={(e) => onChange({ ...value, dose: e.target.value })}
        />
        <datalist id="dose-options">
          {(preset?.doses || []).map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
    </>
  )
}
