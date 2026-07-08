import { segmentEdital } from './segmenter.js'
import { extractFields } from './fieldExtractor.js'
import { deduplicateAndSave } from '../deduplicator.js'

type PipelineInput = {
  editalText: string
  ownerId: string
}

export type PipelineTemplateResult = {
  id: string
  title: string
  category: string
  isDuplicate: boolean
  fieldsCount: number
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function runEditalPipeline(input: PipelineInput): Promise<Result<PipelineTemplateResult[]>> {
  const segmentResult = await segmentEdital(input.editalText)
  if (!segmentResult.ok) return segmentResult

  const results: PipelineTemplateResult[] = []

  for (const segment of segmentResult.data) {
    const extractResult = await extractFields(segment.body)
    if (!extractResult.ok) continue

    const { body, fields } = extractResult.data

    const dedupeResult = await deduplicateAndSave({
      title: segment.title,
      category: segment.category,
      body,
      fields,
      ownerId: input.ownerId,
      isPublic: false,
    })

    if (!dedupeResult.ok) continue

    results.push({
      id: dedupeResult.data.id,
      title: segment.title,
      category: segment.category,
      isDuplicate: dedupeResult.data.isDuplicate,
      fieldsCount: fields.length,
    })
  }

  return { ok: true, data: results }
}
