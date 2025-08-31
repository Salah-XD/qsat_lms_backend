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
  // Remove existing kit-related data to ensure only Telescope Kit remains
  await prisma.order.deleteMany({ where: { kitId: { not: null } } })
  await prisma.review.deleteMany({ where: { kitId: { not: null } } })
  await prisma.kitTag.deleteMany()
  await prisma.kitImage.deleteMany()
  await prisma.kit.deleteMany()

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
      expertise: ['Astronomy', 'Optics'],
    },
    update: {},
  })

  // Only the tags needed for Telescope Kit
  const [telescopeTag, astronomyTag] = await Promise.all([
    upsertTag('Telescope'),
    upsertTag('Astronomy'),
  ])

  const TELESCOPE_IMG = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lrPaaonoR6lgHP0vgIkA6yfwkOR3z1.png'

  const kit = await prisma.kit.create({
    data: {
      name: 'QSAT Telescope Kit',
      description:
        'This kit comes with all the parts you need — kids can assemble it step by step and learn how a telescope works. Once built, you can use it to observe the Moon, stars, and planets.',
      price: 3499,
      originalPrice: 3999,
      category: 'Astronomy',
      difficulty: 'Beginner',
      duration: '4–6 hours',
      modules: 6,
      imageUrl: TELESCOPE_IMG, // use Source URL as requested
      features: ['Stable Alt-Az Mount', 'Quick-Start Guide', 'Finder Scope', 'Adjustable Tripod'],
      whatIncludes: [
        'Optical Tube Assembly',
        'Finder scope',
        'Alt-Az mount & tripod',
        'Eyepieces (10mm & 25mm)',
        'Quick-start guide',
      ],
      memberCount: 250,
      images: {
        create: [{ url: TELESCOPE_IMG, isPrimary: true, order: 0 }],
      },
      tags: { create: [{ tagId: telescopeTag.id }, { tagId: astronomyTag.id }] },
    },
  })

  // Optional sample order referencing the Telescope Kit
  await prisma.order.create({
    data: {
      userId: user.id,
      kitId: kit.id,
      quantity: 1,
      subtotal: 3499,
      tax: 3499 * 0.18,
      shipping: 0,
      total: 3499 * 1.18,
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

  console.log('[seed] Telescope Kit inserted; other kits removed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
