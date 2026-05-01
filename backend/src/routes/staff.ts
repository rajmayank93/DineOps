import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { hashPassword } from "../lib/hash"
import { authenticate, requireRoles } from "../middleware/auth"

const STAFF_ROLES = ["waiter", "kitchen"] as const
type StaffRole = (typeof STAFF_ROLES)[number]

function isStaffRole(r: string): r is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(r)
}

/**
 * Admin-only staff CRUD for the current tenant. Signup remains the only path to create `admin`.
 */
export async function staffRoutes(server: FastifyInstance) {
  server.get(
    "/staff",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request) => {
      const { tenantId } = request.auth!
      const users = await prisma.user.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })
      return { users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) }
    }
  )

  server.post(
    "/staff",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const body = request.body as { email?: string; password?: string; role?: string }

      if (!body.email || !body.password || !body.role) {
        return reply.status(400).send({ message: "email, password, and role are required" })
      }

      if (!isStaffRole(body.role)) {
        return reply.status(400).send({
          message: `role must be one of: ${STAFF_ROLES.join(", ")} (admin accounts are created at restaurant signup only)`,
        })
      }

      const passwordHash = await hashPassword(body.password)

      try {
        const user = await prisma.user.create({
          data: {
            tenantId,
            email: body.email.trim().toLowerCase(),
            passwordHash,
            role: body.role,
          },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        })
        return {
          user: { ...user, createdAt: user.createdAt.toISOString() },
        }
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
          return reply.status(409).send({ message: "A user with this email already exists for this restaurant" })
        }
        throw e
      }
    }
  )
}
