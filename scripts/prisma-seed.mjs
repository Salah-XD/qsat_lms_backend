import { prisma } from '../backend/lib/prisma.mjs'
import bcrypt from 'bcryptjs'

async function main() {
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

  // Tags
  const tagNames = ['Rocketry', 'Satellite', 'Astronomy', 'Engineering', 'Robotics', 'Physics', 'Beginner', 'Advanced']
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name, type: 'kit' } }),
    ),
  )

  // Kits
  const kitsData = [
    {
      name: 'Rocketry Hands-On Kit',
      description:
        'Build and launch your own model rocket with comprehensive learning modules covering propulsion, aerodynamics, and flight dynamics.',
      price: 2999.0,
      originalPrice: 3499.0,
      category: 'Rocketry',
      difficulty: 'Intermediate',
      duration: '6 hours',
      modules: 8,
      imageUrl: '/images/kits/rocketry-kit.jpg',
      features: ['Model Rocket Kit', 'Launch Pad', 'Recovery System', 'Safety Equipment'],
      specifications: { weight: '2.5kg', dimensions: '45x30x15cm', max_altitude: '300m', recovery: 'Parachute' },
      whatIncludes: ['Rocket body tubes', 'Nose cone', 'Fins', 'Recovery system', 'Launch pad', 'Safety manual'],
      memberCount: 1250,
      stock: 100,
      tagNames: ['Rocketry', 'Advanced'],
    },
    {
      name: 'Satellite Communication Kit',
      description:
        'Learn satellite technology and build a working communication system with ground station setup and signal processing.',
      price: 3499.0,
      originalPrice: 3999.0,
      category: 'Satellite',
      difficulty: 'Advanced',
      duration: '8 hours',
      modules: 10,
      imageUrl: '/images/kits/satellite-kit.jpg',
      features: ['Satellite Simulator', 'Ground Station', 'Antenna Kit', 'Signal Analyzer'],
      specifications: { frequency: '2.4GHz', range: '10km', power: '12V', antenna_gain: '15dBi' },
      whatIncludes: ['Satellite simulator board', 'Ground station receiver', 'Directional antenna', 'Signal unit'],
      memberCount: 890,
      stock: 100,
      tagNames: ['Satellite', 'Advanced'],
    },
  ]

  for (const kd of kitsData) {
    const kit = await prisma.kit.upsert({
      where: { name: kd.name },
      update: {},
      create: {
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
        { userId: user.id, kitId: kit.id, rating: 5, comment: 'Fantastic kit! Highly recommended.', isVerified: true },
        { userId: user.id, kitId: kit.id, rating: 4, comment: 'Great learning experience.', isVerified: true },
      ],
      skipDuplicates: true,
    })
  }

  console.log('[v0] Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
