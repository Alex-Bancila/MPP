# Deploying Music Core to the cloud (free, HTTPS via Let's Encrypt)

This guide puts the whole app on the public internet using only **free** services, each
of which serves a **Let's Encrypt** certificate automatically. Nothing here costs money
and no personal server is involved.

## What you'll end up with

```
 Browser ──HTTPS──► Frontend (Render Static Site)   https://music-core.onrender.com
   │                    │  calls
   │                    ▼
   └──────HTTPS/WSS──► Backend  (Render Web Service)  https://music-core-api.onrender.com
                          │            │
                          ▼            ▼
                   Postgres (Neon)   MongoDB (Atlas)
                          │
                          ▼
                     Email via Brevo SMTP  ──► reset / magic-link tokens land in inboxes
```

| Piece | Service | Free tier | TLS |
|-------|---------|-----------|-----|
| Frontend | Render Static Site | yes | Let's Encrypt (automatic) |
| Backend  | Render Web Service | yes | Let's Encrypt (automatic) |
| Postgres | Neon | yes, no expiry | — |
| MongoDB  | MongoDB Atlas M0 | yes, forever | — |
| Email    | Brevo SMTP | 300 emails/day | — |

> The platform terminates HTTPS at the edge, so the app runs plain HTTP internally
> (`USE_HTTPS=false`). Your old local self-signed certs are not used in the cloud.

---

## 0. Prerequisites

1. Push this repo to GitHub (Render deploys from GitHub).
   ```powershell
   cd C:\Users\alexb\Documents\Year2_Sem2\MPP
   git add .
   git commit -m "Cloud deploy: email tokens, prod WS/API URLs"
   git push
   ```
2. Create free accounts: [neon.tech](https://neon.tech), [mongodb.com/atlas](https://www.mongodb.com/atlas), [brevo.com](https://www.brevo.com), [render.com](https://render.com). Sign in to all with GitHub to keep it quick.

---

## 1. PostgreSQL — Neon

1. Neon → **Create project** → name `music-core` → region closest to you.
2. Copy the **connection string** (Dashboard → *Connect*). It looks like:
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Keep it — this is your **`DATABASE_URL`** (the `?sslmode=require` part is required).

## 2. MongoDB — Atlas

1. Atlas → **Build a Database** → **M0 (Free)** → pick a region → Create.
2. **Database Access** → add a user (username + password).
3. **Network Access** → **Add IP** → **Allow access from anywhere** (`0.0.0.0/0`) — Render's IPs are dynamic.
4. **Connect → Drivers** → copy the URI and insert your password:
   `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/musiccore?retryWrites=true&w=majority`
5. Keep it — this is your **`MONGODB_URI`**.

## 3. Email — Brevo (SMTP)

1. Brevo → sign up → **SMTP & API** → **SMTP** tab.
2. Note **SMTP server** (`smtp-relay.brevo.com`), **Port** (`587`), **Login** (your email), and **generate an SMTP key** (the password).
3. Under **Senders**, add and verify a sender email (Brevo emails you a confirmation link). Use that as `MAIL_FROM`.

   These become: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

> Using **Gmail** instead? `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`,
> `SMTP_PASS=`*16-char App Password* (Google Account → Security → 2-Step Verification → App passwords).

## 4. Backend — Render Web Service

1. Render → **New → Web Service** → connect the GitHub repo.
2. Settings:
   - **Root Directory:** `client`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run prisma:generate && npm run prisma:push`
     *(uses `prisma db push` to make the DB match `schema.prisma` exactly — this project's*
     *schema is managed by db push, so the migration files can lag behind.)*
   - **Start Command:** `npm run server:start`
   - **Instance type:** Free
   - **Health Check Path:** `/health`
3. **Environment** → add variables:

   | Key | Value |
   |-----|-------|
   | `HOST` | `0.0.0.0` |
   | `USE_HTTPS` | `false` |
   | `JWT_SECRET` | a long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
   | `DATABASE_URL` | *(from step 1)* |
   | `MONGODB_URI` | *(from step 2)* |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | *(from step 3)* |
   | `APP_URL` | leave blank for now — set in step 6 |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` | optional, set in step 7 |

4. **Create**. Wait for the build. Note the URL, e.g. `https://music-core-api.onrender.com`.
5. Open `https://<backend>/health` — you should see JSON with `postgres` and `mongo` true. The padlock confirms Let's Encrypt is live.

## 5. Seed the database (one time)

The first deploy ran the migrations. Now load the roles/permissions + demo data:

- Render → your backend service → **Shell** tab → run:
  ```bash
  npm run prisma:seed
  ```

> Roles/permissions must exist or registration fails (foreign-key on `roleId`). Run this once.

## 6. Frontend — Render Static Site

1. Render → **New → Static Site** → same repo.
2. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. **Environment** → add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | your backend URL from step 4, e.g. `https://music-core-api.onrender.com` |

4. **Redirects/Rewrites** → add a rule so client-side routing works:
   `Source: /*` → `Destination: /index.html` → **Rewrite**.
5. **Create**. Note the URL, e.g. `https://music-core.onrender.com`.

> `VITE_API_BASE_URL` is baked in at **build** time. If you change it later, trigger a
> **Manual Deploy → Clear build cache & deploy** so the new value takes effect.

## 7. Connect the two + GitHub OAuth

1. Backend service → **Environment** → set **`APP_URL`** = the frontend URL from step 6
   (e.g. `https://music-core.onrender.com`). Save (this redeploys the backend).
   - `APP_URL` is used for the email links and the GitHub post-login redirect, so it must be the **frontend** URL.
2. (Optional) GitHub login:
   - github.com → **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - **Homepage URL:** the frontend URL.
   - **Authorization callback URL:** `https://<backend>/auth/github/callback` (the **backend**!).
   - Copy Client ID + generate a Client Secret → set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
     and `GITHUB_CALLBACK_URL=https://<backend>/auth/github/callback` on the backend.

## 8. Verify

- Open the frontend URL → register an account → you should land in the app.
- **Email:** Login page → *Forgot password* → enter your email → check your inbox for the reset link → it opens `/reset-password?token=…` pre-filled → set a new password → log in.
- **HTTPS / Let's Encrypt:** click the padlock in the browser → *Connection is secure* → certificate issued by **Let's Encrypt (R3 / ISRG)**.
- **Real-time:** open the app in two browsers, send a chat message / create a listing → it appears live in the other (WebSocket over `wss://` works cross-domain now).
- **30 users:** the free backend handles light concurrent traffic; just wake it first (below).

---

## 9. Keep the backend awake (no cold start) — free, no credit card

Render's free backend spins down after ~15 min idle, which would add a ~50s cold start
the first time someone opens it. Avoid that entirely with a free uptime monitor that
pings the health endpoint every ~10 minutes, keeping the service running 24/7. One
always-on service stays within Render's free limit (~730 hrs/month < 750 free hours).

Use **either** of these (both free, no credit card):

**Option A — UptimeRobot** ([uptimerobot.com](https://uptimerobot.com))
1. Sign up → **Add New Monitor**.
2. Type: **HTTP(s)**. URL: `https://<backend>/health`. Interval: **5 minutes** (free min).
3. Create. It now pings around the clock; the backend never sleeps.
   (Bonus: you get an uptime dashboard + email alerts if it ever goes down.)

**Option B — cron-job.org** ([cron-job.org](https://cron-job.org))
1. Sign up → **Create cronjob**.
2. URL: `https://<backend>/health`. Schedule: **every 10 minutes**. Save & enable.

> `/health` is a lightweight check (it just verifies DB connectivity), so pinging it is cheap.
> Set this up once and you can forget about cold starts for the demo and beyond.

---

## Demo-day checklist

- With the keep-alive monitor from step 9 running, the backend is **already awake** — no
  cold start. (If you skipped step 9, open `https://<backend>/health` ~1 min before presenting.)
- Send **both** links on Teams:
  - App: `https://music-core.onrender.com`
  - API health (proof it's live): `https://music-core-api.onrender.com/health`
- Have one reset-password / magic-link demo ready to show tokens arriving by email.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend loads but API calls fail | `VITE_API_BASE_URL` wrong or not rebuilt — set it and **clear cache & deploy** the static site. |
| Blank page on refresh of a sub-route | Missing the `/*` → `/index.html` rewrite (step 6.4). |
| `/health` shows `postgres:false` | `DATABASE_URL` wrong or missing `?sslmode=require`. |
| `mongo:false` | `MONGODB_URI` wrong, or Atlas Network Access doesn't allow `0.0.0.0/0`. |
| Registration 500 / FK error | You skipped step 5 (`npm run prisma:seed`). |
| Reset email never arrives | Check the backend **Logs** for `[Mailer]`; verify SMTP creds + that the Brevo sender is verified. Check spam. |
| GitHub: "redirect_uri is not associated" | The OAuth App callback must be exactly `https://<backend>/auth/github/callback`. |
| Real-time not updating | Confirm `VITE_API_BASE_URL` is the backend `https://` URL (the socket is derived from it). |
