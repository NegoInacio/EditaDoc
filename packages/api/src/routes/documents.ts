import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and, count, gte, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { generatedDocuments, templates, companyProfiles } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { fillTemplate, generateDocx } from '../services/docGenerator.js'
import type { TemplateField } from '../db/schema.js'

const MONTHLY_LIMITS: Record<string, number> = { free: 5, pro: Infinity, agency: Infinity }

const generateBody = z.object({
  templateId: z.string().uuid(),
  profileId: z.string().uuid(),
  manualValues: z.record(z.string()).default({}),
  licitacaoRef: z.string().optional(),
})

export async function documentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.post('/documents/generate', async (req, reply) => {
    const result = generateBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { templateId, profileId, manualValues, licitacaoRef } = result.data

    // Verificar limite mensal do plano free
    const limit = MONTHLY_LIMITS[req.user.plan] ?? 5
    if (limit !== Infinity) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [{ total }] = await db
        .select({ total: count() })
        .from(generatedDocuments)
        .where(
          and(
            eq(generatedDocuments.userId, req.user.sub),
            gte(generatedDocuments.createdAt, startOfMonth),
          ),
        )

      if (Number(total) >= limit) {
        return reply.status(403).send({ error: `Limite de ${limit} documentos/mês para o plano ${req.user.plan}` })
      }
    }

    const template = await db.query.templates.findFirst({ where: eq(templates.id, templateId) })
    if (!template) return reply.status(404).send({ error: 'Template não encontrado' })

    const profile = await db.query.companyProfiles.findFirst({
      where: and(eq(companyProfiles.id, profileId), eq(companyProfiles.userId, req.user.sub)),
    })
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' })

    const fields = template.fields as TemplateField[]
    const bodyFilled = fillTemplate(template.body, fields, profile, manualValues)

    const [doc] = await db
      .insert(generatedDocuments)
      .values({
        userId: req.user.sub,
        profileId,
        templateId,
        title: template.title,
        bodyFilled,
        fieldsUsed: manualValues,
        licitacaoRef: licitacaoRef ?? null,
      })
      .returning()

    // Incrementar uso do template
    await db
      .update(templates)
      .set({ usageCount: sql`${templates.usageCount} + 1` })
      .where(eq(templates.id, templateId))

    return reply.status(201).send({ id: doc.id, title: doc.title, bodyFilled })
  })

  app.get('/documents', async (req) => {
    const docs = await db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.userId, req.user.sub),
      orderBy: (t, { desc }) => desc(t.createdAt),
      columns: {
        id: true,
        title: true,
        licitacaoRef: true,
        exportedAt: true,
        createdAt: true,
      },
    })
    return docs
  })

  app.get('/documents/:id/export', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { format = 'docx' } = req.query as { format?: string }

    const doc = await db.query.generatedDocuments.findFirst({
      where: and(eq(generatedDocuments.id, id), eq(generatedDocuments.userId, req.user.sub)),
    })
    if (!doc) return reply.status(404).send({ error: 'Documento não encontrado' })

    if (format === 'txt') {
      await db.update(generatedDocuments).set({ exportedAt: new Date() }).where(eq(generatedDocuments.id, id))
      return reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${doc.title}.txt"`)
        .send(doc.bodyFilled)
    }

    // docx
    const data = { content: doc.bodyFilled }
    const buffer = await generateDocx(data)

    await db.update(generatedDocuments).set({ exportedAt: new Date() }).where(eq(generatedDocuments.id, id))

    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .header('Content-Disposition', `attachment; filename="${doc.title}.docx"`)
      .send(buffer)
  })
}
