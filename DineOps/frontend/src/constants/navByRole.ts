/** Sidebar sections allowed per role (UX mirror of RBAC; API must still enforce). */
export const NAV_IDS_BY_ROLE: Record<string, readonly string[]> = {
  admin: ['dashboard', 'orders', 'tables', 'menu', 'staff', 'reports', 'settings'],
  waiter: ['orders', 'tables', 'menu'],
  kitchen: ['orders'],
}

/** First URL/nav section shown after login when a role has no dashboard. */
export function firstSectionForRole(role: string): string {
  const ids = NAV_IDS_BY_ROLE[role] ?? NAV_IDS_BY_ROLE.waiter
  return ids[0] ?? 'orders'
}
