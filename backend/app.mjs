import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import kitsRouter from './routes/kits.mjs'
import coursesRouter from './routes/courses.mjs'
import ordersRouter from './routes/orders.mjs'
import authRouter from './routes/auth.mjs'
import usersRouter from './routes/users.mjs'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin:
      (process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
        : ['http://localhost:3000']),
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

const healthHandler = (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' })
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'QSAT LMS API',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    endpoints: [
      '/api/health',
      '/api/kits',
      '/api/courses',
      '/api/orders',
      '/api/users',
      '/api/auth/register',
      '/api/auth/login',
    ],
  })
})

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

app.use('/api/auth', authRouter)
app.use('/api/kits', kitsRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/users', usersRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
})

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[v0] Unhandled error:', err)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

// Start server only when executed directly (optional)
if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 4000
  app.listen(port, () => {
    console.log(`[v0] API listening on http://localhost:${port}`)
  })
}

export default app
