import { createHmac } from 'crypto'
import { env } from '../env.js'

const MP_API = 'https://api.mercadopago.com'

type MPSubscriptionStatus = 'authorized' | 'paused' | 'cancelled'

export type MPSubscription = {
  id: string
  status: MPSubscriptionStatus
  payer_id: string
  reason: string
  next_payment_date: string | null
}

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`MercadoPago ${res.status}: ${JSON.stringify(body)}`)
  }
  return res.json() as Promise<T>
}

const PLAN_PRICES: Record<string, { amount: number; reason: string }> = {
  pro: { amount: 79.9, reason: 'EditaDoc Pro' },
  agency: { amount: 249.9, reason: 'EditaDoc Agency' },
}

export async function createSubscription(params: {
  payerEmail: string
  plan: 'pro' | 'agency'
  backUrl: string
}): Promise<{ init_point: string; id: string }> {
  const { amount, reason } = PLAN_PRICES[params.plan]

  return mpFetch('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      status: 'pending',
    }),
  })
}

export async function getSubscription(mpSubscriptionId: string): Promise<MPSubscription> {
  return mpFetch<MPSubscription>(`/preapproval/${mpSubscriptionId}`)
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', env.MP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return expected === signature
}
