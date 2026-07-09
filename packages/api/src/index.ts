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

// 1. CORS — primeiro de tudo, antes de qualquer rota ou plugin
await app.register(cors, {
  origin: (origin, cb) => {
    const allowed = [
      'https://edita-doc-api.vercel.app',
      'http://localhost:5173',
    ]
    if (!origin || allowed.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflight: true,
  strictPreflight: false,
})

// 2. Multipart (upload de PDF)
await app.register(multipart)

// 3. Parser JSON com preservação do raw body para verificação HMAC do webhook MP
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  ;(req as unknown as { rawBody: string }).rawBody = body as string
  try {
    done(null, JSON.parse(body as string))
  } catch (e) {
    done(e as Error)
  }
})

// 4. Rotas
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
