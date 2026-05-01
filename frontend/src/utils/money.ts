/** Display amounts as Indian Rupees (en-IN grouping and ₹ symbol). */
export function formatInr(amount: string | number): string {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0)
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
