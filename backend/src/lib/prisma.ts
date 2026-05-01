import { PrismaClient } from "@prisma/client"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before creating PrismaClient")
}

// Create and export a singleton Prisma client instance for use throughout the app.
// The DATABASE_URL env var must be set before this module loads.
const prisma = new PrismaClient()

export default prisma
