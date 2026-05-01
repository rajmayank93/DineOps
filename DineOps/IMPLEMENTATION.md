# DineOps Implementation Guide

## Authentication System

### Overview
DineOps uses a **JWT-based multi-tenant authentication system** where each restaurant (tenant) gets complete data isolation. Authentication happens via stateless JWTs that encode the tenant ID and user role.

---

## Auth Flow Architecture

### Signup Flow

```
User submits: { restaurantName, ownerEmail, password }
                    ↓
         Backend validates input
                    ↓
     Check if email already exists as tenant owner
                    ↓
          Hash password with bcrypt (cost: 12)
                    ↓
     Create Tenant + create admin User atomically
                    ↓
         Sign JWT with { userId, tenantId, role }
                    ↓
   Return token + tenant/user metadata to frontend
                    ↓
      Frontend saves token and auth state to localStorage
```

### Login Flow

```
User submits: { email, password }
                    ↓
       Find user by email in database
                    ↓
          Compare password with hash
                    ↓
     Sign JWT with { userId, tenantId, role }
                    ↓
   Return token + tenant/user metadata to frontend
                    ↓
      Frontend saves token and auth state to localStorage
```

---

## JWT Payload Structure

```typescript
{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  tenantId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  role: "admin",
  iat: 1712982200,
  exp: 1713587000
}
```

**Key points:**
- `tenantId` is extracted on every API request to enforce data isolation
- `role` controls which features the user can access (admin, waiter, kitchen, etc.)
- Token expires after 7 days
- Signed with `JWT_SECRET` from environment

---

## Backend Auth Implementation

### 1. Route: `POST /api/auth/signup`

**Location:** [backend/src/routes/auth.ts](../backend/src/routes/auth.ts#L8-L48)

**What happens:**
1. Validates that all fields are provided
2. Checks if the email already exists as a Tenant owner (prevents duplicate restaurant registrations)
3. Hashes the password using bcrypt with 12 salt rounds
4. Creates a new Tenant in one atomic transaction
5. Creates an admin User linked to that Tenant
6. Issues a signed JWT token

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenant": { "id": "uuid", "name": "My Restaurant" },
  "user": { "id": "uuid", "email": "owner@restaurant.com", "role": "admin" }
}
```

### 2. Route: `POST /api/auth/login`

**Location:** [backend/src/routes/auth.ts](../backend/src/routes/auth.ts#L50-L75)

**What happens:**
1. Finds the user by email in the database
2. Compares the provided password against the stored hash
3. If valid, signs a JWT token
4. Returns token + user/tenant info

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenant": { "id": "uuid", "name": "My Restaurant" },
  "user": { "id": "uuid", "email": "owner@restaurant.com", "role": "admin" }
}
```

---

## JWT Helpers

**Location:** [backend/src/lib/jwt.ts](../backend/src/lib/jwt.ts)

```typescript
// Sign a token
signToken({ userId, tenantId, role }) → JWT string

// Verify a token (used by protected-route middleware)
verifyToken(token) → { userId, tenantId, role, iat, exp }
```

---

## Protected routes, tenant context, and RBAC

### Overview

After login, the client sends `Authorization: Bearer <jwt>` on every API call. Protected handlers use:

1. **`authenticate`** — Verifies the JWT and sets `request.auth` with `{ userId, tenantId, role }`. The tenant boundary for data access **must** come from this object (never from client-supplied body/query for scoping).
2. **`requireRoles('admin', …)`** — Fastify `preHandler` that returns **403** if `request.auth.role` is not in the allowed list.

**Locations:**

- Request typing: [backend/src/types/fastify.d.ts](../backend/src/types/fastify.d.ts)
- Middleware: [backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts)
- Example routes: [backend/src/routes/me.ts](../backend/src/routes/me.ts)

### Routes (authenticated)

| Method | Path | preHandler | Description |
|--------|------|------------|-------------|
| `GET` | `/api/me` | `authenticate` | Returns current **active** user and tenant from DB (validates JWT user still exists and tenant is active). |
| `GET` | `/api/admin/tenant` | `authenticate`, `requireRoles('admin')` | Full tenant row for the JWT’s `tenantId` — **admin only**; waiters receive `403`. |

Public routes remain under `/api/auth/*` (no Bearer token).

### Frontend: session check and role-based nav

- **`getMe()`** — [frontend/src/services/api.ts](../frontend/src/services/api.ts) calls `GET /api/me` so the UI can refresh `tenant` / `user` from the server and detect invalid/expired tokens (**401** clears local storage).
- **Sidebar** — [frontend/src/components/layout/Sidebar.tsx](../frontend/src/components/layout/Sidebar.tsx) shows sections by `role` (`admin` sees Dashboard, Staff, Reports, Settings; `waiter` sees Orders, Tables, Menu — no Dashboard; `kitchen` sees Orders only). Driven by [navByRole.ts](../frontend/src/constants/navByRole.ts). This is **UX only**; the API must enforce RBAC on every sensitive endpoint.
- **Section guard** — [frontend/src/App.tsx](../frontend/src/App.tsx) resets the active section if the current role is not allowed to view it (e.g. stale tabs).

### cURL examples

```bash
# Current user (any valid role)
curl -s http://localhost:4000/api/me \
  -H "Authorization: Bearer YOUR_JWT"

# Tenant details (admin only)
curl -s http://localhost:4000/api/admin/tenant \
  -H "Authorization: Bearer YOUR_JWT"
```

### Testing a non-admin role

Sign up creates an **admin** user. To try waiter UI/API behavior locally, update the user in the database, e.g. set `role = 'waiter'` for that row in `User`, then log in again (or refresh after `getMe()` syncs role from DB if you only changed the DB).

---

## Password Hashing

**Location:** [backend/src/lib/hash.ts](../backend/src/lib/hash.ts)

```typescript
// Hash a plaintext password
hashPassword(password) → bcrypt hash

// Verify a plaintext password against a hash
comparePassword(password, hash) → boolean
```

**Security details:**
- Using bcrypt with 12 salt rounds (industry standard)
- Passwords are never stored in plaintext
- Hashing is performed server-side only

---

## Frontend Auth Implementation

### 1. API Client

**Location:** [frontend/src/services/api.ts](../frontend/src/services/api.ts)

**What it does:**
- Creates an Axios instance pointed at the backend
- Automatically injects the JWT token in every request header
- Handles auth requests (signup, login) and `getMe()` for session validation

```typescript
// Every outgoing request gets:
Authorization: `Bearer ${token}`
```

### 2. Auth Store (State Management)

**Location:** [frontend/src/store/authStore.ts](../frontend/src/store/authStore.ts)

**Functions:**
```typescript
saveAuthData(auth)    // Save token + user info to localStorage
getAuthData()         // Retrieve saved auth from localStorage
logout()              // Clear auth (localStorage removal)
```

**localStorage keys:**
- `dineops_auth` — Full auth object (token, tenant, user)
- `dineops_token` — Just the JWT token (for header injection)

### 3. Login Form

**Location:** [frontend/src/modules/auth/Login.tsx](../frontend/src/modules/auth/Login.tsx)

**On submit:**
1. User enters email + password
2. Calls `login()` API function
3. Saves returned auth data via `saveAuthData()`
4. Triggers parent callback to update UI

### 4. Signup Form

**Location:** [frontend/src/modules/auth/SignUp.tsx](../frontend/src/modules/auth/SignUp.tsx)

**On submit:**
1. User enters restaurant name, email, password
2. Calls `signup()` API function
3. Backend creates Tenant + User
4. Saves returned auth data via `saveAuthData()`
5. Triggers parent callback to show dashboard

### 5. App Root

**Location:** [frontend/src/App.tsx](../frontend/src/App.tsx)

**On mount (when a token exists):**
1. Calls `getMe()` to validate the JWT against `GET /api/me`
2. On success, refreshes stored `tenant` and `user` (including `role`) from the server
3. On **401**, clears auth and returns to login
4. Resets the active sidebar section if the user’s role may not view it

---

## Multi-Tenancy Data Isolation

### How it works

**Backend:** Every API call will eventually include tenant middleware that:
1. Extracts `tenantId` from the JWT
2. Passes it through to database queries
3. Queries automatically filter by `tenantId` (in a future step)

**Prisma:** Currently using a basic approach; later we'll add a Prisma extension:
```typescript
// Future: Automatic tenant scoping
prisma.tenant.$extends({
  query: {
    $allModels: {
      async $allOperations({ query, args }) {
        args.where = { ...args.where, tenantId }
        return query(args)
      }
    }
  }
})
```

This ensures:
- Restaurant A can never see Restaurant B's orders
- Users can only access their own tenant's data
- Queries are scoped at the database level (not just application level)

---

## Billing and receipts (domain)

### Overview

After an order reaches **`served`**, **admin** and **waiter** roles can create a **Bill** (one per order), view a **plaintext receipt** (`receiptText`), print from the browser, and **mark paid** (sets `paidAt` and frees the table). **Kitchen** cannot access billing APIs.

### Backend

| Piece | Location |
|------|----------|
| Schema | [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) — `Bill` model, `Order.bill` |
| Receipt string | [`backend/src/lib/receiptText.ts`](../backend/src/lib/receiptText.ts) — `buildReceiptText` |
| HTTP routes | [`backend/src/routes/bills.ts`](../backend/src/routes/bills.ts) — `POST /api/bills`, `GET /api/bills/:id`, `PATCH /api/bills/:id/pay` |
| Order payloads | [`backend/src/routes/orders.ts`](../backend/src/routes/orders.ts) — optional `bill` on list/create/patch |
| Analytics | [`backend/src/routes/analytics.ts`](../backend/src/routes/analytics.ts) — revenue from **paid** bills |

### Frontend

- **[`frontend/src/services/api.ts`](../frontend/src/services/api.ts)** — `createBill`, `fetchBill`, `payBill`; `OrderDto.bill`
- **[`frontend/src/modules/orders/Orders.tsx`](../frontend/src/modules/orders/Orders.tsx)** — billing modal, print, mark paid
- **[`frontend/src/utils/printPlainText.ts`](../frontend/src/utils/printPlainText.ts)** — `window.print()` via hidden iframe

### Operational note

After pulling schema changes, run **`npx prisma generate`** in `backend/` (or **`npm install`**, which runs **`postinstall`**) and restart the API so `include: { bill: true }` matches the generated client.

**Full API and schema detail:** [`DOCUMENTATION.md`](../DOCUMENTATION.md).

---

## Database Schema

### Tenant Model

```sql
CREATE TABLE "Tenant" (
  id         UUID PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  ownerEmail VARCHAR(255) UNIQUE NOT NULL,
  tier       VARCHAR(20) DEFAULT 'free',
  isActive   BOOLEAN DEFAULT true,
  createdAt  TIMESTAMP DEFAULT now()
);
```

### User Model

```sql
CREATE TABLE "User" (
  id           UUID PRIMARY KEY,
  tenantId     UUID NOT NULL REFERENCES "Tenant"(id),
  email        VARCHAR(255) NOT NULL,
  passwordHash TEXT NOT NULL,
  role         VARCHAR(20) DEFAULT 'admin',
  isActive     BOOLEAN DEFAULT true,
  createdAt    TIMESTAMP DEFAULT now(),
  
  UNIQUE(tenantId, email),
  INDEX(tenantId)
);
```

**Key constraint:** `UNIQUE(tenantId, email)` allows the same email across different tenants but prevents duplicates within a tenant.

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/dineops
JWT_SECRET=your-secret-key-replace-this-in-production
PORT=4000
```

### Frontend (.env or .env.local)

```env
VITE_API_URL=http://localhost:4000/api
```

---

## Security Checklist

- [x] Passwords hashed with bcrypt (cost 12)
- [x] JWTs expiring after 7 days
- [x] Tenant ID extracted from JWT (can't be spoofed by client)
- [x] CORS configured to allow frontend origin
- [x] Environment variables for secrets (not hardcoded)
- [x] Protected routes verify JWT; role-gated routes enforce RBAC (`requireRoles`)
- [x] `/api/me` re-validates user + tenant active state in the database
- [ ] HTTPS in production
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after N failed login attempts
- [ ] Email verification for signup
- [ ] Prisma tenant-scoped client extension (auto-inject `tenantId` on all queries)

---

## Testing the Auth System

### 1. Test Signup

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "My Pizza Place",
    "ownerEmail": "owner@pizza.com",
    "password": "secure123"
  }'
```

**Expected response:**
```json
{
  "token": "eyJ...",
  "tenant": { "id": "...", "name": "My Pizza Place" },
  "user": { "id": "...", "email": "owner@pizza.com", "role": "admin" }
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@pizza.com",
    "password": "secure123"
  }'
```

**Same response structure as signup.**

### 3. Test Protected Route — current user

```bash
curl -X GET http://localhost:4000/api/me \
  -H "Authorization: Bearer eyJ..."
```

**Expected:** JSON with `tenant` and `user` (or **401** if token invalid/expired).

### 4. Test Admin-only route

```bash
curl -X GET http://localhost:4000/api/admin/tenant \
  -H "Authorization: Bearer eyJ..."
```

**Expected:** Tenant payload for **admin** JWT; **403** for `waiter` / `kitchen` roles.

---

## Next Steps

1. **Prisma tenant extension** — Auto-inject `tenantId` into all queries and creates (see Multi-Tenancy section)
2. **Payment integrations** — UPI/card capture while keeping `Bill` as the source of truth
3. **QR / public ordering** — `source: qr` flows and unauthenticated or token-lite APIs
4. **Session hardening** — Refresh tokens, optional server-side blocklist for logout
5. **Email verification** — Confirm email on signup
6. **Password reset** — Allow users to reset forgotten passwords

---

## File Structure Reference

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts             ← Signup & login
│   │   ├── me.ts               ← GET /me, GET /admin/tenant (protected)
│   │   ├── staff.ts            ← Staff CRUD (admin)
│   │   ├── tables.ts, menu.ts, orders.ts, bills.ts, analytics.ts
│   │   └── ...
│   ├── lib/
│   │   ├── receiptText.ts      ← Plain-text receipt builder
│   │   └── ...
│   └── server.ts
├── prisma/
│   └── schema.prisma           ← Includes Bill, Order.bill
└── package.json                ← postinstall: prisma generate

frontend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── orders/             ← Billing UI
│   │   └── ...
│   ├── utils/
│   │   ├── money.ts
│   │   └── printPlainText.ts
│   └── services/
│       └── api.ts              ← Bills endpoints
└── ...
```


---

**Last Updated:** May 1, 2026  
**Status:** Auth + RBAC + tables, menu, orders, **billing/receipts**, analytics (paid-bill revenue). See **`DOCUMENTATION.md`** for the full system spec.


