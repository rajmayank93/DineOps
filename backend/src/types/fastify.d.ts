import "fastify"

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `authenticate` preHandler after a valid Bearer JWT. */
    auth?: {
      userId: string
      tenantId: string
      role: string
    }
  }
}
