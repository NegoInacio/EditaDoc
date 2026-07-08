import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { requirePlan } from '../middleware/requirePlan.js'
import { runEditalPipeline } from '../services/ai/pipeline.js'
import { extractTextFromPdf } from '../services/pdfParser.js'

const analyzeBody = z.object({
  text: z.string().min(100, 'Texto do edital muito curto'),
})

export async function editalRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.post('/edital/analyze', async (req, reply) => {
    const result = analyzeBody.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const pipeline = await runEditalPipeline({
      editalText: result.data.text,
      ownerId: req.user.sub,
    })

    if (!pipeline.ok) {
      return reply.status(422).send({ error: pipeline.error })
    }

    return reply.status(200).send({
      templates: pipeline.data,
      total: pipeline.data.length,
      duplicates: pipeline.data.filter((t) => t.isDuplicate).length,
      new: pipeline.data.filter((t) => !t.isDuplicate).length,
    })
  })

  // Upload de PDF — plano pro ou superior (seção 8 do reference doc)
  app.post('/edital/upload-pdf', { preHandler: requirePlan('pro') }, async (req, reply) => {
    const file = await req.file()
    if (!file) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    if (file.mimetype !== 'application/pdf') {
      return reply.status(415).send({ error: 'Apenas arquivos PDF são aceitos' })
    }

    const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
    const chunks: Buffer[] = []
    let total = 0

    for await (const chunk of file.file) {
      total += chunk.length
      if (total > MAX_BYTES) {
        return reply.status(413).send({ error: 'PDF excede o limite de 20 MB' })
      }
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const parsed = await extractTextFromPdf(buffer)

    if (!parsed.ok) {
      return reply.status(422).send({ error: parsed.error })
    }

    // Retorna o texto extraído para o cliente prosseguir com /edital/analyze
    // ou já roda o pipeline diretamente
    const pipeline = await runEditalPipeline({
      editalText: parsed.data,
      ownerId: req.user.sub,
    })

    if (!pipeline.ok) {
      return reply.status(422).send({ error: pipeline.error })
    }

    return reply.status(200).send({
      templates: pipeline.data,
      total: pipeline.data.length,
      duplicates: pipeline.data.filter((t) => t.isDuplicate).length,
      new: pipeline.data.filter((t) => !t.isDuplicate).length,
      extractedChars: parsed.data.length,
    })
  })
}
