import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export type JwtPayload = {
  sub: string
  email: string
  plan: string
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token não informado' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = payload
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}
