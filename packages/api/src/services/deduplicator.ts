import { createHash } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { templates } from '../db/schema.js'
import type { TemplateField } from '../db/schema.js'

function normalizeBody(body: string): string {
  return body
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type DedupeInput = {
  title: string
  category: string
  body: string
  fields: TemplateField[]
  estado?: string | null
  ownerId?: string | null
  isPublic?: boolean
}

export async function deduplicateAndSave(input: DedupeInput): Promise<Result<{ id: string; isDuplicate: boolean }>> {
  const normalized = normalizeBody(input.body)
  const hash = sha256(normalized)

  const exactMatch = await db.query.templates.findFirst({
    where: eq(templates.sourceHash, hash),
  })

  if (exactMatch) {
    await db
      .update(templates)
      .set({ usageCount: sql`${templates.usageCount} + 1` })
      .where(eq(templates.id, exactMatch.id))
    return { ok: true, data: { id: exactMatch.id, isDuplicate: true } }
  }

  // Busca por similaridade via pg_trgm (SQL raw permitido conforme convenção)
  const similar = await db.execute<{ id: string; sim: number }>(
    sql`SELECT id, similarity(body, ${input.body}) AS sim
        FROM templates
        WHERE similarity(body, ${input.body}) > 0.85
        ORDER BY sim DESC
        LIMIT 1`,
  )

  if (similar.rows.length > 0) {
    const match = similar.rows[0]
    await db
      .update(templates)
      .set({ usageCount: sql`${templates.usageCount} + 1` })
      .where(eq(templates.id, match.id))
    return { ok: true, data: { id: match.id, isDuplicate: true } }
  }

  const [saved] = await db
    .insert(templates)
    .values({
      title: input.title,
      category: input.category,
      body: input.body,
      fields: input.fields,
      sourceHash: hash,
      estado: input.estado ?? null,
      ownerId: input.ownerId ?? null,
      isPublic: input.isPublic ?? false,
    })
    .returning({ id: templates.id })

  return { ok: true, data: { id: saved.id, isDuplicate: false } }
}
