const fs = require("fs")
const path = require("path")
const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

async function runMigrations() {
  try {
    console.log("🚀 Starting database migrations...")

    // Read and execute schema
    const schemaPath = path.resolve(__dirname, "database-schema.sql")
    const seedPath = path.resolve(__dirname, "seed-data.sql")

    // Check if files exist before trying to read them
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`)
    }

    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`)
    }

    const schema = fs.readFileSync(schemaPath, "utf8")

    console.log("📋 Creating database schema...")
    await pool.query(schema)
    console.log("✅ Schema created successfully")

    // Read and execute seed data
    const seedData = fs.readFileSync(seedPath, "utf8")

    console.log("🌱 Seeding database with sample data...")
    await pool.query(seedData)
    console.log("✅ Database seeded successfully")

    console.log("🎉 Database migration completed!")
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    await pool.end()
    process.exit(1)
  }
}

runMigrations()
