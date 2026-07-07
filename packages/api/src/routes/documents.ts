import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'

export async function documentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  // implementado no passo 7
}
