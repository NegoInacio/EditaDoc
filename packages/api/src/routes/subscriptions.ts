import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { subscriptions, users } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { createSubscription, getSubscription, verifyWebhookSignature } from '../services/mercadoPago.js'

const createBody = z.object({
  plan: z.enum(['pro', 'agency']),
  backUrl: z.string().url(),
})

const PLAN_BY_REASON: Record<string, string> = {
  'EditaDoc Pro': 'pro',
  'EditaDoc Agency': 'agency',
}

export async function subscriptionsRoutes(app: FastifyInstance) {
  // POST /subscriptions — inicia checkout de assinatura
  app.post('/subscriptions', { preHandler: authenticate }, async (req, reply) => {
    const result = createBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { plan, backUrl } = result.data

    const checkout = await createSubscription({
      payerEmail: req.user.email,
      plan,
      backUrl,
    })

    await db.insert(subscriptions).values({
      userId: req.user.sub,
      mpSubscriptionId: checkout.id,
      plan,
      status: 'pending' as never,
    })

    return reply.status(201).send({ checkoutUrl: checkout.init_point, id: checkout.id })
  })

  // GET /subscriptions/me — assinatura ativa do usuário
  app.get('/subscriptions/me', { preHandler: authenticate }, async (req, reply) => {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, req.user.sub),
      orderBy: (t, { desc }) => desc(t.createdAt),
    })
    if (!sub) return reply.status(404).send({ error: 'Sem assinatura' })
    return sub
  })

  // POST /subscriptions/webhook — recebe notificações do Mercado Pago
  app.post('/subscriptions/webhook', async (req, reply) => {
    const signature = (req.headers['x-signature'] ?? '') as string
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body)

    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Assinatura inválida' })
    }

    const event = req.body as {
      type: string
      data: { id: string }
    }

    if (event.type !== 'subscription_preapproval') {
      return reply.status(200).send({ ok: true })
    }

    const mpId = event.data.id
    let mpSub
    try {
      mpSub = await getSubscription(mpId)
    } catch {
      return reply.status(422).send({ error: 'Falha ao buscar assinatura no MP' })
    }

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.mpSubscriptionId, mpId),
    })

    if (!sub) return reply.status(404).send({ error: 'Assinatura não encontrada localmente' })

    const newStatus = mpSub.status
    const nextPayment = mpSub.next_payment_date
      ? new Date(mpSub.next_payment_date).toISOString().slice(0, 10)
      : null

    await db
      .update(subscriptions)
      .set({ status: newStatus, nextPaymentDate: nextPayment })
      .where(eq(subscriptions.id, sub.id))

    // Atualiza plano e validade do usuário conforme status
    if (newStatus === 'authorized') {
      const planName = PLAN_BY_REASON[mpSub.reason] ?? 'pro'
      const expiresAt = nextPayment ? new Date(nextPayment) : null
      await db
        .update(users)
        .set({ plan: planName, planExpiresAt: expiresAt })
        .where(eq(users.id, sub.userId))
    } else if (newStatus === 'cancelled') {
      await db
        .update(users)
        .set({ plan: 'free', planExpiresAt: null })
        .where(eq(users.id, sub.userId))
    }

    return reply.status(200).send({ ok: true })
  })
}
