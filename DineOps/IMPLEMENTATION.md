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

// Verify a token (future use for protected routes)
verifyToken(token) → { userId, tenantId, role, iat, exp }
```

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
- Handles auth requests (signup, login)

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

**On mount:**
- Loads saved auth state from localStorage
- If auth exists, shows welcome screen + logout button
- If no auth, shows login/signup forms

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
- [ ] HTTPS in production
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after N failed login attempts
- [ ] Email verification for signup

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

### 3. Test Protected Route (future)

Once we add middleware, protected routes will require:

```bash
curl -X GET http://localhost:4000/api/tables \
  -H "Authorization: Bearer eyJ..."
```

---

## Next Steps

1. **Tenant Middleware** — Auto-inject `tenantId` into all queries
2. **Protected Routes** — Verify JWT and role on each endpoint
3. **RBAC Enforcement** — Restrict routes by role (admin, waiter, kitchen)
4. **Session Management** — Refresh tokens, logout invalidation
5. **Email Verification** — Confirm email on signup
6. **Password Reset** — Allow users to reset forgotten passwords

---

## File Structure Reference

```
backend/
├── src/
│   ├── routes/
│   │   └── auth.ts              ← Signup & login endpoints
│   ├── lib/
│   │   ├── jwt.ts               ← JWT signing/verification
│   │   ├── hash.ts              ← Password hashing
│   │   └── prisma.ts            ← Database client
│   └── server.ts                ← Fastify app setup
├── prisma/
│   └── schema.prisma            ← Database schema
└── .env                         ← Database & JWT secrets

frontend/
├── src/
│   ├── modules/
│   │   └── auth/
│   │       ├── Login.tsx         ← Login form component
│   │       └── SignUp.tsx        ← Signup form component
│   ├── services/
│   │   └── api.ts               ← Axios client with auth interceptor
│   ├── store/
│   │   └── authStore.ts         ← localStorage auth state
│   └── App.tsx                  ← Root component with auth logic
└── .env                         ← Backend API URL

```


---

**Last Updated:** April 12, 2026  
**Status:** MVP Complete — Ready for extended features


