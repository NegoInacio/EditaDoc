import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'

export async function templatesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  // implementado no passo 10
}
