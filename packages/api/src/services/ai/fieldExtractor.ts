import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../env.js'
import type { TemplateField } from '../../db/schema.js'

const systemPrompt = `Analise o modelo de documento abaixo e identifique todos os campos variáveis — tanto explícitos (marcados com [], ___, XXXXX, ou similar) quanto implícitos (onde o contexto indica que um dado da empresa licitante deve ser inserido).

Normalize os campos para os tipos padrão quando aplicável:
razao_social, cnpj, endereco, cidade, uf, cep, representante_nome, representante_cpf, representante_cargo, data_assinatura, numero_pregao, numero_processo, orgao_licitante, objeto_licitacao.

Para campos não mapeáveis, use key descritiva em snake_case.

Retorne o texto do modelo com campos substituídos por {{key}} e o array de fields.

O JSON de retorno deve ter exatamente este formato:
{
  "body": "<texto do modelo com {{key}} nos campos>",
  "fields": [
    {
      "key": "razao_social",
      "label": "Razão social",
      "type": "text",
      "auto": true,
      "profile_field": "razaoSocial"
    }
  ]
}

Retorne apenas JSON, sem texto adicional.`

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
