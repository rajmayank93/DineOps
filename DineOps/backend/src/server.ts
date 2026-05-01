import Fastify from "fastify"
import cors from "@fastify/cors"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

const envPathLocal = path.resolve(__dirname, "../.env")
const envPathRoot = path.resolve(__dirname, "../../.env")

if (fs.existsSync(envPathLocal)) {
  dotenv.config({ path: envPathLocal })
} else if (fs.existsSync(envPathRoot)) {
  dotenv.config({ path: envPathRoot })
} else {
  dotenv.config()
}

// Create a Fastify app and register the auth route plugin.
// We import authRoutes after loading environment variables so Prisma sees DATABASE_URL.
const server = Fastify({ logger: true })

server.register(cors, {
  origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173"],
  methods: ["GET", "POST", "OPTIONS"],
})

const start = async () => {
  const [{ authRoutes }, { meRoutes }] = await Promise.all([
    import("./routes/auth"),
    import("./routes/me"),
  ])

  server.register(authRoutes, { prefix: "/api/auth" })
  server.register(meRoutes, { prefix: "/api" })

  try {
    await server.listen({ port: Number(process.env.PORT) || 4000, host: "0.0.0.0" })
    console.log("Backend running on http://localhost:" + (process.env.PORT || 4000))
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
