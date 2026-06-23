// Data layer for community pharmacy-stock reports.
//
// Two backends, chosen automatically:
//   • DATABASE_URL set  -> Neon Postgres (use this in production / for the real shared pool)
//   • DATABASE_URL unset -> local JSON file at ./data/reports.json (zero-setup dev fallback)
//
// Both expose the same async API: getReports(filters) and addReport(report).

import { neon } from '@neondatabase/serverless'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const DATABASE_URL = process.env.DATABASE_URL
const useNeon = Boolean(DATABASE_URL)
const sql = useNeon ? neon(DATABASE_URL) : null

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'reports.json')

let ready = null
function init() {
  if (ready) return ready
  ready = (async () => {
    if (useNeon) {
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          id              text PRIMARY KEY,
          created_at      timestamptz NOT NULL DEFAULT now(),
          reporter_id     text,
          reporter_handle text,
          med_name        text NOT NULL,
          generic_name    text,
          form            text,
          dose            text,
          pharmacy_name   text NOT NULL,
          pharmacy_address text,
          city            text,
          state           text,
          zip             text,
          status          text NOT NULL,
          shipment_info   text,
          quantity        integer,
          notes           text,
          source          text
        )`
      await sql`CREATE INDEX IF NOT EXISTS reports_lookup ON reports (generic_name, state, created_at DESC)`
    } else {
      if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
      if (!existsSync(FILE)) await writeFile(FILE, '[]', 'utf8')
    }
  })()
  return ready
}

function rowToReport(r) {
  return {
    id: r.id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    reporterId: r.reporter_id,
    reporterHandle: r.reporter_handle,
    medName: r.med_name,
    genericName: r.generic_name,
    form: r.form,
    dose: r.dose,
    pharmacyName: r.pharmacy_name,
    pharmacyAddress: r.pharmacy_address,
    city: r.city,
    state: r.state,
    zip: r.zip,
    status: r.status,
    shipmentInfo: r.shipment_info,
    quantity: r.quantity,
    notes: r.notes,
    source: r.source,
  }
}

async function readFileStore() {
  await init()
  try {
    return JSON.parse(await readFile(FILE, 'utf8'))
  } catch {
    return []
  }
}

// NOTE: v1 fetches recent rows then filters in JS — fine at low volume.
// Move the matching into SQL/indexed queries before this scales.
function matches(r, f) {
  if (f.generic && (r.genericName || '').toLowerCase() !== f.generic.toLowerCase()) return false
  if (f.form && r.form !== f.form) return false
  if (f.dose && (r.dose || '').toLowerCase() !== f.dose.toLowerCase()) return false
  if (f.state && (r.state || '').toUpperCase() !== f.state.toUpperCase()) return false
  if (f.zip && r.zip !== f.zip) return false
  if (f.status && r.status !== f.status) return false
  if (f.q) {
    const hay = `${r.pharmacyName} ${r.pharmacyAddress} ${r.city} ${r.state} ${r.zip} ${r.medName} ${r.notes}`.toLowerCase()
    if (!hay.includes(f.q.toLowerCase())) return false
  }
  if (f.sinceDays) {
    const cutoff = Date.now() - f.sinceDays * 86400000
    if (new Date(r.createdAt).getTime() < cutoff) return false
  }
  return true
}

export async function getReports(filters = {}) {
  await init()
  const limit = Math.min(Number(filters.limit) || 200, 500)
  let rows
  if (useNeon) {
    rows = (await sql`SELECT * FROM reports ORDER BY created_at DESC LIMIT 1000`).map(rowToReport)
  } else {
    rows = await readFileStore()
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
  return rows.filter((r) => matches(r, filters)).slice(0, limit)
}

export async function addReport(r) {
  await init()
  if (useNeon) {
    await sql`
      INSERT INTO reports
        (id, created_at, reporter_id, reporter_handle, med_name, generic_name, form, dose,
         pharmacy_name, pharmacy_address, city, state, zip, status, shipment_info, quantity, notes, source)
      VALUES
        (${r.id}, ${r.createdAt}, ${r.reporterId}, ${r.reporterHandle}, ${r.medName}, ${r.genericName},
         ${r.form}, ${r.dose}, ${r.pharmacyName}, ${r.pharmacyAddress}, ${r.city}, ${r.state}, ${r.zip},
         ${r.status}, ${r.shipmentInfo}, ${r.quantity}, ${r.notes}, ${r.source})`
  } else {
    const all = await readFileStore()
    all.push(r)
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8')
  }
  return r
}

export const backend = useNeon ? 'neon' : 'file'
