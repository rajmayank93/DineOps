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

**Path A — Blueprint (recommended, matches this repo)**  

1. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub.
2. Click **New +** → **Blueprint**. Connect **`rajmayank93/DineOps`** (or your fork). Render finds **`render.yaml`** in the repo root.
3. Apply the blueprint. Render will create:
   - a **PostgreSQL** database (`dineops-db`), and  
   - a **Web Service** (`dineops-api`) with **Root Directory** `backend`.
4. When Render asks for missing values, set **`FRONTEND_ORIGIN`** (see below). **`JWT_SECRET`** is often auto-filled by the blueprint (`generateValue`); you can leave it or replace it later in **Environment**.
5. Wait for the first deploy to finish (green). Open your **web service** (not the database).

**What you do *not* need to do with a Blueprint:** you usually **do not** copy **Internal** or **External** database URLs by hand. The blueprint’s **`fromDatabase`** entry tells Render to inject **`DATABASE_URL`** into the API service automatically. Only if you **did not** use a blueprint do you paste the URL yourself (see Path B).

**What `FRONTEND_ORIGIN` means (required)**  

- The API only accepts browser requests from origins you allow (CORS).  
- **While the frontend still runs on your laptop:** set **`FRONTEND_ORIGIN`** to `http://localhost:5173` (Vite’s default).  
- **When the frontend is hosted** (e.g. `https://my-app.netlify.app`): set **`FRONTEND_ORIGIN`** to exactly that URL (no trailing slash).  
- To allow **both**, use a comma: `http://localhost:5173,https://my-app.netlify.app`  

Set it under your **Web Service** → **Environment** → add or edit **`FRONTEND_ORIGIN`** → **Save** → **Manual Deploy** if needed.

**What `JWT_SECRET` means**  

- A long random string the server uses to sign login tokens.  
- If the blueprint already generated one, you can keep it. To change it: **Environment** → **`JWT_SECRET`** → save (existing users must log in again).

**Health check and port**  

- You don’t configure **`PORT`** by hand; Render sets it. The app already listens on `process.env.PORT`.  
- Health check path **`/health`** is for Render’s monitors; you don’t open it unless debugging.

**Connect your frontend to the API**  

1. On Render, open **`dineops-api`** → note the public URL, e.g. `https://dineops-api-xxxx.onrender.com`.  
2. The backend serves API routes under **`/api`**, so the full base URL is:  
   **`https://dineops-api-xxxx.onrender.com/api`**  
3. On your machine, in **`frontend/`**, create **`.env.local`** (never commit it):  
   ```env
   VITE_API_URL=https://dineops-api-xxxx.onrender.com/api
   ```  
4. Restart `npm run dev` and use the app; it will call Render instead of localhost.

**Path B — Manual (no Blueprint)**  

1. **New +** → **PostgreSQL** → free plan → create. Copy the **Internal Database URL** (or External if the app runs outside Render).  
2. **New +** → **Web Service** → same repo → **Root Directory:** `backend`.  
3. **Build:** `npm install && npm run build`  
4. **Start:** `npm run render-start`  
5. **Environment** on the web service: add **`DATABASE_URL`** (paste from step 1), **`JWT_SECRET`**, **`FRONTEND_ORIGIN`**, and optionally **`NODE_VERSION`** = `20`.  

Render free tier: see [render.com/pricing](https://render.com/pricing) for limits and sleep/spin-down behavior.

## Implemented (high level)

- JWT auth, tenant isolation via `tenantId` from token, RBAC on routes.
- Floor tables, versioned menu, orders (`pending` → `preparing` → `ready` → `served`).
- Bills: create for **served** orders, **receiptText**, **mark paid** (table → `empty`).
- Dashboard/reports: revenue and top items from **paid** bills; open orders include awaiting payment.
- Mobile-friendly shell (drawer, safe areas).
