import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"

const TABLE_STATUSES = ["empty", "occupied", "bill_pending"] as const

function isTableStatus(s: string): s is (typeof TABLE_STATUSES)[number] {
  return (TABLE_STATUSES as readonly string[]).includes(s)
}

export async function tableRoutes(server: FastifyInstance) {
  server.get("/tables", { preHandler: [authenticate] }, async (request) => {
    const { tenantId } = request.auth!
    const tables = await prisma.restaurantTable.findMany({
      where: { tenantId },
      orderBy: { label: "asc" },
    })
    return { tables }
  })

  server.post(
    "/tables",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const body = request.body as { label?: string; capacity?: number }
      if (!body.label?.trim()) return reply.status(400).send({ message: "label is required" })
      try {
        const table = await prisma.restaurantTable.create({
          data: {
            tenantId,
            label: body.label.trim(),
            capacity: body.capacity ?? 4,
          },
        })
        return { table }
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
          return reply.status(409).send({ message: "A table with this label already exists" })
        }
        throw e
      }
    }
  )

  server.patch(
    "/tables/:id",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const { id } = request.params as { id: string }
      const body = request.body as { label?: string; capacity?: number }
      const existing = await prisma.restaurantTable.findFirst({ where: { id, tenantId } })
      if (!existing) return reply.status(404).send({ message: "Table not found" })
      try {
        const table = await prisma.restaurantTable.update({
          where: { id },
          data: {
            ...(body.label !== undefined && { label: body.label.trim() }),
            ...(body.capacity !== undefined && { capacity: body.capacity }),
          },
        })
        return { table }
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
          return reply.status(409).send({ message: "A table with this label already exists" })
        }
        throw e
      }
    }
  )

  server.patch("/tables/:id/status", { preHandler: [authenticate] }, async (request, reply) => {
    const { tenantId, role } = request.auth!
    if (role !== "admin" && role !== "waiter") {
      return reply.status(403).send({ message: "Only admin or waiter can update table status" })
    }
    const { id } = request.params as { id: string }
    const body = request.body as { status?: string }
    if (!body.status || !isTableStatus(body.status)) {
      return reply.status(400).send({ message: `status must be one of: ${TABLE_STATUSES.join(", ")}` })
    }
    const existing = await prisma.restaurantTable.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.status(404).send({ message: "Table not found" })
    const table = await prisma.restaurantTable.update({
      where: { id },
      data: { status: body.status },
    })
    return { table }
  })

  server.delete(
    "/tables/:id",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const { id } = request.params as { id: string }
      const existing = await prisma.restaurantTable.findFirst({ where: { id, tenantId } })
      if (!existing) return reply.status(404).send({ message: "Table not found" })
      await prisma.restaurantTable.delete({ where: { id } })
      return reply.status(204).send()
    }
  )
}
