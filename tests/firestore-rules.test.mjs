// Firestore rules check against the emulator (demo project only, no production access).
//   firebase emulators:exec --project demo-huduma --only firestore "node tests/firestore-rules.test.mjs"
// Seeds with "Bearer owner" (bypasses rules), then probes as anonymous, a signed-in
// non-staff uid, and a staff uid (unsigned alg:none JWTs, accepted by the emulator).
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const PROJECT = 'demo-huduma'
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (uid) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, iss: 'x', aud: PROJECT })}.`

const headers = (token) => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) })

async function seed(path, fields) {
  const r = await fetch(`${BASE}/${path}`, { method: 'PATCH', headers: headers('owner'), body: JSON.stringify({ fields }) })
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`)
}
const s = (v) => ({ stringValue: v })

const get = (path, token) => fetch(`${BASE}/${path}`, { headers: headers(token) })
const list = (coll, token) => fetch(`${BASE}/${coll}`, { headers: headers(token) })
const query = (coll, where, token) => fetch(`${BASE}:runQuery`, {
  method: 'POST', headers: headers(token),
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where } }),
})

let failed = 0
async function check(name, resPromise, expectAllowed) {
  const r = await resPromise
  const ok = r.ok
  const pass = ok === expectAllowed
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  -> HTTP ${r.status} (${ok ? 'allowed' : 'denied'}, expected ${expectAllowed ? 'allowed' : 'denied'})`)
}

await seed('appointments/a1', { status: s('pending'), date: s('2099-01-01'), time: s('09:00'), email: s('x@example.test') })
await seed('sessions/sess1', { used: { booleanValue: false } })
await seed('slots/slot1', { status: s('available'), date: s('2099-01-01') })
await seed('staff/staffUid', { name: s('staff') })

const pendingQ = {
  compositeFilter: { op: 'AND', filters: [
    { fieldFilter: { field: { fieldPath: 'date' }, op: 'EQUAL', value: s('2099-01-01') } },
    { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: s('pending') } },
  ] },
}

await check('anonymous get appointment', get('appointments/a1'), false)
await check('anonymous list appointments', list('appointments'), false)
await check('non-staff uid get appointment', get('appointments/a1', jwt('randomUid')), false)
await check('non-staff uid query appointments', query('appointments', pendingQ, jwt('randomUid')), false)
await check('staff uid get appointment', get('appointments/a1', jwt('staffUid')), true)
await check('staff uid query pending (as StaffPending does)', query('appointments', pendingQ, jwt('staffUid')), true)
await check('sessions: anonymous get by id', get('sessions/sess1'), true)
await check('sessions: anonymous list', list('sessions'), false)
await check('slots: anonymous get', get('slots/slot1'), true)
await check('slots: anonymous list', list('slots'), true)
await check('rate_limits: anonymous get denied', get('rate_limits/x'), false)
await check('rate_limits: staff get denied', get('rate_limits/x', jwt('staffUid')), false)

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
