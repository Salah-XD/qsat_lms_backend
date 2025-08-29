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
      orderBy = [{ updatedAt: 'desc' }]
      break
    case 'newest':
      orderBy = [{ createdAt: 'desc' }]
      break
    default:
      // popular proxy via enrollments count
      orderBy = [{ updatedAt: 'desc' }]
  }

  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        instructor: true,
        reviews: { select: { rating: true } },
        enrollments: { select: { id: true } },
        tags: { include: { tag: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.course.count({ where }),
  ])

  const courses = items.map((c) => {
    const rating =
      c.reviews.length > 0 ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1)) : 0
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      price: Number(c.price), // ensure number
      category: c.category,
      difficulty: c.difficulty,
      duration: c.duration,
      modules: c.modules,
      imageUrl: c.imageUrl,
      isPremium: c.isPremium,
      rating,
      totalEnrollments: c.enrollments.length,
      instructor: c.instructor
        ? {
            name: `${c.instructor.firstName} ${c.instructor.lastName}`,
            bio: c.instructor.bio,
            avatarUrl: c.instructor.avatarUrl,
          }
        : null,
      tags: c.tags.map((t) => t.tag.name),
      createdAt: c.createdAt,
    }
  })

  res.json({
    success: true,
    data: {
      courses,
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
  const categories = await prisma.$queryRawUnsafe(`
    SELECT category, COUNT(*)::int as count
    FROM courses
    WHERE "isActive" = true
    GROUP BY category
    ORDER BY count DESC
  `)
  res.json({ success: true, data: { categories } })
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const c = await prisma.course.findFirst({
    where: { id, isActive: true },
    include: {
      instructor: true,
      moduleList: { orderBy: { orderIndex: 'asc' } },
      reviews: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      enrollments: true,
      tags: { include: { tag: true } },
    },
  })
  if (!c) return res.status(404).json({ success: false, message: 'Course not found' })

  const rating = c.reviews.length
    ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1))
    : 0

  res.json({
    success: true,
    data: {
      course: {
        id: c.id,
        name: c.name,
        description: c.description,
        price: Number(c.price), // ensure number
        category: c.category,
        difficulty: c.difficulty,
        duration: c.duration,
        modules: c.modules,
        imageUrl: c.imageUrl,
        isPremium: c.isPremium,
        whatYouLearn: c.whatYouLearn,
        requirements: c.requirements,
        rating,
        reviewCount: c.reviews.length,
        totalEnrollments: c.enrollments.length,
        instructor: c.instructor
          ? {
              name: `${c.instructor.firstName} ${c.instructor.lastName}`,
              bio: c.instructor.bio,
              avatarUrl: c.instructor.avatarUrl,
            }
          : null,
        tags: c.tags.map((t) => t.tag.name),
        createdAt: c.createdAt,
      },
      modules: c.moduleList.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        duration: m.duration,
        videoUrl: m.videoUrl,
        orderIndex: m.orderIndex,
        isFree: m.isFree,
      })),
      reviews: c.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: { name: `${r.user.firstName} ${r.user.lastName}`, avatarUrl: r.user.avatarUrl },
      })),
    },
  })
})

export default router
