import express from 'express'
import { authenticateToken } from '../middleware/auth.mjs'
import { prisma } from '../lib/prisma.mjs'

const router = express.Router()

router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id

  const [enrollmentAgg, orderAgg, recentEnrollments, recentOrders] = await Promise.all([
    prisma.enrollment.aggregate({
      _count: { _all: true },
      _avg: { progress: true },
      where: { userId },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.enrollment.findMany({
      where: { userId },
      include: { course: { select: { name: true, imageUrl: true } } },
      orderBy: { enrolledAt: 'desc' },
      take: 5,
    }),
    prisma.order.findMany({
      where: { userId },
      include: { kit: { select: { name: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const totalOrders = orderAgg.reduce((acc, r) => acc + r._count._all, 0)
  const delivered = orderAgg.find((r) => r.status === 'delivered')?._count._all || 0
  const pending = orderAgg.find((r) => r.status === 'pending')?._count._all || 0
  const totalSpent = Number(orderAgg.reduce((acc, r) => acc + Number(r._sum.total || 0), 0).toFixed(2))

  res.json({
    success: true,
    data: {
      stats: {
        enrollments: {
          total: enrollmentAgg._count._all,
          completed: await prisma.enrollment.count({ where: { userId, status: 'completed' } }),
          active: await prisma.enrollment.count({ where: { userId, status: 'active' } }),
          avgProgress: Number((enrollmentAgg._avg.progress || 0).toFixed(1)),
        },
        orders: {
          total: totalOrders,
          delivered,
          pending,
          totalSpent,
        },
      },
      recentActivity: {
        enrollments: recentEnrollments.map((e) => ({
          enrolled_at: e.enrolledAt,
          course_name: e.course.name,
          image_url: e.course.imageUrl,
        })),
        orders: recentOrders.map((o) => ({
          created_at: o.createdAt,
          kit_name: o.kit?.name,
          image_url: o.kit?.imageUrl,
          status: o.status,
        })),
      },
    },
  })
})

export default router
