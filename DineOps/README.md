# DineOps Authentication MVP

This repo includes a minimal full-stack login/signup implementation for a multi-tenant app.

## Backend

1. Copy `.env.example` to `backend/.env`.
2. Set `DATABASE_URL` for PostgreSQL and `JWT_SECRET`.
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Run database migrations manually or use `npx prisma db push`.
6. Start the backend:
   ```bash
   npm run dev
   ```

The backend exposes:
- `POST /api/auth/signup`
- `POST /api/auth/login`

## Frontend

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend:
   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5173` and talks to the backend at `http://localhost:4000/api`.

## What’s implemented

- Signup creates a restaurant tenant and an admin user
- Login validates email/password and returns a JWT
- Local storage keeps auth state on the client
- Axios sends the JWT automatically on requests

## Notes

- This is a scaffold only. You can extend it with tenant middleware, RBAC, and protected routes next.
