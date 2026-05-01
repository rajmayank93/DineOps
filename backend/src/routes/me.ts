import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"

/**
 * Authenticated-only routes. Base path: `/api` → `/me`, `/admin/tenant`.
 */
export async function meRoutes(server: FastifyInstance) {
  server.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId, tenantId } = request.auth!

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      include: { tenant: true },
    })

    if (!user || !user.tenant.isActive) {
      return reply.status(401).send({ message: "User or tenant inactive" })
    }

    return {
      tenant: { id: user.tenant.id, name: user.tenant.name },
      user: { id: user.id, email: user.email, role: user.role },
    }
  })

  /** Example admin-only endpoint: full tenant record scoped by JWT `tenantId`. */
  server.get("/admin/tenant", { preHandler: [authenticate, requireRoles("admin")] }, async (request, reply) => {
    const { tenantId } = request.auth!

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, isActive: true },
    })

    if (!tenant) {
      return reply.status(404).send({ message: "Tenant not found" })
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        ownerEmail: tenant.ownerEmail,
        tier: tenant.tier,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt.toISOString(),
      },
    }
  })
}
