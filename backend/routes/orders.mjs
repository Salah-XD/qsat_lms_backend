import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.mjs'
import { authenticateToken } from '../middleware/auth.mjs'

const router = express.Router()

const createOrderSchema = z.object({
  kitId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10).default(1),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
})

router.post('/', authenticateToken, async (req, res) => {
  const input = createOrderSchema.parse(req.body)

  const kit = await prisma.kit.findUnique({ where: { id: input.kitId }, select: { id: true, name: true, price: true, isActive: true } })
  if (!kit) return res.status(404).json({ success: false, message: 'Kit not found' })
  if (!kit.isActive) return res.status(400).json({ success: false, message: 'Kit is not available for purchase' })

  const subtotal = Number(kit.price) * input.quantity
  const tax = subtotal * 0.18
  const shipping = subtotal > 2000 ? 0 : 150
  const total = subtotal + tax + shipping

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      kitId: kit.id,
      quantity: input.quantity,
      subtotal,
      tax,
      shipping,
      total,
      status: 'pending',
      shippingAddress: input.shippingAddress,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order: {
        id: order.id,
        kitId: order.kitId,
        kitName: kit.name,
        quantity: order.quantity,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        status: order.status,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      },
    },
  })
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
})

router.get('/', authenticateToken, async (req, res) => {
  const { page, limit, status } = listQuerySchema.parse(req.query)
  const where = { userId: req.user.id, ...(status ? { status } : {}) }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { kit: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      orders: orders.map((o) => ({
        id: o.id,
        kit: o.kit ? { id: o.kit.id, name: o.kit.name, imageUrl: o.kit.imageUrl } : null,
        quantity: o.quantity,
        subtotal: o.subtotal,
        tax: o.tax,
        shipping: o.shipping,
        total: o.total,
        status: o.status,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    },
  })
})

router.get('/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id)
  const o = await prisma.order.findFirst({
    where: { id, userId: req.user.id },
    include: { kit: true },
  })
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' })

  res.json({
    success: true,
    data: {
      order: {
        id: o.id,
        kit: o.kit
          ? { id: o.kit.id, name: o.kit.name, imageUrl: o.kit.imageUrl, description: o.kit.description }
          : null,
        quantity: o.quantity,
        subtotal: o.subtotal,
        tax: o.tax,
        shipping: o.shipping,
        total: o.total,
        status: o.status,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      },
    },
  })
})

export default router
