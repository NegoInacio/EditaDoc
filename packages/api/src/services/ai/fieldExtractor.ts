import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../env.js'
import type { TemplateField } from '../../db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const systemPrompt = readFileSync(join(__dirname, 'prompts/fieldExtractor.txt'), 'utf-8')

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type ExtractResult = {
  body: string
  fields: TemplateField[]
}

export async function extractFields(documentBody: string): Promise<Result<ExtractResult>> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: documentBody }],
  })

  const text = message.content.find((b) => b.type === 'text')?.text ?? ''

  try {
    const parsed = JSON.parse(text) as ExtractResult
    if (!parsed.body || !Array.isArray(parsed.fields)) {
      return { ok: false, error: 'Estrutura de resposta inesperada do fieldExtractor' }
    }
    return { ok: true, data: parsed }
  } catch {
    return { ok: false, error: 'Falha ao parsear resposta da IA no fieldExtractor' }
  }
}
