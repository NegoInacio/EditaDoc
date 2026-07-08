import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { CompanyProfile, TemplateField } from '../db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Template Word base com formatação oficial brasileira (Times New Roman 12pt, margens 2.5cm)
const BASE_TEMPLATE_PATH = join(__dirname, 'assets/base_template.docx')

export function fillTemplate(
  body: string,
  fields: TemplateField[],
  profile: CompanyProfile,
  manualValues: Record<string, string>,
): string {
  let filled = body
  for (const field of fields) {
    const value = field.auto
      ? ((profile[field.profile_field as keyof CompanyProfile] as string) ?? '')
      : (manualValues[field.key] ?? `[${field.label}]`)
    filled = filled.replaceAll(`{{${field.key}}}`, value)
  }
  return filled
}

export async function generateDocx(data: Record<string, string>): Promise<Buffer> {
  const templateBuffer = readFileSync(BASE_TEMPLATE_PATH)
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
