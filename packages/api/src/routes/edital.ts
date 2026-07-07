import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { runEditalPipeline } from '../services/ai/pipeline.js'

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
}
