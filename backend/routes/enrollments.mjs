import { Router } from 'express'
import { prisma } from '../lib/prisma.mjs'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.mjs'

const router = Router()

const enrollSchema = z.object({
  body: z.object({
    courseId: z.string(),
  }),
})

router.post('/', requireAuth, async (req, res) => {
  try {
    await enrollSchema.parseAsync({ body: req.body })
    const { courseId } = req.body

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(400).json({ error: 'InvalidCourse' })

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      create: { userId: req.user.id, courseId, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    })

    res.status(201).json(enrollment)
  } catch (e) {
    res.status(400).json({ error: 'BadRequest', details: e?.message })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  const items = await prisma.enrollment.findMany({
    where: { userId: req.user.id },
    include: {
      course: {
        select: { id: true, title: true, slug: true, imageCoverUrl: true, level: true },
      },
    },
  })
  res.json(items)
})

// New endpoint to get enrollment details by courseId
router.get('/:courseId', requireAuth, async (req, res) => {
  const { courseId } = req.params

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      include: { course: true },
    })

    if (!enrollment) return res.status(404).json({ error: 'EnrollmentNotFound' })

    res.json(enrollment)
  } catch (e) {
    res.status(400).json({ error: 'BadRequest', details: e?.message })
  }
})

export default router
