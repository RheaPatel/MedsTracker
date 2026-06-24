// Local dev API server. Mounts the SAME handler modules that Vercel would run as
// serverless functions, so dev and prod execute identical code.
//
//   npm run server   # this file, on :3001
//   npm run dev      # vite on :5173, proxies /api -> :3001

import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import reports from '../api/reports.js'
import shortage from '../api/shortage.js'
import places from '../api/places.js'
import { backend } from '../api/_db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '64kb' }))

// Express's (req,res) are compatible with the Vercel-style handlers we wrote.
app.all('/api/reports', (req, res) => reports(req, res))
app.all('/api/shortage', (req, res) => shortage(req, res))
app.all('/api/places', (req, res) => places(req, res))

app.get('/api/health', (req, res) => res.json({ ok: true, backend }))

app.listen(PORT, () => {
  console.log(`FillFinder API on http://localhost:${PORT}  (data backend: ${backend})`)
  if (backend === 'file') {
    console.log('  → no DATABASE_URL set; community reports persist to ./data/reports.json')
  }
})
