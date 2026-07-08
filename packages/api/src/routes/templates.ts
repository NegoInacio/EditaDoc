import type { FastifyInstance } from 'fastify'
import { eq, or, isNull, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { templates } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { requirePlan } from '../middleware/requirePlan.js'
import type { TemplateField } from '../db/schema.js'

const templateBody = z.object({
  title: z.string().min(1),
  category: z.enum(['declaracao', 'proposta', 'credencial', 'planilha', 'outro']).optional(),
  body: z.string().min(1),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['text', 'date', 'number']),
      auto: z.boolean(),
      profile_field: z.string().nullable(),
    }),
  ),
  estado: z.string().length(2).nullable().optional(),
  isPublic: z.boolean().default(false),
})

const listQuery = z.object({
  category: z.string().optional(),
  estado: z.string().optional(),
  q: z.string().optional(),
})

export async function templatesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /templates — públicos + próprios, com filtros opcionais
  app.get('/templates', async (req) => {
    const query = listQuery.parse(req.query)

    const rows = await db.query.templates.findMany({
      where: or(eq(templates.isPublic, true), eq(templates.ownerId, req.user.sub)),
      orderBy: (t, { desc }) => desc(t.usageCount),
    })

    let result = rows

    if (query.category) {
      result = result.filter((t) => t.category === query.category)
    }
    if (query.estado) {
      result = result.filter((t) => t.estado === query.estado || t.estado === null)
    }
    if (query.q) {
      const q = query.q.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    return result
  })

  // GET /templates/:id — detalhe de um template acessível ao usuário
  app.get('/templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const template = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, id),
        or(eq(templates.isPublic, true), eq(templates.ownerId, req.user.sub)),
      ),
    })

    if (!template) return reply.status(404).send({ error: 'Template não encontrado' })
    return template
  })

  // POST /templates — salvar template manualmente (plano pro+)
  app.post('/templates', { preHandler: requirePlan('pro') }, async (req, reply) => {
    const result = templateBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { title, category, body, fields, estado, isPublic } = result.data

    const [saved] = await db
      .insert(templates)
      .values({
        title,
        category: category ?? null,
        body,
        fields: fields as TemplateField[],
        estado: estado ?? null,
        isPublic,
        ownerId: req.user.sub,
      })
      .returning()

    return reply.status(201).send(saved)
  })

  // DELETE /templates/:id — remover template próprio (plano pro+)
  app.delete('/templates/:id', { preHandler: requirePlan('pro') }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await db.query.templates.findFirst({
      where: and(eq(templates.id, id), eq(templates.ownerId, req.user.sub)),
    })

    if (!existing) return reply.status(404).send({ error: 'Template não encontrado ou sem permissão' })

    await db.delete(templates).where(and(eq(templates.id, id), eq(templates.ownerId, req.user.sub)))

    return reply.status(204).send()
  })
}
