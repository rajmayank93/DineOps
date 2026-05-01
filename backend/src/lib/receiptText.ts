import type { Bill, Order, OrderItem, RestaurantTable, Tenant } from "@prisma/client"

function money(v: unknown): string {
  const n = typeof v === "number" ? v : Number(String(v))
  if (Number.isNaN(n)) return "0.00"
  return n.toFixed(2)
}

const LINE_WIDTH = 40

function padRight(s: string, w: number): string {
  const t = s.length > w ? s.slice(0, w - 1) + "…" : s
  return t + " ".repeat(Math.max(0, w - t.length))
}

function padLeft(s: string, w: number): string {
  return " ".repeat(Math.max(0, w - s.length)) + s
}

function center(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w)
  const pad = w - s.length
  const L = Math.floor(pad / 2)
  const R = pad - L
  return " ".repeat(L) + s + " ".repeat(R)
}

function line(char = "-"): string {
  return char.repeat(LINE_WIDTH)
}

/** Plain-text receipt suitable for monospace display and thermal-style printing. */
export function buildReceiptText(params: {
  tenant: Pick<Tenant, "name">
  table: Pick<RestaurantTable, "label">
  order: Pick<Order, "id" | "createdAt" | "notes">
  items: Pick<OrderItem, "quantity" | "unitPrice" | "itemName">[]
  bill: Pick<Bill, "subtotal" | "taxRate" | "taxAmount" | "total" | "paidAt" | "createdAt">
}): string {
  const { tenant, table, order, items, bill } = params
  const rows: string[] = []
  rows.push(center(tenant.name.toUpperCase(), LINE_WIDTH))
  rows.push(center("RECEIPT", LINE_WIDTH))
  rows.push(line())
  rows.push(`Table: ${table.label}`)
  rows.push(`Order: ${order.id.slice(0, 8)}`)
  rows.push(`Date:  ${order.createdAt.toISOString().slice(0, 16).replace("T", " ")}`)
  rows.push(line("."))
  rows.push(`${padRight("Item", 22)}${padLeft("Qty", 4)} ${padLeft("Amt", 12)}`)
  rows.push(line("."))
  for (const i of items) {
    const lineTotal = Number(String(i.unitPrice)) * i.quantity
    const name = i.itemName.length > 20 ? i.itemName.slice(0, 19) + "…" : i.itemName
    rows.push(`${padRight(name, 22)}${padLeft(String(i.quantity), 4)} ${padLeft(money(lineTotal), 12)}`)
  }
  rows.push(line())
  rows.push(`${padRight("Subtotal", 28)}${padLeft(money(bill.subtotal), 12)}`)
  rows.push(`${padRight(`Tax (${money(bill.taxRate)}%)`, 28)}${padLeft(money(bill.taxAmount), 12)}`)
  rows.push(line())
  rows.push(`${padRight("TOTAL (INR)", 28)}${padLeft(money(bill.total), 12)}`)
  rows.push(line())
  if (bill.paidAt) {
    rows.push(`Paid: ${bill.paidAt.toISOString().slice(0, 19).replace("T", " ")}`)
  } else {
    rows.push("Status: UNPAID")
  }
  if (order.notes?.trim()) {
    rows.push(line("."))
    rows.push(`Note: ${order.notes.trim()}`)
  }
  rows.push(line())
  rows.push(center("Thank you", LINE_WIDTH))
  return rows.join("\n")
}
