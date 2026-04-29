# HudumaQ — Deploy Guide

**Stack:** Vercel (frontend) · Firebase/GCP (backend) · Brevo (email)

---

## Production Deploy

### 1. Firestore — Rules and Indexes

**Rules**
1. Firebase Console → Firestore Database → Rules tab
2. Paste the contents of `firestore.rules` → Publish

**Indexes**
1. Firebase Console → Firestore Database → Indexes tab → Composite
2. Create index: collection `appointments`, fields `date` (Asc) + `status` (Asc) + `time` (Asc)
3. Wait for it to build (turns green)

---

### 2. Brevo — Email Setup

1. Create account at brevo.com
2. Senders & IP → Senders → Add a sender → enter the email address you want to send from (e.g. `noreply@hudumaq.com` or your personal domain)
   - Brevo will send a confirmation email to that address — click the link to verify it
   - No custom domain DNS setup required
3. Profile → SMTP & API → API Keys → Generate a new API key → copy it (needed in next step)

---

### 3. Firebase — Set Function Secrets

Firebase Console → Functions → (after first deploy) → each function → Edit → Environment variables

Or via Google Cloud Console → Secret Manager → Create secret for each:

| Secret name | Value |
|---|---|
| `BREVO_API_KEY` | API key from Brevo |
| `BREVO_SENDER_EMAIL` | Sender address you verified in Brevo |
| `RATE_FORM_URL` | Your Google Form link |
| `APP_URL` | Your Vercel production URL (set after step 5) |

---

### 4. Firebase — Deploy Cloud Functions

1. Firebase Console → Functions → Get started (first time) or Dashboard
2. Select Python 3.12 runtime, Blaze plan required
3. Upload `functions/` folder as your source
4. Set region to `us-central1`
5. Confirm deploy — takes 3–5 min

> Blaze plan: upgrade in Firebase Console → Usage and billing. Cost at demo scale ≈ $0.

---

### 5. Vercel — Deploy Frontend

**First deploy (one-time setup):**
1. Push code to GitHub
2. Go to vercel.com/new → Import your repository
3. Click **Edit** next to Root Directory → set it to `frontend`
4. Framework preset should auto-detect **Vite**
5. Build settings (auto-filled, confirm these):
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
6. Environment Variables → add all `VITE_FIREBASE_*` values from your Firebase project settings
7. Click **Deploy**

Vercel runs `npm run build` on every push to your connected branch — no manual redeploys needed after setup. The `vercel.json` inside `frontend/` handles SPA routing (all paths serve `index.html`).

Note your production URL (e.g. `https://hudumaq.vercel.app`) — needed for `APP_URL` secret and next step.

---

### 6. Firebase — Authorize Your Domain

Firebase Console → Authentication → Settings → Authorized domains → Add domain → paste your Vercel URL.

Without this, staff Google Sign-In fails with an "unauthorized domain" error.

---

### 7. Seed Production Data

**Get your staff UID:**
1. Open your deployed app → navigate to `/staff` → sign in with Google
2. Firebase Console → Authentication → Users → copy the UID next to your email

**Update `seed/seed.py`:**
```
seed_staff(uid="YOUR_UID", email="yourstaff@email.com", name="Demo Staff")
```

**Run the seed** (ask your dev environment or agent to run `python seed/seed.py`).

Re-run each morning of the demo — slots cover today + tomorrow only.

---

## Day-of-Demo Checklist

- [ ] Re-run `seed.py` (fresh slots for today + tomorrow)
- [ ] Staff login works at `/staff`
- [ ] Full citizen flow: form → email → verify → slot → confirm → success
- [ ] Brevo dashboard → Transactional → Logs shows emails sending
- [ ] Vercel URL ready for Devpost submission

---

## Common Issues

| Problem | Fix |
|---|---|
| Staff Google Sign-In fails | Firebase Console → Auth → Authorized domains → add Vercel URL |
| Emails not sending | Check Brevo → Transactional → Logs for errors; confirm sender email is verified |
| Slots don't appear | Firestore index not built yet — check Indexes tab, wait for green status |
| Functions won't deploy | Upgrade to Blaze plan in Firebase Console → Usage and billing |
| "Secret environment variable overlaps non-secret environment variable" on deploy | `functions/.env` has a plain env var with the same name as a Secret Manager secret. Remove the duplicate from `.env` and redeploy. |
| Function returns 500 but no Python traceback in `firebase functions:log` | 2nd gen (Cloud Run) functions write execution logs to Google Cloud Logging, not the Firebase CLI. Go to `console.cloud.google.com/logs` and filter by function name to see Python stderr. |
| BREVO_API_KEY 401 Unauthorized | The secret value in Firebase Secret Manager is wrong. Go to GCP Console → Secret Manager → `BREVO_API_KEY` → add a new version with the correct key from Brevo dashboard → redeploy functions. |
