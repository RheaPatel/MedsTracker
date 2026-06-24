// GET  /api/reports  -> search community stock reports (filters via query string)
// POST /api/reports  -> submit a report (anonymous allowed; optional reporter id/handle)
//
// Works as a Vercel serverless function AND when mounted by the local express server.

import { v4 as uuid } from 'uuid'
import { getReports, addReport } from './_db.js'

const STATUSES = ['in_stock', 'limited', 'out', 'expecting', 'wouldnt_say']
const FORMS = ['brand', 'generic']
const SOURCES = ['called', 'in_person', 'app_filled']

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// Trim + hard length cap. Cheap abuse / junk-data guard for an open endpoint.
function clean(v, max = 200) {
  if (v == null) return null
  const s = String(v).trim().slice(0, max)
  return s.length ? s : null
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      const q = req.query || {}
      const reports = await getReports({
        generic: clean(q.generic, 80),
        form: clean(q.form, 20),
        dose: clean(q.dose, 30),
        state: clean(q.state, 2),
        zip: clean(q.zip, 10),
        status: clean(q.status, 20),
        q: clean(q.q, 80),
        sinceDays: q.sinceDays ? Number(q.sinceDays) : undefined,
        limit: q.limit ? Number(q.limit) : undefined,
      })
      return res.status(200).json({ reports })
    }

    if (req.method === 'POST') {
      const b = req.body || {}

      const medName = clean(b.medName, 120)
      const pharmacyName = clean(b.pharmacyName, 160)
      const status = clean(b.status, 20)

      if (!medName) return res.status(400).json({ error: 'medName is required' })
      if (!pharmacyName) return res.status(400).json({ error: 'pharmacyName is required' })
      if (!STATUSES.includes(status))
        return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` })

      const city = clean(b.city, 80)
      const state = clean(b.state, 2)
      const zip = clean(b.zip, 10)
      if (!city && !state && !zip)
        return res.status(400).json({ error: 'a location is required (city, state, or zip)' })

      const form = FORMS.includes(b.form) ? b.form : null
      const source = SOURCES.includes(b.source) ? b.source : 'called'
      let quantity = b.quantity != null ? parseInt(b.quantity, 10) : null
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > 100000) quantity = null

      let lat = b.lat != null ? parseFloat(b.lat) : null
      let lng = b.lng != null ? parseFloat(b.lng) : null
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) lat = null
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) lng = null

      const report = {
        id: uuid(),
        createdAt: new Date().toISOString(),
        reporterId: clean(b.reporterId, 64),
        reporterHandle: clean(b.reporterHandle, 40),
        medName,
        genericName: clean(b.genericName, 80),
        form,
        dose: clean(b.dose, 30),
        pharmacyName,
        pharmacyAddress: clean(b.pharmacyAddress, 200),
        city,
        state: state ? state.toUpperCase() : null,
        zip,
        status,
        shipmentInfo: clean(b.shipmentInfo, 200),
        quantity,
        notes: clean(b.notes, 500),
        source,
        lat,
        lng,
      }

      await addReport(report)
      return res.status(201).json({ report })
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err && err.code === 'NO_DB') {
      return res
        .status(503)
        .json({ error: 'Community database not configured yet — set DATABASE_URL.' })
    }
    console.error('[reports] error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
