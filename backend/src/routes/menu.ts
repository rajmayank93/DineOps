import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"
import { getOrCreateMenu } from "../lib/menuTenant"
import { Prisma } from "@prisma/client"

function toMoney(v: unknown): string {
  const n = typeof v === "number" ? v : Number(String(v))
  if (Number.isNaN(n)) return "0.00"
  return n.toFixed(2)
}

export async function menuRoutes(server: FastifyInstance) {
  server.get("/menu", { preHandler: [authenticate] }, async (request) => {
    const { tenantId } = request.auth!
    const menu = await prisma.menu.findUnique({
      where: { tenantId },
      include: { items: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] } },
    })
    if (!menu) {
      return { version: 0, items: [] }
    }
    return {
      version: menu.version,
      items: menu.items.map((i) => ({
        id: i.id,
        category: i.category,
        name: i.name,
        description: i.description,
        price: toMoney(i.price),
        sortOrder: i.sortOrder,
        isAvailable: i.isAvailable,
      })),
    }
  })

  server.post(
    "/menu/items",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const body = request.body as {
        category?: string
        name?: string
        description?: string | null
        price?: number | string
        sortOrder?: number
        isAvailable?: boolean
      }

      if (!body.category?.trim() || !body.name?.trim()) {
        return reply.status(400).send({ message: "category and name are required" })
      }
      const priceNum = Number(body.price)
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return reply.status(400).send({ message: "price must be a non-negative number" })
      }

      const menu = await getOrCreateMenu(tenantId)
      const item = await prisma.$transaction(async (tx) => {
        const row = await tx.menuItem.create({
          data: {
            tenantId,
            menuId: menu.id,
            category: body.category!.trim(),
            name: body.name!.trim(),
            description: body.description?.trim() || null,
            price: new Prisma.Decimal(priceNum.toFixed(2)),
            sortOrder: body.sortOrder ?? 0,
            isAvailable: body.isAvailable ?? true,
          },
        })
        await tx.menu.update({
          where: { id: menu.id },
          data: { version: { increment: 1 } },
        })
        return row
      })

      return {
        item: {
          id: item.id,
          category: item.category,
          name: item.name,
          description: item.description,
          price: toMoney(item.price),
          sortOrder: item.sortOrder,
          isAvailable: item.isAvailable,
        },
      }
    }
  )

  server.patch(
    "/menu/items/:id",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const { id } = request.params as { id: string }
      const body = request.body as Partial<{
        category: string
        name: string
        description: string | null
        price: number | string
        sortOrder: number
        isAvailable: boolean
      }>

      const existing = await prisma.menuItem.findFirst({ where: { id, tenantId } })
      if (!existing) return reply.status(404).send({ message: "Menu item not found" })

      const data: Prisma.MenuItemUpdateInput = {}
      if (body.category !== undefined) data.category = body.category.trim()
      if (body.name !== undefined) data.name = body.name.trim()
      if (body.description !== undefined) data.description = body.description?.trim() || null
      if (body.price !== undefined) {
        const priceNum = Number(body.price)
        if (Number.isNaN(priceNum) || priceNum < 0) {
          return reply.status(400).send({ message: "price must be a non-negative number" })
        }
        data.price = new Prisma.Decimal(priceNum.toFixed(2))
      }
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
      if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable

      const item = await prisma.$transaction(async (tx) => {
        const row = await tx.menuItem.update({ where: { id }, data })
        await tx.menu.update({
          where: { id: existing.menuId },
          data: { version: { increment: 1 } },
        })
        return row
      })

      return {
        item: {
          id: item.id,
          category: item.category,
          name: item.name,
          description: item.description,
          price: toMoney(item.price),
          sortOrder: item.sortOrder,
          isAvailable: item.isAvailable,
        },
      }
    }
  )

  server.delete(
    "/menu/items/:id",
    { preHandler: [authenticate, requireRoles("admin")] },
    async (request, reply) => {
      const { tenantId } = request.auth!
      const { id } = request.params as { id: string }
      const existing = await prisma.menuItem.findFirst({ where: { id, tenantId } })
      if (!existing) return reply.status(404).send({ message: "Menu item not found" })

      await prisma.$transaction(async (tx) => {
        await tx.menuItem.delete({ where: { id } })
        await tx.menu.update({
          where: { id: existing.menuId },
          data: { version: { increment: 1 } },
        })
      })

      return reply.status(204).send()
    }
  )
}
