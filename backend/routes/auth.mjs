import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.mjs'
import { authenticateToken } from '../middleware/auth.mjs'
import { validateRequest } from '../middleware/validation.mjs'
import { SignJWT } from 'jose'

const router = express.Router()

const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).*$/, 'Weak password'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const generateToken = async (userId) => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(secret)
}

router.post('/register', validateRequest(registerSchema), async (req, res) => {
  const { firstName, lastName, email, password } = req.body
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return res.status(400).json({ success: false, message: 'User with this email already exists' })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { firstName, lastName, email: email.toLowerCase(), passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
  })

  const token = await generateToken(user.id)
  res.status(201).json({ success: true, message: 'User registered successfully', data: { user, token } })
})

router.post('/login', validateRequest(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' })

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })

  const token = await generateToken(user.id)
  const payload = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
  res.json({ success: true, message: 'Login successful', data: { user: payload, token } })
})

router.get('/profile', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      bio: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      lastLogin: true,
    },
  })
  res.json({ success: true, data: { user } })
})

export default router
