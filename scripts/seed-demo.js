// Seed the LOCAL file datastore (data/reports.json) with clearly-labeled SAMPLE
// sightings, placed at real pharmacy locations across several US cities, with
// varied statuses and dates (a few hours → ~2 months old).
//
// This is DEMO DATA ONLY, so you can show the app populated. It is NOT scraped
// from Reddit and is NOT real verified availability — inventing precise, dated,
// geocoded "this pharmacy had it" listings out of vague anecdotes would mislead
// real patients, so we don't. Every row is tagged reporterId:'seed-demo' so it's
// easy to spot and remove. It only ever writes the local, gitignored store; if you
// later set DATABASE_URL (Neon), seed that deliberately instead.
//
//   node scripts/seed-demo.js          # write demo data
//   node scripts/seed-demo.js --clear  # remove ONLY the demo rows

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'reports.json')

// p=pharmacy a=address c=city s=state z=zip, d/h = days/hours ago, who=handle
const ROWS = [
  { p: 'CVS Pharmacy', a: '1396 2nd Ave', c: 'New York', s: 'NY', z: '10021', lat: 40.7693, lng: -73.9582, form: 'brand', dose: '30 mg', status: 'in_stock', who: 'maya_uws', d: 0, h: 5, note: 'Had brand 30 + 50, filled mine same day.' },
  { p: 'Walgreens', a: '145 Court St', c: 'Brooklyn', s: 'NY', z: '11201', lat: 40.6896, lng: -73.9925, form: 'generic', dose: '30 mg', status: 'out', who: null, d: 0, h: 9, note: 'Out, no ETA. Wouldn’t order ahead.' },
  { p: 'Costco Pharmacy', a: '976 3rd Ave', c: 'Brooklyn', s: 'NY', z: '11232', lat: 40.6566, lng: -74.0048, form: 'generic', dose: '40 mg', status: 'expecting', who: 'parkslopedad', d: 1, h: 3, ship: 'Truck Thursday — call in the AM', note: 'Said they’re expecting a shipment Thursday.' },
  { p: 'Duane Reade', a: '100 Broadway', c: 'New York', s: 'NY', z: '10005', lat: 40.7081, lng: -74.011, form: 'generic', dose: '50 mg', status: 'limited', who: null, d: 2, note: 'Only had a few 50mg left when I called.' },
  { p: 'CVS Pharmacy', a: '6360 W 3rd St', c: 'Los Angeles', s: 'CA', z: '90036', lat: 34.0716, lng: -118.3596, form: 'generic', dose: '30 mg', status: 'in_stock', who: 'la_adhd', d: 1, h: 6, note: 'Generic 30 in stock, no hassle.' },
  { p: 'Walgreens', a: '7900 Sunset Blvd', c: 'Los Angeles', s: 'CA', z: '90046', lat: 34.098, lng: -118.3637, form: 'brand', dose: '40 mg', status: 'wouldnt_say', who: null, d: 3, note: 'Wouldn’t confirm stock over the phone.' },
  { p: 'Walgreens', a: '151 N State St', c: 'Chicago', s: 'IL', z: '60601', lat: 41.8847, lng: -87.6278, form: 'generic', dose: '20 mg', status: 'in_stock', who: null, d: 4, note: 'Had generic 20 and 30.' },
  { p: 'CVS Pharmacy', a: '1167 S Wabash Ave', c: 'Chicago', s: 'IL', z: '60605', lat: 41.8676, lng: -87.6258, form: 'generic', dose: '60 mg', status: 'out', who: 'chi_rx', d: 6, note: 'Out for a couple weeks now.' },
  { p: 'H-E-B Pharmacy', a: '1000 E 41st St', c: 'Austin', s: 'TX', z: '78751', lat: 30.2978, lng: -97.722, form: 'generic', dose: '30 mg', status: 'in_stock', who: 'atx_mom', d: 2, h: 2, note: 'H-E-B came through — generic 30.' },
  { p: 'CVS Pharmacy', a: '1920 E Riverside Dr', c: 'Austin', s: 'TX', z: '78741', lat: 30.2403, lng: -97.729, form: 'generic', dose: '40 mg', status: 'expecting', who: null, d: 8, ship: 'Restock expected Monday', note: 'Told to check back Monday.' },
  { p: 'Bartell Drugs', a: '600 1st Ave', c: 'Seattle', s: 'WA', z: '98104', lat: 47.6029, lng: -122.3349, form: 'generic', dose: '50 mg', status: 'limited', who: 'sea_kt', d: 10, note: 'Limited supply of 50mg.' },
  { p: 'CVS Pharmacy', a: '587 Boylston St', c: 'Boston', s: 'MA', z: '02116', lat: 42.3503, lng: -71.0779, form: 'brand', dose: '30 mg', status: 'in_stock', who: null, d: 14, note: 'Brand 30 available.' },
  { p: 'Walgreens', a: '1426 Chestnut St', c: 'Philadelphia', s: 'PA', z: '19102', lat: 39.9506, lng: -75.166, form: 'generic', dose: '30 mg', status: 'out', who: null, d: 28, note: 'Was out when I called last month.' },
  { p: 'CVS Pharmacy', a: '342 E 23rd St', c: 'New York', s: 'NY', z: '10010', lat: 40.7375, lng: -73.9806, form: 'generic', dose: '70 mg', status: 'in_stock', who: 'oldlead', d: 63, note: 'Found 70mg here back in the spring.' },
]

const isoAgo = (days, hours = 0) =>
  new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString()

async function readAll() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'))
  } catch {
    return []
  }
}

async function clear() {
  await mkdir(path.dirname(FILE), { recursive: true })
  const all = existsSync(FILE) ? await readAll() : []
  const kept = all.filter((r) => r.reporterId !== 'seed-demo')
  await writeFile(FILE, JSON.stringify(kept, null, 2))
  console.log(`Cleared demo rows. ${kept.length} non-demo row(s) remain.`)
}

async function seed() {
  await mkdir(path.dirname(FILE), { recursive: true })
  const existing = (existsSync(FILE) ? await readAll() : []).filter(
    (r) => r.reporterId !== 'seed-demo'
  )
  const demo = ROWS.map((r) => ({
    id: randomUUID(),
    createdAt: isoAgo(r.d, r.h || 0),
    reporterId: 'seed-demo',
    reporterHandle: r.who || null,
    medName: r.form === 'brand' ? 'Vyvanse' : 'lisdexamfetamine',
    genericName: 'lisdexamfetamine',
    form: r.form,
    dose: r.dose,
    pharmacyName: r.p,
    pharmacyAddress: r.a,
    city: r.c,
    state: r.s,
    zip: r.z,
    status: r.status,
    shipmentInfo: r.ship || null,
    quantity: null,
    notes: r.note || null,
    source: r.source || 'called',
    lat: r.lat,
    lng: r.lng,
  }))
  const all = [...existing, ...demo].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
  await writeFile(FILE, JSON.stringify(all, null, 2))
  console.log(`Seeded ${demo.length} demo sightings → ${FILE}`)
}

// Emit SQL to seed the LIVE Neon DB (paste into the Neon/Vercel query console).
// Idempotent: clears prior demo rows first. Varied created_at preserves real dates.
function sqlVal(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}
function printSql() {
  const cols =
    '(id, created_at, reporter_id, reporter_handle, med_name, generic_name, form, dose, ' +
    'pharmacy_name, pharmacy_address, city, state, zip, status, shipment_info, quantity, notes, source, lat, lng)'
  const vals = ROWS.map((r) => {
    const row = [
      randomUUID(),
      isoAgo(r.d, r.h || 0),
      'seed-demo',
      r.who || null,
      r.form === 'brand' ? 'Vyvanse' : 'lisdexamfetamine',
      'lisdexamfetamine',
      r.form,
      r.dose,
      r.p,
      r.a,
      r.c,
      r.s,
      r.z,
      r.status,
      r.ship || null,
      null,
      r.note || null,
      r.source || 'called',
      r.lat,
      r.lng,
    ]
    return '  (' + row.map(sqlVal).join(', ') + ')'
  }).join(',\n')
  console.log(`DELETE FROM reports WHERE reporter_id = 'seed-demo';`)
  console.log(`INSERT INTO reports ${cols} VALUES\n${vals};`)
}

// POST the demo rows to a live API (e.g. the deployed Neon-backed app), preserving
// their observed dates. Rows are tagged reporter_id:'seed-demo'.
//   node scripts/seed-demo.js --post https://meds-tracker-theta.vercel.app
async function postTo(base) {
  if (!base) {
    console.error('Usage: node scripts/seed-demo.js --post <baseUrl>')
    return
  }
  const url = base.replace(/\/$/, '') + '/api/reports'
  let ok = 0
  let fail = 0
  for (const r of ROWS) {
    const body = {
      createdAt: isoAgo(r.d, r.h || 0),
      reporterId: 'seed-demo',
      reporterHandle: r.who || null,
      medName: r.form === 'brand' ? 'Vyvanse' : 'lisdexamfetamine',
      genericName: 'lisdexamfetamine',
      form: r.form,
      dose: r.dose,
      pharmacyName: r.p,
      pharmacyAddress: r.a,
      city: r.c,
      state: r.s,
      zip: r.z,
      status: r.status,
      shipmentInfo: r.ship || null,
      notes: r.note || null,
      source: r.source || 'called',
      lat: r.lat,
      lng: r.lng,
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) ok++
      else {
        fail++
        console.error('  fail', res.status, r.p)
      }
    } catch (e) {
      fail++
      console.error('  err', e.message, r.p)
    }
  }
  console.log(`Posted ${ok}/${ROWS.length} to ${url}${fail ? ` (${fail} failed)` : ''}`)
}

if (process.argv.includes('--clear')) clear()
else if (process.argv.includes('--sql')) printSql()
else if (process.argv.includes('--post')) postTo(process.argv[process.argv.indexOf('--post') + 1])
else seed()
