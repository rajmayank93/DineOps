# DineOps

Multi-tenant restaurant operations: **auth**, **staff**, **tables**, **menu**, **orders** (kitchen flow), **billing** with printable receipts, and **analytics** (revenue from paid bills). Stack: **React (Vite)** · **Fastify** · **PostgreSQL** · **Prisma**.

## Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** — HLD/LLD, schema, RBAC matrix, API summary, domain rules (start here for technical depth).
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** — Auth walkthrough plus billing pointers and file layout.

## Quick start

### Backend

1. Copy env: `cp backend/.env.example backend/.env` (or create `backend/.env`) with `DATABASE_URL`, `JWT_SECRET`, optional `PORT`, `FRONTEND_ORIGIN`.
2. `cd backend && npm install` (runs **`prisma generate`** via `postinstall`).
3. `npx prisma db push` (or migrate) to apply schema.
4. `npm run dev` — API default **http://localhost:4000**.

If you change **`schema.prisma`** without reinstalling, run **`npx prisma generate`** and restart the server.

### Frontend

1. `cd frontend && npm install && npm run dev` — default **http://localhost:5173**.
2. Set `VITE_API_URL` if the API is not at `http://localhost:4000/api`.

### Deploy backend (Railway)

1. Create a **PostgreSQL** database on Railway and a **Node** service from this repo.
2. Set the service **root directory** to **`backend`** (or deploy with archive root = `backend`).
3. **Variables:** Railway usually injects **`DATABASE_URL`** and **`PORT`**. Add **`JWT_SECRET`** (long random string) and **`FRONTEND_ORIGIN`** (your real frontend URL, or comma-separated list).
4. **`backend/railway.toml`** defines build (`npm install && npm run build`), **`preDeployCommand`** (`prisma db push`), **`start`** (`node dist/server.js`), and health check **`GET /health`**.
5. Point the frontend **`VITE_API_URL`** at `https://<your-railway-service>.up.railway.app/api` (or your custom domain).

Free-tier limits and sleep/wake behavior are up to Railway’s current policy—check [railway.app/pricing](https://railway.app/pricing).

### Deploy backend (Render)

1. In the [Render Dashboard](https://dashboard.render.com), use **Blueprint** → connect this repo → Render reads **`render.yaml`** at the repo root.
2. Or create a **Web Service** manually: **Root Directory** = **`backend`**, **Build** = `npm install && npm run build`, **Pre-deploy** = `npx prisma db push --skip-generate`, **Start** = `npm start`.
3. Add **PostgreSQL** (free) and set **`DATABASE_URL`** to the DB **Internal** or **External** URL Render provides (blueprint wires this via `fromDatabase`).
4. Set **`FRONTEND_ORIGIN`** to your real frontend origin(s); **`JWT_SECRET`** should be a long secret (the sample blueprint uses **`generateValue`** for JWT on first deploy—in the dashboard you may replace it).
5. **Health check path:** `/health`. Bind uses **`PORT`** (set by Render automatically).
6. Frontend **`VITE_API_URL`:** `https://<your-service>.onrender.com/api`.

Render free tier: see [render.com/pricing](https://render.com/pricing) for current DB/service limits and spin-down behavior.

## Implemented (high level)

- JWT auth, tenant isolation via `tenantId` from token, RBAC on routes.
- Floor tables, versioned menu, orders (`pending` → `preparing` → `ready` → `served`).
- Bills: create for **served** orders, **receiptText**, **mark paid** (table → `empty`).
- Dashboard/reports: revenue and top items from **paid** bills; open orders include awaiting payment.
- Mobile-friendly shell (drawer, safe areas).
