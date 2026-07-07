import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const systemPrompt = readFileSync(join(__dirname, 'prompts/segmenter.txt'), 'utf-8')

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export type SegmentResult = {
  title: string
  category: 'declaracao' | 'proposta' | 'credencial' | 'planilha' | 'outro'
  start_marker: string
  end_marker: string
  body: string
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function segmentEdital(editalText: string): Promise<Result<SegmentResult[]>> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: editalText }],
  })

  const text = message.content.find((b) => b.type === 'text')?.text ?? ''

  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return { ok: false, error: 'Resposta da IA não é um array' }
    return { ok: true, data: parsed as SegmentResult[] }
  } catch {
    return { ok: false, error: 'Falha ao parsear resposta da IA no segmenter' }
  }
}
