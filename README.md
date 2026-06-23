# FillFinder

Find pharmacy availability for short-supply prescriptions — and stop losing weeks to the
ADHD-stimulant shortage. Built around the reality that **shelf-level stock data does not exist
publicly**, so the only way to know is to ask around. FillFinder makes asking around *compound*:
your calls become a shared map, and you get warned early enough to never hit zero.

## What it does

**Personal (private, on-device — works with no backend):**
- **My meds** — track run-out date from your fill date + days supply, and get warned *days early* so you start the hunt with lead time.
- **Call log** — a private record of every pharmacy you called and what they said. Your own recent history is the most reliable stock map that exists.
- **Live FDA shortage status** — the one genuinely public, programmable supply signal (openFDA), so you walk into a call knowing whether to ask for brand vs. generic.

**Community (shared pool):**
- **Find** — search recent stock reports near you, newest-first, by medication / form / state / ZIP.
- **Report** — post what you found in seconds. **Anonymous by default**, optional display handle.
- **Bridge** — one tap turns a call-log entry into a community report. This is what seeds the map even when you're the first user.

## Identity model

Anonymous posting with an **optional** display handle. Everyone gets a random device id (stored
only in your browser) so you can manage your own reports without an account. Real email/magic-link
accounts that sync across devices are a planned follow-up — the data model already carries
`reporterId`, so that upgrade won't need a migration.

## Run it locally

```bash
npm install

# Terminal 1 — API (defaults to a local JSON datastore, zero setup)
npm run server

# Terminal 2 — web app
npm run dev      # http://localhost:5173  (proxies /api -> :3001)
```

With **no `DATABASE_URL`**, community reports persist to `./data/reports.json` so you can run the
whole app locally. For a real shared pool, copy `.env.example` to `.env` and set a Neon Postgres
`DATABASE_URL` — the schema is created automatically on first request.

## Architecture

- **Frontend** — React 19 + Vite, PWA-installable, mobile-first. Personal data in `localStorage`.
- **API** — Vercel-style serverless handlers in `api/` (`reports.js`, `shortage.js`), mirrored by a local Express server (`server/index.js`) that imports the *same* handler code.
- **DB** — `api/_db.js`: Neon Postgres when `DATABASE_URL` is set, else a local JSON file.
- **Shortage** — `api/shortage.js` proxies + caches openFDA `/drug/shortages.json`.

## Scope / honesty

- The app **does not** have a real-time feed of pharmacy shelf stock — nobody does. It surfaces
  (a) national FDA shortage status and (b) human reports. Treat reports older than a few days as
  leads, not guarantees; always call to confirm.
- This exists to help **legitimately-prescribed patients locate their own medication** during a
  documented shortage. It is not for obtaining controlled substances without a prescription.

## Roadmap (not yet built)

- Email/magic-link accounts + cross-device sync; report confirms/flags (trust signals); map view
  with geocoding + distance sort; SQL-side filtering in `getReports`; push notifications for
  run-out alerts; prior-authorization / script-handoff checklist.
