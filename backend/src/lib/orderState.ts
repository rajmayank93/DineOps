/** Allowed order statuses and valid transitions (server-enforced). */
export const ORDER_STATUSES = ["pending", "preparing", "ready", "served"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const FORWARD: Record<OrderStatus, OrderStatus | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
}

export function isOrderStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(s)
}

/** One step forward only; returns null if role cannot advance from current. */
export function transitionForRole(current: string, role: string): OrderStatus | null {
  if (!isOrderStatus(current)) return null
  const next = FORWARD[current]
  if (!next) return null
  if (current === "pending" && next === "preparing") {
    return role === "kitchen" || role === "admin" ? next : null
  }
  if (current === "preparing" && next === "ready") {
    return role === "kitchen" || role === "admin" ? next : null
  }
  if (current === "ready" && next === "served") {
    return role === "waiter" || role === "admin" ? next : null
  }
  return null
}
