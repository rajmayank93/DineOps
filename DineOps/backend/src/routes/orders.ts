import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"
import { transitionForRole } from "../lib/orderState"
import { Prisma } from "@prisma/client"

function toMoney(v: unknown): string {
  const n = typeof v === "number" ? v : Number(String(v))
  if (Number.isNaN(n)) return "0.00"
  return n.toFixed(2)
}

export async function orderRoutes(server: FastifyInstance) {
  server.get("/orders", { preHandler: [authenticate] }, async (request) => {
    const { tenantId } = request.auth!
    const q = request.query as { tableId?: string; status?: string }
    const where: Prisma.OrderWhereInput = { tenantId }
    if (q.tableId) where.tableId = q.tableId
    if (q.status) where.status = q.status

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        table: { select: { id: true, label: true } },
        items: true,
        placedBy: { select: { id: true, email: true, role: true } },
      },
      take: 100,
    })

    return {
      orders: orders.map((o) => ({
        id: o.id,
        tableId: o.tableId,
        tableLabel: o.table.label,
        menuVersion: o.menuVersion,
        status: o.status,
        source: o.source,
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
        placedBy: o.placedBy ? { id: o.placedBy.id, email: o.placedBy.email, role: o.placedBy.role } : null,
        items: o.items.map((i) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: toMoney(i.unitPrice),
          itemName: i.itemName,
          note: i.note,
        })),
      })),
    }
  })

  server.post(
    "/orders",
    { preHandler: [authenticate, requireRoles("admin", "waiter")] },
    async (request, reply) => {
      const { tenantId, userId } = request.auth!
      const body = request.body as {
        tableId?: string
        items?: { menuItemId: string; quantity: number; note?: string }[]
        notes?: string
      }

      if (!body.tableId) return reply.status(400).send({ message: "tableId is required" })
      if (!body.items?.length) return reply.status(400).send({ message: "items must be a non-empty array" })

      const table = await prisma.restaurantTable.findFirst({
        where: { id: body.tableId, tenantId },
      })
      if (!table) return reply.status(404).send({ message: "Table not found" })

      const menu = await prisma.menu.findUnique({ where: { tenantId } })
      if (!menu) {
        return reply.status(400).send({ message: "Add menu items before creating orders" })
      }

      const menuVersion = menu.version
      const lineInputs = body.items

      const menuItemIds = [...new Set(lineInputs.map((l) => l.menuItemId))]
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, tenantId, menuId: menu.id, isAvailable: true },
      })
      if (menuItems.length !== menuItemIds.length) {
        return reply.status(400).send({ message: "One or more menu items are invalid or unavailable" })
      }

      const byId = new Map(menuItems.map((m) => [m.id, m]))

      const order = await prisma.$transaction(async (tx) => {
        const o = await tx.order.create({
          data: {
            tenantId,
            tableId: table.id,
            placedById: userId,
            menuVersion,
            status: "pending",
            source: "waiter",
            notes: body.notes?.trim() || null,
            items: {
              create: lineInputs.map((line) => {
                const mi = byId.get(line.menuItemId)!
                const q = Math.max(1, Math.floor(Number(line.quantity)) || 1)
                return {
                  menuItemId: mi.id,
                  quantity: q,
                  unitPrice: mi.price,
                  itemName: mi.name,
                  note: line.note?.trim() || null,
                }
              }),
            },
          },
          include: { items: true, table: true, placedBy: { select: { id: true, email: true, role: true } } },
        })

        await tx.restaurantTable.update({
          where: { id: table.id },
          data: { status: "occupied" },
        })

        return o
      })

      return {
        order: {
          id: order.id,
          tableId: order.tableId,
          tableLabel: order.table.label,
          menuVersion: order.menuVersion,
          status: order.status,
          source: order.source,
          notes: order.notes,
          createdAt: order.createdAt.toISOString(),
          placedBy: order.placedBy,
          items: order.items.map((i) => ({
            id: i.id,
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: toMoney(i.unitPrice),
            itemName: i.itemName,
            note: i.note,
          })),
        },
      }
    }
  )

  server.patch("/orders/:id/status", { preHandler: [authenticate] }, async (request, reply) => {
    const { tenantId, role } = request.auth!
    const { id } = request.params as { id: string }

    const order = await prisma.order.findFirst({
      where: { id, tenantId },
    })
    if (!order) return reply.status(404).send({ message: "Order not found" })

    const next = transitionForRole(order.status, role)
    if (!next) {
      return reply.status(403).send({
        message: "You cannot advance this order from its current status, or it is already final for this flow",
      })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: next },
      include: { table: true, items: true, placedBy: { select: { id: true, email: true, role: true } } },
    })

    if (next === "served") {
      await prisma.restaurantTable.update({
        where: { id: updated.tableId },
        data: { status: "bill_pending" },
      })
    }

    return {
      order: {
        id: updated.id,
        tableId: updated.tableId,
        tableLabel: updated.table.label,
        menuVersion: updated.menuVersion,
        status: updated.status,
        source: updated.source,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        placedBy: updated.placedBy,
        items: updated.items.map((i) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: toMoney(i.unitPrice),
          itemName: i.itemName,
          note: i.note,
        })),
      },
    }
  })
}
