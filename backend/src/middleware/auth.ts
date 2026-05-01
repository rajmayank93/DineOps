import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify"
import { verifyToken } from "../lib/jwt"

/**
 * Requires `Authorization: Bearer <jwt>`. Sets `request.auth` from verified payload.
 */
export const authenticate: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return reply.status(401).send({ message: "Missing or invalid authorization header" })
  }

  const token = header.slice("Bearer ".length).trim()
  if (!token) {
    return reply.status(401).send({ message: "Missing token" })
  }

  try {
    const payload = verifyToken(token)
    request.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    }
  } catch {
    return reply.status(401).send({ message: "Invalid or expired token" })
  }
}

/**
 * Must run after `authenticate`. Returns 403 if JWT role is not in `allowed`.
 */
export function requireRoles(...allowed: string[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({ message: "Unauthorized" })
    }
    if (!allowed.includes(auth.role)) {
      return reply.status(403).send({
        message: `Forbidden: requires one of roles [${allowed.join(", ")}], got "${auth.role}"`,
      })
    }
  }
}
