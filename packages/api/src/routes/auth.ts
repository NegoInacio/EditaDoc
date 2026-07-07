import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { env } from '../env.js'
import { authenticate } from '../middleware/auth.js'

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
})

function resolveEffectivePlan(plan: string, expiresAt: Date | null): string {
  if (plan === 'free') return 'free'
  if (expiresAt && expiresAt < new Date()) return 'free'
  return plan
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const result = registerBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { email, password } = result.data

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existing) {
      return reply.status(409).send({ error: 'E-mail já cadastrado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await db.insert(users).values({ email, passwordHash }).returning({
      id: users.id,
      email: users.email,
      plan: users.plan,
    })

    const token = jwt.sign(
      { sub: user.id, email: user.email, plan: user.plan },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return reply.status(201).send({ token, user })
  })

  app.post('/auth/login', async (req, reply) => {
    const result = loginBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { email, password } = result.data

    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const effectivePlan = resolveEffectivePlan(user.plan, user.planExpiresAt ?? null)

    const token = jwt.sign(
      { sub: user.id, email: user.email, plan: effectivePlan },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return reply.send({
      token,
      user: { id: user.id, email: user.email, plan: effectivePlan },
    })
  })

  // GET /auth/me — plano efetivo revalidado (útil após webhook de pagamento)
  app.get('/auth/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.sub),
      columns: { id: true, email: true, plan: true, planExpiresAt: true, createdAt: true },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const effectivePlan = resolveEffectivePlan(user.plan, user.planExpiresAt ?? null)
    return { ...user, plan: effectivePlan }
  })
}
