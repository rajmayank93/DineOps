# DineOps — Smart Restaurant Operating System
### Multi-Tenant SaaS Platform | Complete Project Reference

> **Version:** 1.0 | **Status:** Pre-development | **Last updated:** April 2026
> Drop this file in your project root. It is the single source of truth for the entire DineOps product.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [Target Users & Roles](#4-target-users--roles)
5. [Core Features](#5-core-features)
6. [SDE-2 Level Enhancements](#6-sde-2-level-enhancements)
7. [Tech Stack](#7-tech-stack)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Backend Architecture](#9-backend-architecture)
10. [Multi-Tenancy Architecture](#10-multi-tenancy-architecture)
11. [Database Schema](#11-database-schema)
12. [Real-Time Architecture](#12-real-time-architecture)
13. [Order State Machine](#13-order-state-machine)
14. [Role-Based Access Control](#14-role-based-access-control)
15. [Subscription Tiers](#15-subscription-tiers)
16. [API Reference](#16-api-reference)
17. [Delivery Milestones](#17-delivery-milestones)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Open Questions](#19-open-questions)
20. [Glossary](#20-glossary)

---

## 1. Project Overview

**DineOps** is a multi-tenant SaaS platform that gives any restaurant a unified digital operating system. A restaurant owner signs up, creates a profile, and their entire team — waiters, kitchen staff, and managers — immediately gets a purpose-built, role-aware interface that stays in sync in real time.

### What makes this powerful

- **Multi-tenant by design** — every restaurant's data is completely isolated; one platform serves thousands of restaurants simultaneously
- **Real-time everywhere** — order placed by waiter appears in kitchen instantly via WebSockets; kitchen status changes push to floor view via SSE
- **Business-level thinking** — not just UI, but a full operating system with billing, analytics, versioned menus, and subscription tiers
- **SDE-2 grade engineering** — optimistic UI, offline queue, RBAC, config-driven menus, tenant middleware

> "This is like a real startup product" — the kind of project that stands out in engineering interviews and portfolios.

---

## 2. Problem Statement

Restaurants are highly time-sensitive, coordination-heavy environments. Current tools fail in these specific ways:

| Pain point | Impact |
|---|---|
| Verbal order communication at peak hours | Missed and wrong orders |
| No unified system (POS, kitchen, billing are separate) | No shared state, constant context-switching |
| Zero real-time visibility for managers | No floor overview, no live kitchen queue |
| No digital order history | No analytics, no optimisation possible |
| High onboarding friction for digital tools | Expensive hardware or IT setup required |

---

## 3. Product Vision & Goals

> **Vision:** "Make any restaurant as operationally efficient as a top-tier chain, from day one, with zero hardware required."

### Success Metrics

| Metric | Target |
|---|---|
| Onboarding time | < 10 minutes from signup to first order |
| Order-to-kitchen latency | < 500ms (WebSocket p95) |
| Kitchen status update | < 300ms (SSE p95) |
| Platform uptime | 99.9% monthly SLA |
| Cross-tenant data leakage | Zero (automated audit on every CI build) |
| Offline order sync success | 100% on reconnect |

---

## 4. Target Users & Roles

| User | Role | Primary pain point |
|---|---|---|
| Restaurant owner / admin | Business operator | No unified view of operations and revenue |
| Waiter / floor staff | Order taker | Slow, error-prone order relay to kitchen |
| Kitchen staff / chef | Food preparer | No structured queue; verbal updates are unreliable |
| Customer (QR flow) | Diner | Waiting for waiter at busy tables |

---

## 5. Core Features

### 5.1 Restaurant Onboarding
- Signup with restaurant profile (name, cuisine type, owner email)
- Each restaurant gets a unique `tenantId` — full data isolation from day one
- Subscription tier selection: **Free** (up to 5 tables) or **Pro** (unlimited)
- Auto-creation of admin account on signup

### 5.2 Table Management
- Create tables with labels (T1, T2, Window Seat 3, etc.) and capacity
- Visual floor map with real-time colour-coded status:
  - 🟢 **Empty** — available
  - 🟡 **Occupied** — active order in progress
  - 🔴 **Bill Pending** — order served, awaiting payment
- Auto-generated QR code per table (links to customer ordering view)
- Admin can add, edit, and delete tables (Free tier capped at 5)

### 5.3 Order Management (Core)
- Waiter selects a table, browses menu by category, adds items
- Adjust quantities, remove items, add per-item notes ("no onions")
- Optimistic UI — order appears instantly before API confirmation
- If API fails, optimistic update is rolled back with clear error message
- Each order line item snapshots `menuVersion`, `unit_price`, and `item_name` at time of placement

### 5.4 Kitchen Dashboard
- Live order queue sorted by table and time received
- Each order card shows: table number, items, notes, and time elapsed
- Kitchen staff progresses orders through the state machine (see Section 13)
- Orders in **Preparing** state for > 15 minutes are highlighted in red
- Status changes push to all connected clients in < 300ms via SSE

### 5.5 Billing System
- Generate itemised bill: item breakdown, subtotal, configurable tax %, total
- Pricing uses the `menuVersion` captured at order time — immune to menu changes
- Mark as paid → table resets to Empty automatically
- Paid bills are archived (never deleted) for analytics and audit
- PDF bill export (Pro tier)

### 5.6 Admin Analytics Dashboard
- Total revenue today, total orders, average order value
- Top 5 items by quantity and revenue contribution
- Hourly order volume chart for the current day
- Date-range filtering (Pro tier)
- All queries strictly scoped to the current tenant

### 5.7 QR Table Ordering *(new addition)*
- Customer scans QR code at their table — no app, no login required
- Sees the live menu with categories, items, prices, and descriptions
- Places order directly; it appears in the kitchen queue immediately
- Waiter is notified on the floor view when a QR order is submitted
- Enabled on Pro tier only

### 5.8 Config-Driven Menu Management *(new addition)*
- Admin creates categories and assigns items (name, description, price, image, availability toggle)
- Saving menu changes atomically increments `menuVersion`
- In-flight orders are **never affected** by menu changes — they carry a frozen version snapshot
- Menu updates reflect on the QR ordering page within 5 seconds

---

## 6. SDE-2 Level Enhancements

These are the details that separate a portfolio project from a production system.

### 🔥 Optimistic UI
Order appears in the UI instantly before the API responds. If the API call fails, the UI rolls back and shows a clear error. Implemented via React Query's `onMutate` + `onError` mutation lifecycle.

### 🔥 Offline Support
If the device loses network connectivity, orders are saved to **IndexedDB** via the `idb` library. When connectivity is restored, the offline queue syncs automatically. An offline badge is shown on order cards captured offline.

### 🔥 Real-Time Sync
- **WebSockets** for bidirectional waiter ↔ kitchen coordination (order placement, modifications)
- **SSE (Server-Sent Events)** for server → kitchen display pushes (status transitions)
- **Redis pub/sub** as the WebSocket message broker — required for horizontal scaling across multiple server instances

### 🔥 Role-Based Access Control
JWT carries both `tenantId` and `role`. A `useTenant` hook and route guards enforce permissions at the component level. Server-side RBAC validates on every request — client enforcement is UX only.

### 🔥 Menu Versioning
`menuVersion` is an integer incremented on every menu save. Every order and order item snapshots the version at placement time. Billing uses the snapshot — not the live menu. This is the detail that makes the billing system production-safe.

### 🔥 Tenant Middleware
A global Prisma client extension auto-injects `tenantId` into every query's `WHERE` clause and every `CREATE`'s `data`. No query reaches the database without a tenant scope. The `tenantId` comes from the JWT — clients cannot override it.

### 🔥 `useTenant` Hook
```typescript
// src/hooks/useTenant.ts
import { useAuthStore } from '@/store/authStore'

export function useTenant() {
  const { tenantId, role } = useAuthStore()
  return { tenantId, role, isAdmin: role === 'admin' }
}

// Every API call automatically gets the tenant header:
// api.defaults.headers['X-Tenant-ID'] = tenantId
```
This is the interview moment — it shows the architecture is not an afterthought.

---

## 7. Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework with full type safety |
| Zustand | Lightweight client state (UI + offline queue) |
| TanStack React Query | Server state, API cache, optimistic mutations |
| react-hook-form + zod | Type-safe form validation |
| Tailwind CSS | Utility-first styling |
| WebSockets (native) | Bidirectional real-time (waiter ↔ kitchen) |
| SSE (EventSource API) | Server-push kitchen status updates |
| idb | IndexedDB wrapper for offline order queue |
| Vite | Build tooling with fast HMR |

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Fastify | REST API server, async I/O |
| PostgreSQL | Primary data store with row-level tenant isolation |
| Redis | WebSocket pub/sub + session cache |
| Prisma ORM | Type-safe queries, tenant middleware extension |
| JWT | Stateless auth with `tenantId` + `role` in payload |
| bcrypt (cost 12) | Password hashing |

---

## 8. Frontend Architecture

```
src/
├── modules/
│   ├── auth/              ← JWT handling, tenant context, role guards
│   ├── orders/            ← Optimistic mutations, offline queue integration
│   ├── tables/            ← Floor map, status state machine
│   ├── kitchen/           ← SSE consumer, order queue display
│   ├── billing/           ← Bill generation, payment, table reset
│   ├── menu/              ← Versioned config, category management
│   ├── qr/                ← Customer-facing ordering (no auth required)
│   └── analytics/         ← Admin dashboard, charts
│
├── components/            ← Shared UI primitives (Button, Badge, Card, Modal)
│
├── hooks/
│   ├── useTenant.ts       ← Injects tenantId into every API call
│   ├── useSocket.ts       ← WebSocket connection lifecycle + reconnect
│   ├── useSSE.ts          ← SSE subscription management
│   ├── useOfflineQueue.ts ← IndexedDB read/write helpers
│   └── useOrderMutation.ts← Optimistic order placement + rollback
│
├── services/
│   ├── api.ts             ← Axios instance with tenant header interceptor
│   └── socket.ts          ← WS + SSE client factories
│
├── store/                 ← Zustand slices per domain
│   ├── authStore.ts
│   ├── orderStore.ts
│   └── offlineStore.ts
│
└── utils/
    ├── offlineQueue.ts    ← IndexedDB sync logic
    └── menuVersion.ts     ← Version stamping for order line items
```

### Key architectural decisions

- **Module-first structure** — each feature is self-contained with its own components, hooks, and types
- **`useTenant` is the trust boundary** — nothing calls the API without going through it
- **Zustand for offline queue** — the queue state persists to IndexedDB and is hydrated on app load
- **React Query for all server state** — no manual loading/error state; `staleTime` tuned per entity

---

## 9. Backend Architecture

```
src/
├── routes/
│   ├── auth.ts
│   ├── tables.ts
│   ├── orders.ts
│   ├── kitchen.ts
│   ├── billing.ts
│   ├── menu.ts
│   ├── analytics.ts
│   └── qr.ts
│
├── middleware/
│   ├── tenantMiddleware.ts  ← Extracts tenantId from JWT, injects into request
│   ├── authMiddleware.ts    ← Validates JWT signature + expiry
│   └── rbacMiddleware.ts    ← Role-based route guards
│
├── lib/
│   ├── prisma.ts            ← createTenantClient(tenantId) factory
│   ├── redis.ts             ← Redis connection + pub/sub helpers
│   └── jwt.ts               ← Sign / verify helpers
│
├── services/
│   ├── orderService.ts      ← Business logic for order state transitions
│   ├── billingService.ts    ← Bill calculation with version-safe pricing
│   ├── menuService.ts       ← Menu save + atomic version increment
│   └── analyticsService.ts  ← Tenant-scoped aggregation queries
│
└── events/
    ├── socketServer.ts      ← WebSocket server + Redis pub/sub bridge
    └── sseRouter.ts         ← SSE endpoint for kitchen display
```

---

## 10. Multi-Tenancy Architecture

**Strategy:** Shared database, shared schema, row-level isolation via `tenant_id`.

### How it works

1. Restaurant signs up → unique `tenantId` (UUID) generated
2. JWT issued with `{ tenantId, role }` in payload
3. Every API request passes through `tenantMiddleware` which extracts `tenantId` from JWT
4. `createTenantClient(tenantId)` returns a Prisma client extension that:
   - Injects `WHERE tenant_id = $tenantId` on every query
   - Injects `tenant_id` into every `CREATE`
5. No query reaches Postgres without a tenant scope — ever

```typescript
// src/lib/prisma.ts
export function createTenantClient(tenantId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, model }) {
          if (model === 'Tenant') return query(args)

          // Auto-scope all reads
          args.where = { ...args.where, tenantId }

          // Auto-scope all writes
          if (args.data) {
            args.data = Array.isArray(args.data)
              ? args.data.map((d: object) => ({ ...d, tenantId }))
              : { ...args.data, tenantId }
          }

          return query(args)
        }
      }
    }
  })
}
```

### Isolation guarantees

- `tenantId` comes from JWT — clients cannot spoof it via request body
- `UNIQUE(tenant_id, email)` — same email allowed across different restaurants
- All analytics queries use tenant-scoped aggregations — no cross-tenant data in reports
- Automated CI tests run cross-tenant read/write probes on every build

---

## 11. Database Schema

### Entity Relationship

```
tenants
  ├── users            (tenant_id FK)
  ├── tables           (tenant_id FK)
  ├── menus            (tenant_id FK)
  │     └── menu_items (menu_id FK, tenant_id FK)
  ├── orders           (tenant_id FK → tables, users)
  │     ├── order_items        (order_id FK → menu_items)
  │     └── order_status_log   (order_id FK)
  └── bills            (tenant_id FK → orders)
```

### Tables

#### `tenants`
```sql
id            UUID PRIMARY KEY
name          VARCHAR(255) NOT NULL
owner_email   VARCHAR(255) UNIQUE NOT NULL
tier          VARCHAR(20)  DEFAULT 'free'   -- 'free' | 'pro'
is_active     BOOLEAN      DEFAULT true
created_at    TIMESTAMPTZ  DEFAULT now()
```

#### `users`
```sql
id              UUID PRIMARY KEY
tenant_id       UUID NOT NULL REFERENCES tenants(id)
email           VARCHAR(255) NOT NULL
password_hash   TEXT NOT NULL
role            VARCHAR(20) NOT NULL         -- 'admin' | 'waiter'
is_active       BOOLEAN DEFAULT true
UNIQUE (tenant_id, email)                    -- same email OK across tenants
INDEX  (tenant_id)
```

#### `tables`
```sql
id          UUID PRIMARY KEY
tenant_id   UUID NOT NULL REFERENCES tenants(id)
label       VARCHAR(50) NOT NULL             -- 'T1', 'Window Seat 3'
capacity    SMALLINT DEFAULT 4
status      VARCHAR(20) DEFAULT 'empty'      -- 'empty' | 'occupied' | 'bill_pending'
qr_code     TEXT UNIQUE                      -- /qr/{tenant_id}/{table_id}
UNIQUE (tenant_id, label)
INDEX  (tenant_id)
```

#### `menus`
```sql
id          UUID PRIMARY KEY
tenant_id   UUID NOT NULL REFERENCES tenants(id)
version     INTEGER NOT NULL DEFAULT 1       -- increments on every save
is_active   BOOLEAN NOT NULL DEFAULT true
saved_at    TIMESTAMPTZ DEFAULT now()
UNIQUE (tenant_id, version)
```

#### `menu_items`
```sql
id           UUID PRIMARY KEY
tenant_id    UUID NOT NULL REFERENCES tenants(id)
menu_id      UUID NOT NULL REFERENCES menus(id)
category     VARCHAR(100) NOT NULL
name         VARCHAR(255) NOT NULL
description  TEXT
price        NUMERIC(10,2) NOT NULL
image_url    TEXT
is_available BOOLEAN DEFAULT true
sort_order   SMALLINT DEFAULT 0
```

#### `orders`
```sql
id            UUID PRIMARY KEY
tenant_id     UUID NOT NULL REFERENCES tenants(id)
table_id      UUID NOT NULL REFERENCES tables(id)
placed_by     UUID REFERENCES users(id)      -- NULL for QR (customer) orders
menu_version  INTEGER NOT NULL               -- snapshot at order time
status        VARCHAR(20) DEFAULT 'draft'
source        VARCHAR(20) DEFAULT 'waiter'   -- 'waiter' | 'qr'
notes         TEXT
created_at    TIMESTAMPTZ DEFAULT now()
INDEX (tenant_id)
INDEX (table_id, status)
```

#### `order_items`
```sql
id              UUID PRIMARY KEY
order_id        UUID NOT NULL REFERENCES orders(id)
menu_item_id    UUID NOT NULL REFERENCES menu_items(id)
quantity        SMALLINT NOT NULL DEFAULT 1
unit_price      NUMERIC(10,2) NOT NULL       -- FROZEN at order time
item_name       VARCHAR(255) NOT NULL        -- FROZEN at order time
note            TEXT
```
> `unit_price` and `item_name` are **intentionally denormalised** — frozen snapshots
> so billing is always correct regardless of future menu edits.

#### `bills`
```sql
id          UUID PRIMARY KEY
tenant_id   UUID NOT NULL REFERENCES tenants(id)
order_id    UUID NOT NULL REFERENCES orders(id) UNIQUE
subtotal    NUMERIC(10,2) NOT NULL
tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 5.00
tax_amount  NUMERIC(10,2) NOT NULL
total       NUMERIC(10,2) NOT NULL
paid_at     TIMESTAMPTZ                      -- NULL until payment confirmed
created_at  TIMESTAMPTZ DEFAULT now()
INDEX (tenant_id, paid_at) WHERE paid_at IS NOT NULL
```

#### `order_status_log`
```sql
id          UUID PRIMARY KEY
order_id    UUID NOT NULL REFERENCES orders(id)
from_status VARCHAR(20)
to_status   VARCHAR(20) NOT NULL
changed_by  UUID REFERENCES users(id)        -- NULL for QR/system transitions
changed_at  TIMESTAMPTZ DEFAULT now()
```

---

## 12. Real-Time Architecture

| Channel | Direction | Use case | Implementation |
|---|---|---|---|
| WebSocket | Bidirectional | Waiter places order → kitchen and floor update instantly | `ws` library + Redis pub/sub for horizontal scale |
| SSE | Server → client | Kitchen status transitions pushed to floor view | Express `res.write` event-stream endpoint |
| Optimistic UI | Client only | Instant UI feedback before API round-trip | React Query `onMutate` + rollback `onError` |
| Offline queue | Client queue | Orders captured when network is unavailable | IndexedDB via `idb`; sync on `navigator.onLine` |

### Why SSE + WebSockets, not just WebSockets?

- **WebSockets** are bidirectional — correct for waiter-to-kitchen order sync where both sides send data
- **SSE** is simpler for one-directional pushes (server → kitchen display) — fewer connection issues, no keepalive complexity, automatic browser reconnect built in
- **Redis pub/sub** is the bridge between WebSocket server instances — without it, a waiter connected to server A and a kitchen display connected to server B would not see each other's messages

### WebSocket message flow

```
Waiter adds order
  → POST /orders (REST)
  → API publishes to Redis channel: "tenant:{tenantId}:orders"
  → All WS clients subscribed to that channel receive the event
  → Kitchen dashboard re-renders with new order
  → Floor map updates table status badge
```

### Offline queue flow

```
Device goes offline
  → navigator.onLine = false
  → Offline badge shown on UI
  → Orders written to IndexedDB queue

Device comes back online
  → navigator.onLine fires
  → offlineQueue.ts reads all pending entries
  → Replays them as POST /orders in sequence
  → Clears IndexedDB on success
```

---

## 13. Order State Machine

Every order follows a strict, linear state machine. State transitions are validated **server-side** — clients cannot skip states.

```
DRAFT
  │  Waiter confirms order
  ▼
PENDING
  │  Kitchen taps "Start preparing"
  ▼
PREPARING  ──── > 15 min ──── 🔴 highlighted
  │  Kitchen taps "Mark ready"
  ▼
READY
  │  Waiter taps "Mark served"
  ▼
SERVED
  │  Bill generated
  ▼
BILLED
  │  Admin / waiter marks as paid
  ▼
PAID → archived, table reset to Empty
```

| State | Visible to | Who can advance |
|---|---|---|
| Draft | Waiter only | Waiter (confirm order) |
| Pending | Waiter + Kitchen | Kitchen staff |
| Preparing | Waiter + Kitchen | Kitchen staff |
| Ready | Waiter + Kitchen | Waiter |
| Served | All roles | Admin / Waiter (generate bill) |
| Billed | Admin + Waiter | Admin / Waiter (mark paid) |
| Paid | Admin | System (archived) |

---

## 14. Role-Based Access Control

| Feature | Admin | Waiter | Customer (QR) |
|---|---|---|---|
| View floor map | ✅ | ✅ | ❌ |
| Create / edit tables | ✅ | ❌ | ❌ |
| Place orders | ✅ | ✅ | ✅ (via QR) |
| Modify pending orders | ✅ | ✅ | ❌ |
| View kitchen dashboard | ✅ | Read only | ❌ |
| Update kitchen status | ✅ | ❌ | ❌ |
| Generate bill | ✅ | ✅ | ❌ |
| Mark bill as paid | ✅ | ✅ | ❌ |
| Manage menu | ✅ | ❌ | ❌ |
| View analytics dashboard | ✅ | ❌ | ❌ |
| Manage staff accounts | ✅ | ❌ | ❌ |
| Change subscription tier | ✅ | ❌ | ❌ |

### JWT structure

```typescript
interface JWTPayload {
  sub: string        // userId
  tenantId: string   // restaurant UUID
  role: 'admin' | 'waiter'
  iat: number
  exp: number        // 8 hours
}
```

---

## 15. Subscription Tiers

| Feature | Free | Pro |
|---|---|---|
| Tables | Up to 5 | Unlimited |
| Menu items | Up to 20 | Unlimited |
| Staff accounts | 2 (admin + 1 waiter) | Unlimited |
| Order history | 7 days | Unlimited |
| Analytics | Today only | Full date-range |
| QR table ordering | ❌ | ✅ |
| PDF bill export | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Price | Free | ₹2,499 / month |

> Free tier limits are enforced **server-side**. Client-side enforcement is UX only and cannot be trusted.

---

## 16. API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register new tenant and admin user |
| POST | `/auth/login` | Public | Login; returns JWT |
| GET | `/tables` | Admin / Waiter | List all tables for current tenant |
| POST | `/tables` | Admin | Create a new table |
| PUT | `/tables/:id` | Admin | Edit table label or capacity |
| PUT | `/tables/:id/status` | Admin / Waiter | Update table status |
| DELETE | `/tables/:id` | Admin | Delete a table |
| GET | `/menu` | All + Public (QR) | Get current active menu (versioned) |
| PUT | `/menu` | Admin | Save menu; atomically increments version |
| POST | `/orders` | Admin / Waiter / QR | Place a new order |
| GET | `/orders?tableId=` | Admin / Waiter | Get orders for a table |
| PUT | `/orders/:id/status` | Admin / Kitchen | Advance order to next state |
| GET | `/bills/:tableId` | Admin / Waiter | Generate bill for a table |
| POST | `/bills/:id/pay` | Admin / Waiter | Mark bill as paid; reset table |
| GET | `/analytics/summary` | Admin | Daily revenue, top items, order count |
| GET | `/analytics/items` | Admin | Item-level breakdown with date range |
| GET | `/events/kitchen` | Kitchen (SSE) | SSE stream: kitchen order + status updates |
| WS | `/ws` | Admin / Waiter | WebSocket: bidirectional order sync |
| GET | `/qr/:tenantId/:tableId` | Public | Customer QR landing + menu |
| POST | `/qr/:tenantId/:tableId/order` | Public | Customer places order via QR |

---

## 17. Delivery Milestones

| Phase | Scope | Duration |
|---|---|---|
| **Phase 1 — Foundation** | Auth, multi-tenant onboarding, table CRUD, menu management | 2 weeks |
| **Phase 2 — Core flow** | Order management (optimistic UI), kitchen dashboard (SSE), real-time sync (WS) | 3 weeks |
| **Phase 3 — Billing + QR** | Bill generation, paid + reset, QR customer ordering | 2 weeks |
| **Phase 4 — Analytics + polish** | Admin dashboard, RBAC hardening, offline queue, error states | 2 weeks |
| **Phase 5 — Launch** | Security audit, load testing, onboarding docs, public launch | 1 week |

**Total: ~10 weeks**

---

## 18. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebSocket drops cause missed kitchen updates | Medium | High | SSE fallback + client reconnect with exponential backoff |
| Cross-tenant data leak via misconfigured query | Low | Critical | Global Prisma middleware; automated cross-tenant audit in CI |
| Optimistic rollback confuses waiters | Medium | Medium | Clear toast on rollback; offline badge on captured orders |
| Menu version mismatch on in-flight orders | Low | Medium | `menuVersion` snapshotted per order line item |
| Free-tier table limit bypass | Low | High | Server-side enforcement; client limit is UX only |
| QR order placed for wrong table | Medium | High | `tableId` encoded in QR and validated server-side against `tenantId` |
| WebSocket breaks when scaled to 2+ servers | Medium | High | Redis pub/sub as the WS message broker from day one |

---

## 19. Open Questions

| # | Question | Owner | Target |
|---|---|---|---|
| OQ-01 | Should customers track their order status via QR after submitting? | Product | Phase 3 planning |
| OQ-02 | Is split-billing (divide bill by person) in v1.0 or v1.1? | Product | Stakeholder review |
| OQ-03 | Flat tax % or item-level GST classification? | Legal / Finance | Pre-Phase 3 |
| OQ-04 | Should the kitchen dashboard support multiple stations (grill, fryer, cold)? | Design | Phase 2 kickoff |
| OQ-05 | Is there a requirement for a customer-facing order status screen (TV display)? | Product | Phase 4 scope review |

---

## 20. Glossary

| Term | Definition |
|---|---|
| `tenantId` | UUID assigned to each restaurant on signup. Injected into every DB query to enforce isolation. |
| `menuVersion` | Integer incremented on every menu save. Orders snapshot this to freeze prices. |
| Optimistic UI | Technique where the UI renders the expected API result before the response arrives, with rollback on failure. |
| SSE | Server-Sent Events. Unidirectional HTTP stream from server to client. Used for kitchen status pushes. |
| WebSocket | Full-duplex TCP connection. Used for bidirectional waiter ↔ kitchen order sync. |
| RBAC | Role-Based Access Control. Permissions assigned by role (Admin, Waiter) rather than per user. |
| Offline queue | IndexedDB-backed local store for orders captured when the device has no network connectivity. |
| Floor view | Waiter-facing screen showing all tables and their live status on a visual map. |
| QR flow | Customer-facing ordering experience accessed by scanning a table's unique QR code. |
| Tenant middleware | Prisma client extension that auto-injects `tenantId` into every query's WHERE clause. |
| `useTenant` | React hook that surfaces `tenantId` and `role` from the auth store and injects them into every API call. |
| `menuVersion` snapshot | Denormalised copy of `unit_price` and `item_name` on each `order_item` row, frozen at order time. |

---

*DineOps — DineOps_PROJECT.md — v1.0 — Single source of truth*