import type { FastifyInstance } from "fastify"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"
import { buildReceiptText } from "../lib/receiptText"

function toMoney(v: unknown): string {
  const n = typeof v === "number" ? v : Number(String(v))
  if (Number.isNaN(n)) return "0.00"
  return n.toFixed(2)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function loadBillContext(billId: string, tenantId: string) {
  return prisma.bill.findFirst({
    where: { id: billId, tenantId },
    include: {
      order: {
        include: {
          items: true,
          table: { select: { label: true } },
        },
      },
      tenant: { select: { name: true } },
    },
  })
}

function contextToPayload(
  row: NonNullable<Awaited<ReturnType<typeof loadBillContext>>>,
  receiptText: string
) {
  return {
    bill: {
      id: row.id,
      orderId: row.orderId,
      subtotal: toMoney(row.subtotal),
      taxRate: toMoney(row.taxRate),
      taxAmount: toMoney(row.taxAmount),
      total: toMoney(row.total),
      paidAt: row.paidAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      receiptText,
    },
  }
}

export async function billRoutes(server: FastifyInstance) {
  const staffHandlers = [authenticate, requireRoles("admin", "waiter")] as const

  server.post("/bills", { preHandler: [...staffHandlers] }, async (request, reply) => {
    const { tenantId } = request.auth!
    const body = request.body as { orderId?: string; taxRate?: number }

    if (!body.orderId?.trim()) return reply.status(400).send({ message: "orderId is required" })

    let taxPct = body.taxRate !== undefined ? Number(body.taxRate) : 5
    if (Number.isNaN(taxPct) || taxPct < 0 || taxPct > 100) {
      return reply.status(400).send({ message: "taxRate must be between 0 and 100" })
    }

    const order = await prisma.order.findFirst({
      where: { id: body.orderId, tenantId },
      include: { items: true, table: true, bill: true },
    })

    if (!order) return reply.status(404).send({ message: "Order not found" })
    if (order.status !== "served") {
      return reply.status(400).send({ message: "Bill can only be created for a served order" })
    }
    if (order.bill) return reply.status(409).send({ message: "This order already has a bill" })

    let subtotal = 0
    for (const i of order.items) {
      subtotal += Number(String(i.unitPrice)) * i.quantity
    }
    subtotal = round2(subtotal)
    const taxAmount = round2((subtotal * taxPct) / 100)
    const total = round2(subtotal + taxAmount)

    const bill = await prisma.bill.create({
      data: {
        tenantId,
        orderId: order.id,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        taxRate: new Prisma.Decimal(taxPct.toFixed(2)),
        taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
        total: new Prisma.Decimal(total.toFixed(2)),
      },
    })

    const full = await loadBillContext(bill.id, tenantId)
    if (!full) return reply.status(500).send({ message: "Could not load bill" })

    const receiptText = buildReceiptText({
      tenant: { name: full.tenant.name },
      table: full.order.table,
      order: full.order,
      items: full.order.items,
      bill: full,
    })

    return contextToPayload(full, receiptText)
  })

  server.get("/bills/:id", { preHandler: [...staffHandlers] }, async (request, reply) => {
    const { tenantId } = request.auth!
    const { id } = request.params as { id: string }

    const full = await loadBillContext(id, tenantId)
    if (!full) return reply.status(404).send({ message: "Bill not found" })

    const receiptText = buildReceiptText({
      tenant: { name: full.tenant.name },
      table: full.order.table,
      order: full.order,
      items: full.order.items,
      bill: full,
    })

    return contextToPayload(full, receiptText)
  })

  server.patch("/bills/:id/pay", { preHandler: [...staffHandlers] }, async (request, reply) => {
    const { tenantId } = request.auth!
    const { id } = request.params as { id: string }

    const row = await prisma.bill.findFirst({
      where: { id, tenantId },
      include: { order: { select: { id: true, tableId: true } } },
    })

    if (!row) return reply.status(404).send({ message: "Bill not found" })
    if (row.paidAt) return reply.status(400).send({ message: "Bill is already paid" })

    const paidAt = new Date()

    await prisma.$transaction([
      prisma.bill.update({
        where: { id: row.id },
        data: { paidAt },
      }),
      prisma.restaurantTable.update({
        where: { id: row.order.tableId },
        data: { status: "empty" },
      }),
    ])

    const full = await loadBillContext(id, tenantId)
    if (!full) return reply.status(500).send({ message: "Could not load bill" })

    const receiptText = buildReceiptText({
      tenant: { name: full.tenant.name },
      table: full.order.table,
      order: full.order,
      items: full.order.items,
      bill: full,
    })

    return contextToPayload(full, receiptText)
  })
}
