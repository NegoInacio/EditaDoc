import type { FastifyRequest, FastifyReply } from 'fastify'

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, agency: 2 }

export function requirePlan(minPlan: 'free' | 'pro' | 'agency') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const userRank = PLAN_RANK[req.user.plan] ?? -1
    const required = PLAN_RANK[minPlan]
    if (userRank < required) {
      return reply.status(403).send({ error: `Plano ${minPlan} ou superior necessário` })
    }
  }
}
