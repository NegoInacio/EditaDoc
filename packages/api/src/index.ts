import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { env } from './env.js'
import { authRoutes } from './routes/auth.js'
import { profilesRoutes } from './routes/profiles.js'
import { editalRoutes } from './routes/edital.js'
import { documentsRoutes } from './routes/documents.js'
import { templatesRoutes } from './routes/templates.js'

const app = Fastify({ logger: true })

await app.register(multipart)

app.get('/health', async () => ({ status: 'ok' }))

await app.register(authRoutes)
await app.register(profilesRoutes)
await app.register(editalRoutes)
await app.register(documentsRoutes)
await app.register(templatesRoutes)

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
