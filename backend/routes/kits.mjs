import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.mjs'

const router = express.Router()

const listQuerySchema = z.object({
  search: z.string().optional().default(''),
  category: z.string().optional().default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().or(z.literal('All')).optional(),
  sortBy: z.enum(['popular', 'price_low', 'price_high', 'rating', 'newest']).optional().default('popular'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((t) => t.trim()).filter(Boolean) : [])),
})

router.get('/', async (req, res) => {
  const { search, category, difficulty, sortBy, page, limit, tags } = listQuerySchema.parse(req.query)

  const where = {
    isActive: true,
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }
      : {}),
    ...(category && category !== 'All' ? { category } : {}),
    ...(difficulty && difficulty !== 'All' ? { difficulty } : {}),
    ...(tags?.length
      ? {
          tags: {
            some: {
              tag: { name: { in: tags } },
            },
          },
        }
      : {}),
  }

  let orderBy = [{ updatedAt: 'desc' }]
  switch (sortBy) {
    case 'price_low':
      orderBy = [{ price: 'asc' }]
      break
    case 'price_high':
      orderBy = [{ price: 'desc' }]
      break
    case 'rating':
      // Approximate via review average; Prisma can’t sort by aggregation in list easily without a queryRaw; we sort by updatedAt and compute rating in response
      orderBy = [{ updatedAt: 'desc' }]
      break
    case 'newest':
      orderBy = [{ createdAt: 'desc' }]
      break
    default:
      // popular: proxy using memberCount and orders count later
      orderBy = [{ memberCount: 'desc' }, { updatedAt: 'desc' }]
  }

  const [items, total] = await Promise.all([
    prisma.kit.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
        reviews: { select: { rating: true } },
        orders: { select: { id: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kit.count({ where }),
  ])

  const kits = items.map((k) => {
    const rating =
      k.reviews.length > 0
        ? Number((k.reviews.reduce((s, r) => s + r.rating, 0) / k.reviews.length).toFixed(1))
        : 0
    const totalOrders = k.orders.length
    return {
      id: k.id,
      name: k.name,
      description: k.description,
      price: Number(k.price), // ensure number in JSON
      originalPrice: k.originalPrice != null ? Number(k.originalPrice) : null,
      category: k.category,
      difficulty: k.difficulty,
      duration: k.duration,
      modules: k.modules,
      imageUrl: k.imageUrl ?? k.images.find((i) => i.isPrimary)?.url ?? null,
      features: k.features,
      rating,
      totalOrders,
      tags: k.tags.map((t) => t.tag.name),
      memberCount: k.memberCount,
      members: k.memberCount, // alias for spec parity
      createdAt: k.createdAt,
    }
  })

  res.json({
    success: true,
    data: {
      kits,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    },
  })
})

router.get('/meta/categories', async (_req, res) => {
  // Use queryRaw for group-by with counts efficiently
  const categories = await prisma.$queryRawUnsafe(`
    SELECT category, COUNT(*)::int as count
    FROM kits
    WHERE "isActive" = true
    GROUP BY category
    ORDER BY count DESC
  `)
  res.json({ success: true, data: { categories } })
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const kit = await prisma.kit.findFirst({
    where: { id, isActive: true },
    include: {
      images: { orderBy: { order: 'asc' } },
      tags: { include: { tag: true } },
      reviews: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      orders: { select: { id: true } },
    },
  })
  if (!kit) return res.status(404).json({ success: false, message: 'Kit not found' })

  const avg = kit.reviews.length
    ? Number((kit.reviews.reduce((s, r) => s + r.rating, 0) / kit.reviews.length).toFixed(1))
    : 0

  res.json({
    success: true,
    data: {
      kit: {
        id: kit.id,
        name: kit.name,
        description: kit.description,
        price: Number(kit.price), // number
        originalPrice: kit.originalPrice != null ? Number(kit.originalPrice) : null,
        category: kit.category,
        difficulty: kit.difficulty,
        duration: kit.duration,
        modules: kit.modules,
        imageUrl: kit.imageUrl ?? kit.images.find((i) => i.isPrimary)?.url ?? null,
        features: kit.features,
        specifications: kit.specifications,
        whatIncludes: kit.whatIncludes,
        rating: avg,
        reviewCount: kit.reviews.length,
        totalOrders: kit.orders.length,
        tags: kit.tags.map((t) => t.tag.name),
        memberCount: kit.memberCount,
        members: kit.memberCount, // alias for spec parity
        createdAt: kit.createdAt,
      },
      reviews: kit.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          name: `${r.user.firstName} ${r.user.lastName}`,
          avatarUrl: r.user.avatarUrl,
        },
      })),
    },
  })
})

export default router
