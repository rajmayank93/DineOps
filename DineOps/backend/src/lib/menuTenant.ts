import prisma from "./prisma"

/** Ensures the tenant has a Menu row (version starts at 1). */
export async function getOrCreateMenu(tenantId: string) {
  let menu = await prisma.menu.findUnique({ where: { tenantId } })
  if (!menu) {
    menu = await prisma.menu.create({ data: { tenantId, version: 1 } })
  }
  return menu
}
