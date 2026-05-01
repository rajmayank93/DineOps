import { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { hashPassword, comparePassword } from "../lib/hash"
import { signToken } from "../lib/jwt"

// Auth route module for signup/login. Uses Prisma to access tenant/user data
// and issues JWTs for authenticated users.
export async function authRoutes(server: FastifyInstance) {
  server.post("/signup", async (request, reply) => {
    // Signup creates a new tenant and an admin user in one atomic operation.
    const body = request.body as {
      restaurantName: string
      ownerEmail: string
      password: string
    }

    if (!body.restaurantName || !body.ownerEmail || !body.password) {
      return reply.status(400).send({ message: "restaurantName, ownerEmail, and password are required" })
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { ownerEmail: body.ownerEmail },
    })

    if (existingTenant) {
      return reply.status(409).send({ message: "Restaurant with this owner email already exists" })
    }

    const passwordHash = await hashPassword(body.password)

    const tenant = await prisma.tenant.create({
      data: {
        name: body.restaurantName,
        ownerEmail: body.ownerEmail,
        users: {
          create: {
            email: body.ownerEmail,
            passwordHash,
            role: "admin",
          },
        },
      },
      include: { users: true },
    })

    const user = tenant.users[0]
    const token = signToken({ userId: user.id, tenantId: tenant.id, role: user.role })

    return { token, tenant: { id: tenant.id, name: tenant.name }, user: { id: user.id, email: user.email, role: user.role } }
  })

  server.post("/login", async (request, reply) => {
    // Login validates the user credentials and returns a JWT for future API calls.
    const body = request.body as { email: string; password: string }

    if (!body.email || !body.password) {
      return reply.status(400).send({ message: "email and password are required" })
    }

    const user = await prisma.user.findFirst({
      where: { email: body.email },
      include: { tenant: true },
    })

    if (!user) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    const valid = await comparePassword(body.password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    const token = signToken({ userId: user.id, tenantId: user.tenantId, role: user.role })

    return {
      token,
      tenant: { id: user.tenantId, name: user.tenant.name },
      user: { id: user.id, email: user.email, role: user.role },
    }
  })
}
