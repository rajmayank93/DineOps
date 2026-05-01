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
      openOrders,
      staffActive,
      servedToday,
      servedYesterday,
      recentOrders,
    ] = await Promise.all([
      prisma.restaurantTable.count({ where: { tenantId } }),
      prisma.restaurantTable.count({
        where: { tenantId, status: { in: ["occupied", "bill_pending"] } },
      }),
      prisma.order.count({
        where: { tenantId, status: { in: ["pending", "preparing", "ready"] } },
      }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.order.findMany({
        where: {
          tenantId,
          status: "served",
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        include: { items: true, table: { select: { label: true } } },
      }),
      prisma.order.findMany({
        where: {
          tenantId,
          status: "served",
          createdAt: { gte: yStart, lt: yEnd },
        },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true, table: { select: { label: true } } },
      }),
    ])

    const revenueToday = servedToday.reduce((sum, o) => sum + sumOrderLines(o.items), 0)
    const revenueYesterday = servedYesterday.reduce((sum, o) => sum + sumOrderLines(o.items), 0)
    let revenueTrendPct: number | null = null
    if (revenueYesterday > 0) {
      revenueTrendPct = ((revenueToday - revenueYesterday) / revenueYesterday) * 100
    } else if (revenueToday > 0) {
      revenueTrendPct = 100
    }

    const recent = recentOrders.map((o) => ({
      id: o.id,
      shortId: o.id.slice(0, 8),
      tableLabel: o.table.label,
      status: o.status,
      itemsSummary: o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ") || "—",
      total: sumOrderLines(o.items).toFixed(2),
      createdAt: o.createdAt.toISOString(),
    }))

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

    const servedInWeek = await prisma.order.findMany({
      where: {
        tenantId,
        status: "served",
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      include: { items: true },
    })

    const dayKeys: string[] = []
    for (let i = 0; i < 7; i++) {
      dayKeys.push(addDaysUtc(weekStart, i).toISOString().slice(0, 10))
    }

    const servedRevenueByDay = new Map<string, number>()
    const orderCountByDay = new Map<string, number>()
    for (const k of dayKeys) {
      servedRevenueByDay.set(k, 0)
      orderCountByDay.set(k, 0)
    }

    for (const o of servedInWeek) {
      const key = o.createdAt.toISOString().slice(0, 10)
      if (servedRevenueByDay.has(key)) {
        servedRevenueByDay.set(key, (servedRevenueByDay.get(key) ?? 0) + sumOrderLines(o.items))
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
          status: "served",
          createdAt: { gte: weekStart, lt: weekEnd },
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
      servedRevenue: (servedRevenueByDay.get(date) ?? 0).toFixed(2),
    }))

    return { topItems, ordersByDay, rangeDays: 7 }
  })
}
