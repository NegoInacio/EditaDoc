import Fastify from 'fastify'
import { env } from './env.js'

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
