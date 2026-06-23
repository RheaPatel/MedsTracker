// Medication presets + shared vocab for reports.
// Skewed toward the ADHD-stimulant shortage that motivated the app, but you can
// always type a custom med anywhere a med is chosen.

export const MED_PRESETS = [
  {
    id: 'lisdexamfetamine',
    brand: 'Vyvanse',
    generic: 'lisdexamfetamine',
    doses: ['10 mg', '20 mg', '30 mg', '40 mg', '50 mg', '60 mg', '70 mg'],
  },
  {
    id: 'amphetamine-salts',
    brand: 'Adderall',
    generic: 'amphetamine',
    doses: ['5 mg', '10 mg', '15 mg', '20 mg', '25 mg', '30 mg'],
  },
  {
    id: 'methylphenidate',
    brand: 'Concerta / Ritalin',
    generic: 'methylphenidate',
    doses: ['10 mg', '18 mg', '20 mg', '27 mg', '36 mg', '54 mg'],
  },
  {
    id: 'dexmethylphenidate',
    brand: 'Focalin',
    generic: 'dexmethylphenidate',
    doses: ['5 mg', '10 mg', '15 mg', '20 mg', '30 mg', '40 mg'],
  },
  {
    id: 'atomoxetine',
    brand: 'Strattera',
    generic: 'atomoxetine',
    doses: ['10 mg', '18 mg', '25 mg', '40 mg', '60 mg', '80 mg', '100 mg'],
  },
]

export const DEFAULT_MED = MED_PRESETS[0]

export function presetByGeneric(generic) {
  if (!generic) return null
  return MED_PRESETS.find((m) => m.generic === generic.toLowerCase()) || null
}

// Best-effort normalize a typed name to a generic key for shortage + report matching.
export function normalizeGeneric(name) {
  if (!name) return null
  const s = name.toLowerCase()
  for (const m of MED_PRESETS) {
    if (s.includes(m.generic) || s.includes(m.brand.toLowerCase().split(' ')[0])) return m.generic
  }
  return s.trim()
}

export const FORMS = [
  { key: 'brand', label: 'Brand' },
  { key: 'generic', label: 'Generic' },
]

// Report status vocab — keys must match the server (api/reports.js STATUSES).
export const STATUSES = [
  { key: 'in_stock', label: 'In stock', tone: 'good', blurb: 'They had it / filled it' },
  { key: 'limited', label: 'Limited', tone: 'warn', blurb: 'Some, but low / partial fill' },
  { key: 'expecting', label: 'Expecting', tone: 'info', blurb: 'Shipment coming soon' },
  { key: 'out', label: 'Out', tone: 'bad', blurb: 'None right now' },
  { key: 'wouldnt_say', label: "Wouldn't say", tone: 'muted', blurb: 'Refused to confirm over phone' },
]

export const SOURCES = [
  { key: 'called', label: 'Called them' },
  { key: 'in_person', label: 'In person' },
  { key: 'app_filled', label: 'Filled my Rx there' },
]

export function statusMeta(key) {
  return STATUSES.find((s) => s.key === key) || { key, label: key, tone: 'muted', blurb: '' }
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
  'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]
