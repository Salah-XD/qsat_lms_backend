import { prisma } from '../backend/lib/prisma.mjs'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'

async function main() {
  // Clean existing kit data so only Telescope Kit remains
  await prisma.order.deleteMany({ where: { kitId: { not: null } } })
  await prisma.review.deleteMany({ where: { kitId: { not: null } } })
  await prisma.kitTag.deleteMany()
  await prisma.kitImage.deleteMany()
  await prisma.kit.deleteMany()

  // Create a test user
  const passwordHash = await bcrypt.hash('Test@1234', 12)
  const user = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Student',
      email: 'student@example.com',
      passwordHash,
      role: 'student',
      emailVerified: true,
    },
  })

  // Tags (with slug for schema compliance)
  const tagNames = ['Telescope', 'Astronomy']
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, type: 'kit', slug: slugify(name, { lower: true }) },
      }),
    ),
  )

  const TELESCOPE_IMG = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lrPaaonoR6lgHP0vgIkA6yfwkOR3z1.png'

  // Single Telescope Kit
  const kd = {
    name: 'QSAT Telescope Kit',
    description:
      'This kit comes with all the parts you need — kids can assemble it step by step and learn how a telescope works. Once built, you can use it to observe the Moon, stars, and planets.',
    price: 3499.0,
    originalPrice: 3999.0,
    category: 'Astronomy',
    difficulty: 'Beginner',
    duration: '4–6 hours',
    modules: 6,
    imageUrl: TELESCOPE_IMG, // Source URL per request
    features: ['Stable Alt-Az Mount', 'Quick-Start Guide', 'Finder Scope', 'Adjustable Tripod'],
    specifications: { aperture: '70mm', focal_length: '700mm', mount: 'Alt-Az', weight: '3.2kg' },
    whatIncludes: ['Optical tube', 'Finder scope', 'Tripod & mount', 'Eyepieces 10mm & 25mm', 'Guide'],
    memberCount: 250,
    stock: 50,
    tagNames: ['Telescope', 'Astronomy'],
  }

  const kit = await prisma.kit.create({
    data: {
      name: kd.name,
      description: kd.description,
      price: kd.price,
      originalPrice: kd.originalPrice,
      category: kd.category,
      difficulty: kd.difficulty,
      duration: kd.duration,
      modules: kd.modules,
      imageUrl: kd.imageUrl,
      features: kd.features,
      specifications: kd.specifications,
      whatIncludes: kd.whatIncludes,
      memberCount: kd.memberCount,
      stock: kd.stock,
      isActive: true,
      images: { create: [{ url: TELESCOPE_IMG, isPrimary: true, order: 0 }] },
    },
  })

  // Attach tags
  for (const t of kd.tagNames) {
    const tag = tags.find((x) => x.name === t)
    if (tag) {
      await prisma.kitTag.upsert({
        where: { kitId_tagId: { kitId: kit.id, tagId: tag.id } },
        update: {},
        create: { kitId: kit.id, tagId: tag.id },
      })
    }
  }

  // Sample reviews
  await prisma.review.createMany({
    data: [
      { userId: user.id, kitId: kit.id, rating: 5, comment: 'Crystal clear views of the Moon!', isVerified: true },
      { userId: user.id, kitId: kit.id, rating: 4, comment: 'Great starter kit for astronomy.', isVerified: true },
    ],
    skipDuplicates: true,
  })

  console.log('[v0] Seed complete: Telescope Kit only')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
