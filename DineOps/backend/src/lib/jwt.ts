import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "replace-this-with-a-secret"
const JWT_EXPIRES_IN = "7d"

// JWT helpers used by auth routes. Tokens include userId, tenantId, and role.

type TokenPayload = {
  userId: string
  tenantId: string
  role: string
}

export function signToken(payload: TokenPayload) {
  // Issue a signed JWT that expires after the configured duration.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload {
  // Verify a token and return the decoded payload.
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
