import { prisma } from '../lib/prisma.mjs'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'

const upsertTag = async (name) => {
  const slug = slugify(name, { lower: true })
  return prisma.tag.upsert({
    where: { name },
    create: { name, slug },
    update: {},
  })
}

const main = async () => {
  const passwordHash = await bcrypt.hash('Password123!', 12)
  const user = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    create: { firstName: 'Student', lastName: 'User', email: 'student@example.com', passwordHash, role: 'student' },
    update: {},
  })

  const instructorUser = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    create: { firstName: 'Sarah', lastName: 'Johnson', email: 'instructor@example.com', passwordHash, role: 'instructor' },
    update: {},
  })
  const instructor = await prisma.instructor.upsert({
    where: { userId: instructorUser.id },
    create: {
      userId: instructorUser.id,
      firstName: instructorUser.firstName,
      lastName: instructorUser.lastName,
      bio: 'Former NASA Engineer',
      expertise: ['Rocketry', 'Aerodynamics'],
    },
    update: {},
  })

  const [rocketry, satellite, astronomy] = await Promise.all([
    upsertTag('Rocketry'),
    upsertTag('Satellite'),
    upsertTag('Astronomy'),
  ])

  const kit = await prisma.kit.create({
    data: {
      name: 'Rocketry Hands-On Kit',
      description:
        'Build and launch your own model rocket with comprehensive learning modules covering propulsion and aerodynamics.',
      price: 2999,
      originalPrice: 3499,
      category: 'Rocketry',
      difficulty: 'Intermediate',
      duration: '6 hours',
      modules: 8,
      features: ['Model Rocket Kit', 'Launch Pad', 'Recovery System', 'Safety Equipment'],
      whatIncludes: [
        'Model Rocket Body Kit',
        'Engine Mount Assembly',
        'Recovery System',
        'Launch Pad & Controller',
        'Safety Equipment',
      ],
      memberCount: 1250,
      images: {
        create: [
          { url: '/placeholder.svg?height=400&width=600', order: 0 },
          { url: '/placeholder.svg?height=400&width=600', order: 1 },
        ],
      },
      tags: { create: [{ tagId: rocketry.id }] },
    },
  })

  await prisma.course.create({
    data: {
      name: 'Introduction to Rocket Science',
      description: 'Learn the fundamentals of rocket propulsion, aerodynamics, and space flight mechanics.',
      price: 0,
      category: 'Rocketry',
      difficulty: 'Beginner',
      duration: '8 hours',
      modules: 12,
      isPremium: false,
      instructorId: instructor.id,
      whatYouLearn: ['Propulsion', 'Aerodynamics', 'Stability'],
      requirements: ['High-school physics'],
    },
  })

  await prisma.order.create({
    data: {
      userId: user.id,
      kitId: kit.id,
      quantity: 1,
      subtotal: 2999,
      tax: 2999 * 0.18,
      shipping: 0,
      total: 2999 * 1.18,
      status: 'pending',
      shippingAddress: {
        name: 'Student User',
        line1: '123 Street',
        city: 'Bengaluru',
        state: 'KA',
        postalCode: '560001',
        country: 'IN',
        phone: '+91-9999999999',
      },
    },
  })

  console.log('[seed] done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })