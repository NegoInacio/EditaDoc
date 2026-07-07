import Fastify from 'fastify'
import { env } from './env.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

await app.register(authRoutes)

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
