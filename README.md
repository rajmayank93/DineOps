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

## Implemented (high level)

- JWT auth, tenant isolation via `tenantId` from token, RBAC on routes.
- Floor tables, versioned menu, orders (`pending` → `preparing` → `ready` → `served`).
- Bills: create for **served** orders, **receiptText**, **mark paid** (table → `empty`).
- Dashboard/reports: revenue and top items from **paid** bills; open orders include awaiting payment.
- Mobile-friendly shell (drawer, safe areas).
