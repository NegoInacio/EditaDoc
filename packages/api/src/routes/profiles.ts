import type { FastifyInstance } from 'fastify'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { companyProfiles } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

const PROFILE_LIMITS: Record<string, number> = { free: 1, pro: 5, agency: Infinity }

const profileBody = z.object({
  name: z.string().min(1),
  razaoSocial: z.string().min(1),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().length(2).optional(),
  cep: z.string().optional(),
  representanteNome: z.string().optional(),
  representanteCpf: z.string().optional(),
  representanteCargo: z.string().optional(),
  dadosExtras: z.record(z.unknown()).optional(),
})

export async function profilesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/profiles', async (req) => {
    const rows = await db.query.companyProfiles.findMany({
      where: eq(companyProfiles.userId, req.user.sub),
      orderBy: (t, { asc }) => asc(t.createdAt),
    })
    return rows
  })

  app.post('/profiles', async (req, reply) => {
    const result = profileBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const limit = PROFILE_LIMITS[req.user.plan] ?? 1
    if (limit !== Infinity) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(companyProfiles)
        .where(eq(companyProfiles.userId, req.user.sub))

      if (Number(total) >= limit) {
        return reply.status(403).send({ error: `Limite de ${limit} perfil(is) para o plano ${req.user.plan}` })
      }
    }

    const { dadosExtras, ...rest } = result.data
    const [profile] = await db
      .insert(companyProfiles)
      .values({ ...rest, dadosExtras: dadosExtras ?? null, userId: req.user.sub })
      .returning()

    return reply.status(201).send(profile)
  })

  app.put('/profiles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = profileBody.partial().safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const existing = await db.query.companyProfiles.findFirst({
      where: and(eq(companyProfiles.id, id), eq(companyProfiles.userId, req.user.sub)),
    })
    if (!existing) return reply.status(404).send({ error: 'Perfil não encontrado' })

    const [updated] = await db
      .update(companyProfiles)
      .set(result.data)
      .where(and(eq(companyProfiles.id, id), eq(companyProfiles.userId, req.user.sub)))
      .returning()

    return updated
  })

  app.delete('/profiles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await db.query.companyProfiles.findFirst({
      where: and(eq(companyProfiles.id, id), eq(companyProfiles.userId, req.user.sub)),
    })
    if (!existing) return reply.status(404).send({ error: 'Perfil não encontrado' })

    await db
      .delete(companyProfiles)
      .where(and(eq(companyProfiles.id, id), eq(companyProfiles.userId, req.user.sub)))

    return reply.status(204).send()
  })
}
