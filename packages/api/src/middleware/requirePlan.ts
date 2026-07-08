import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { planRank } from '../lib/planLimits.js'
import type { Plan } from '../lib/planLimits.js'

export function requirePlan(minPlan: Plan) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Revalida plano direto no banco para refletir cancelamentos/expiração
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.sub),
      columns: { plan: true, planExpiresAt: true },
    })

    const effectivePlan = resolveEffectivePlan(user?.plan ?? 'free', user?.planExpiresAt ?? null)

    if (planRank(effectivePlan) < planRank(minPlan)) {
      return reply.status(403).send({
        error: `Plano ${minPlan} ou superior necessário`,
        currentPlan: effectivePlan,
      })
    }

    // Atualiza req.user.plan para refletir o plano efetivo nesta requisição
    req.user.plan = effectivePlan
  }
}

function resolveEffectivePlan(plan: string, expiresAt: Date | null): Plan {
  if (plan === 'free') return 'free'
  if (expiresAt && expiresAt < new Date()) return 'free'
  return plan as Plan
}
