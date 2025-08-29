// @ts-nocheck
// This repo is backend-first. We disable TS checking here to avoid needing React DOM types.

export default function Page() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        padding: 24,
        maxWidth: 880,
        margin: "0 auto",
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Backend API is running</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        This repository is now a standalone backend (Node.js + Express + Prisma + PostgreSQL). The page below is only
        here to satisfy the preview environment.
      </p>

      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
        <p style={{ fontWeight: 600, margin: "0 0 8px" }}>Quick start:</p>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>Set DATABASE_URL and JWT_SECRET (see backend/.env.example)</li>
          <li>npx prisma generate</li>
          <li>npx prisma migrate dev --name init</li>
          <li>npm run dev (or: node backend/app.mjs)</li>
        </ol>
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ fontWeight: 600, margin: "0 0 8px" }}>Sample endpoints (default PORT=4000):</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>GET http://localhost:4000/api/kits</li>
          <li>GET http://localhost:4000/api/courses</li>
          <li>POST http://localhost:4000/api/auth/register</li>
          <li>POST http://localhost:4000/api/auth/login</li>
        </ul>
      </div>
    </main>
  )
}
