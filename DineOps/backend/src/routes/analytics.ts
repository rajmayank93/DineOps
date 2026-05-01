import type { FastifyInstance } from "fastify"
import prisma from "../lib/prisma"
import { authenticate, requireRoles } from "../middleware/auth"

function utcDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

function sumOrderLines(items: { quantity: number; unitPrice: unknown }[]): number {
  let s = 0
  for (const i of items) {
    s += Number(String(i.unitPrice)) * i.quantity
  }
  return s
}

/** Admin-only aggregates for dashboard + reports. */
export async function analyticsRoutes(server: FastifyInstance) {
  const admins = [authenticate, requireRoles("admin")] as const

  server.get("/analytics/dashboard", { preHandler: [...admins] }, async (request) => {
    const { tenantId } = request.auth!
    const now = new Date()
    const { start: todayStart, end: todayEnd } = utcDayBounds(now)
    const y = addDaysUtc(now, -1)
    const { start: yStart, end: yEnd } = utcDayBounds(y)

    const [
      tablesTotal,
      tablesActive,
      kitchenOpen,
      awaitingPayment,
      staffActive,
      paidBillsToday,
      paidBillsYesterday,
      recentOrders,
    ] = await Promise.all([
      prisma.restaurantTable.count({ where: { tenantId } }),
      prisma.restaurantTable.count({
        where: { tenantId, status: { in: ["occupied", "bill_pending"] } },
      }),
      prisma.order.count({
        where: { tenantId, status: { in: ["pending", "preparing", "ready"] } },
      }),
      prisma.order.count({
        where: {
          tenantId,
          status: "served",
          OR: [{ bill: { is: null } }, { bill: { is: { paidAt: null } } }],
        },
      }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.bill.findMany({
        where: {
          tenantId,
          paidAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.bill.findMany({
        where: {
          tenantId,
          paidAt: { gte: yStart, lt: yEnd },
        },
      }),
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true, table: { select: { label: true } }, bill: true },
      }),
    ])

    const openOrders = kitchenOpen + awaitingPayment

    const revenueToday = paidBillsToday.reduce((sum, b) => sum + Number(String(b.total)), 0)
    const revenueYesterday = paidBillsYesterday.reduce((sum, b) => sum + Number(String(b.total)), 0)
    let revenueTrendPct: number | null = null
    if (revenueYesterday > 0) {
      revenueTrendPct = ((revenueToday - revenueYesterday) / revenueYesterday) * 100
    } else if (revenueToday > 0) {
      revenueTrendPct = 100
    }

    const recent = recentOrders.map((o) => {
      const billPaid = o.bill?.paidAt
        ? Number(String(o.bill.total))
        : null
      const total = billPaid !== null ? billPaid : sumOrderLines(o.items)
      return {
        id: o.id,
        shortId: o.id.slice(0, 8),
        tableLabel: o.table.label,
        status: o.status,
        itemsSummary: o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ") || "—",
        total: total.toFixed(2),
        createdAt: o.createdAt.toISOString(),
      }
    })

    return {
      summary: {
        revenueToday: revenueToday.toFixed(2),
        revenueYesterday: revenueYesterday.toFixed(2),
        revenueTrendPct,
        tablesActive,
        tablesTotal,
        openOrders,
        staffActive,
      },
      recentOrders: recent,
    }
  })

  server.get("/analytics/reports", { preHandler: [...admins] }, async (request) => {
    const { tenantId } = request.auth!
    const now = new Date()
    const weekStart = utcDayBounds(addDaysUtc(now, -6)).start
    const weekEnd = utcDayBounds(now).end

    const paidBillsWeek = await prisma.bill.findMany({
      where: {
        tenantId,
        paidAt: { gte: weekStart, lt: weekEnd },
      },
    })

    const dayKeys: string[] = []
    for (let i = 0; i < 7; i++) {
      dayKeys.push(addDaysUtc(weekStart, i).toISOString().slice(0, 10))
    }

    const paidRevenueByDay = new Map<string, number>()
    const orderCountByDay = new Map<string, number>()
    for (const k of dayKeys) {
      paidRevenueByDay.set(k, 0)
      orderCountByDay.set(k, 0)
    }

    for (const b of paidBillsWeek) {
      if (!b.paidAt) continue
      const key = b.paidAt.toISOString().slice(0, 10)
      if (paidRevenueByDay.has(key)) {
        paidRevenueByDay.set(key, (paidRevenueByDay.get(key) ?? 0) + Number(String(b.total)))
      }
    }

    const allWeek = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: weekStart, lt: weekEnd } },
      select: { createdAt: true },
    })
    for (const o of allWeek) {
      const key = o.createdAt.toISOString().slice(0, 10)
      if (orderCountByDay.has(key)) {
        orderCountByDay.set(key, (orderCountByDay.get(key) ?? 0) + 1)
      }
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          bill: { is: { paidAt: { gte: weekStart, lt: weekEnd } } },
        },
      },
      select: { itemName: true, quantity: true, unitPrice: true },
    })

    const itemMap = new Map<string, { quantity: number; revenue: number }>()
    for (const it of orderItems) {
      const cur = itemMap.get(it.itemName) ?? { quantity: 0, revenue: 0 }
      cur.quantity += it.quantity
      cur.revenue += Number(String(it.unitPrice)) * it.quantity
      itemMap.set(it.itemName, cur)
    }

    const topItems = [...itemMap.entries()]
      .map(([itemName, v]) => ({
        itemName,
        quantity: v.quantity,
        revenue: v.revenue.toFixed(2),
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const ordersByDay = dayKeys.map((date) => ({
      date,
      orderCount: orderCountByDay.get(date) ?? 0,
      servedRevenue: (paidRevenueByDay.get(date) ?? 0).toFixed(2),
    }))

    return { topItems, ordersByDay, rangeDays: 7 }
  })
}
