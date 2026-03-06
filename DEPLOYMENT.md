# JobNova — Production Deployment Guide

This guide covers deploying the JobNova monorepo to production: **Frontend (Vercel)**, **Backend (Render or Railway)**, and **Database (Neon PostgreSQL)**.

---

## Prerequisites

- **Neon**: PostgreSQL database ([neon.tech](https://neon.tech))
- **Vercel**: Frontend hosting
- **Render** or **Railway**: Backend API hosting
- Git repo connected to all services

---

## 1. Database (Neon)

1. Create a Neon project and copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
2. Use this as `DATABASE_URL` for the backend. No schema change required; run migrations from the backend (see below).

---

## 2. Backend (Render or Railway)

### Build and start commands

| Step        | Command |
|------------|---------|
| Install     | `npm ci` (or `npm install`) |
| Build       | `npm run build` (runs `prisma generate` then `nest build`) |
| Start       | `npm run start:prod` (`node dist/main`) |

Set **Root Directory** to `backend` if the service is at repo root.

### Environment variables (backend)

Set these in the Render/Railway dashboard. **Never commit real values.**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars; e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars; different from access secret |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend origins, e.g. `https://yourapp.vercel.app` |
| `FRONTEND_URL` | Yes | Frontend base URL for email links, e.g. `https://yourapp.vercel.app` |
| `RESEND_API_KEY` | Yes | Resend API key for verification/password-reset emails |
| `EMAIL_FROM` | Yes | Sender address, e.g. `JobNova <noreply@yourdomain.com>` |
| `PORT` | No | Set by Render/Railway automatically; default 3000 |
| `NODE_ENV` | No | Set to `production` in production |
| `THROTTLE_TTL` | No | Default 60000 |
| `THROTTLE_LIMIT` | No | Default 100 |
| `SENTRY_DSN` | No | Backend Sentry DSN (server-side) |

### Prisma migrations in production

Run migrations **once** after deploying (or via a release command):

```bash
cd backend
npx prisma migrate deploy
```

- **Render**: Add a **Background Worker** or use **Shell** in Dashboard to run the above, or run it from your machine pointing at production `DATABASE_URL`.
- **Railway**: Run in a one-off shell or in the same service before start: `npx prisma migrate deploy && npm run start:prod` (or use a separate migrate step in CI).

### CORS

Backend reads `ALLOWED_ORIGINS`. Set it to your frontend production URL (and optionally staging), e.g.:

- `ALLOWED_ORIGINS=https://jobnova.vercel.app,https://www.yourdomain.com`

No trailing slashes. Multiple origins comma-separated.

### Common backend failures

- **"Prisma Client not generated"**: Ensure `npm run build` runs (it runs `prisma generate`).
- **"CORS not allowed"**: Set `ALLOWED_ORIGINS` to the exact frontend origin (scheme + host, no path).
- **Database connection fails**: Check Neon connection string, IP allowlist if any, and `?sslmode=require` for Neon.
- **PORT**: Let the platform set `PORT`; the app reads it via `ConfigService`.

---

## 3. Frontend (Vercel)

### Build and start

| Step   | Command |
|--------|---------|
| Install | `npm ci` or `npm install` |
| Build   | `npm run build` |
| Start   | `npm run start` (optional; Vercel runs serverless) |

Set **Root Directory** to `frontend` if the repo root is the monorepo root.

### Environment variables (frontend)

Only `NEXT_PUBLIC_*` and non-secret vars are safe; they are embedded in the client bundle.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes (prod) | Backend API base URL, no trailing slash, e.g. `https://your-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | No | Frontend URL for redirects/meta; defaults in code |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for client-side errors |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | No | Vercel Analytics |

**Important:** Set `NEXT_PUBLIC_API_URL` in Vercel to your **deployed backend URL**. The app uses this for all API calls and for CSP `connect-src` in `next.config.mjs`.

### Common frontend failures

- **API calls to wrong host**: Set `NEXT_PUBLIC_API_URL` in Vercel Environment Variables and redeploy.
- **CSP blocking requests**: CSP is built from `NEXT_PUBLIC_API_URL` at build time; ensure it is set for production builds.
- **401 / CORS**: Backend `ALLOWED_ORIGINS` must include the Vercel deployment URL (e.g. `https://yourapp.vercel.app`).

---

## 4. Deployment order

1. **Neon**: Create DB and get `DATABASE_URL`.
2. **Backend**: Deploy to Render/Railway with env vars; run `npx prisma migrate deploy`; note the backend URL.
3. **Frontend**: Deploy to Vercel with `NEXT_PUBLIC_API_URL` = backend URL.
4. **Backend**: Set `ALLOWED_ORIGINS` and `FRONTEND_URL` to the Vercel URL if not already set.

---

## 5. Local production-like builds

**Backend:**

```bash
cd backend
npm ci
npm run build
npx prisma migrate deploy   # or migrate dev for local DB
npm run start:prod
```

**Frontend:**

```bash
cd frontend
npm ci
npm run build
npm run start
```

Use a local `.env` (or `.env.local` for Next.js) with the same variable names; never commit secrets.

---

## 6. Security checklist

- [ ] No `.env` or real secrets in the repo (use `.env.example` only).
- [ ] `ALLOWED_ORIGINS` and `FRONTEND_URL` point only to your real frontend URL(s).
- [ ] JWT secrets are long random strings (e.g. 64 bytes hex), different for access and refresh.
- [ ] `NEXT_PUBLIC_*` contains no secrets (only URLs and public config).
- [ ] Database uses SSL (Neon connection string includes `?sslmode=require`).

---

## 7. References

- **Backend env example**: `backend/.env.example`
- **Frontend env example**: `frontend/.env.example`
- **Prisma schema**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`
