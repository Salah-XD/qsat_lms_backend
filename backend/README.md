# QSat eKL Backend (Express + Prisma)

- Tech: Node.js (ESM), Express, Prisma (PostgreSQL), Zod, Helmet, CORS, JWT.
- Env:
  - DATABASE_URL=postgres://user:pass@host:5432/db
  - JWT_SECRET=replace_me
  - JWT_EXPIRES_IN=7d
  - CORS_ORIGIN=http://localhost:3000

API routes (prefix: /api):
- Auth: POST /auth/register, POST /auth/login, GET /auth/profile
- Kits: GET /kits?search=&category=&difficulty=&sortBy=&page=&limit=&tags=
- Kits: GET /kits/meta/categories, GET /kits/:id
- Courses: GET /courses (same filters), GET /courses/meta/categories, GET /courses/:id
- Orders: POST /orders, GET /orders, GET /orders/:id
- Users: GET /users/dashboard

Prisma:
- Schema at prisma/schema.prisma
- Seed script at backend/scripts/seed.mjs

## Environment Variables

Prisma loads DATABASE_URL from either:
- The project root .env (when you run commands from the root), or
- prisma/.env (always auto-loaded because it sits next to schema.prisma)

If you see `P1012 Environment variable not found: DATABASE_URL`, do one of:
1) Copy your root .env to prisma/.env, or
2) Run Prisma commands from the repo root, or
3) Pass the URL inline for a single command:

Windows (PowerShell):
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qsatlms?schema=public"; npx prisma migrate dev --name init

macOS/Linux:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qsatlms?schema=public" npx prisma migrate dev --name init

We also honor `DEBUG_PRISMA=true` to print query logs.

Quickstart:
1) Set env vars (DATABASE_URL, JWT_SECRET, CORS_ORIGIN).
2) Generate and migrate: npx prisma generate && npx prisma migrate deploy (or dev).
3) Seed (optional): node backend/scripts/seed.mjs
4) Start API: node backend/app.mjs
