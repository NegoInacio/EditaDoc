import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { env } from './env.js'
import { authRoutes } from './routes/auth.js'
import { profilesRoutes } from './routes/profiles.js'
import { editalRoutes } from './routes/edital.js'
import { documentsRoutes } from './routes/documents.js'
import { templatesRoutes } from './routes/templates.js'
import { subscriptionsRoutes } from './routes/subscriptions.js'

const app = Fastify({ logger: true })

// CORS antes de qualquer rota
await app.register(cors, {
  origin: [
    'https://edita-doc-api.vercel.app',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

await app.register(multipart)

// Responde preflights OPTIONS em qualquer rota
app.options('*', (_, reply) => { reply.send() })

// Parser adicional para o webhook do MP — guarda raw body antes do JSON.parse
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  ;(req as unknown as { rawBody: string }).rawBody = body as string
  try {
    done(null, JSON.parse(body as string))
  } catch (e) {
    done(e as Error)
  }
})

app.get('/health', async () => ({ status: 'ok' }))

await app.register(authRoutes)
await app.register(profilesRoutes)
await app.register(editalRoutes)
await app.register(documentsRoutes)
await app.register(templatesRoutes)
await app.register(subscriptionsRoutes)

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
