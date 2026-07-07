/**
 * Script one-shot para gerar o base_template.docx.
 * Rodar uma vez: tsx src/services/assets/generate_base_template.ts
 *
 * Produz um DOCX com formatação oficial brasileira:
 * - Fonte Times New Roman 12pt
 * - Margens 2,5cm em todos os lados
 * - Espaçamento 1,5
 * - Campo {{{content}}} onde o texto preenchido é inserido
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24 }, // 24 half-points = 12pt
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 }, // ~2.5cm em twips
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360 }, // 360 = 1.5 line spacing (240 = single)
          children: [new TextRun('{{{content}}}')],
        }),
      ],
    },
  ],
})

mkdirSync(__dirname, { recursive: true })
const buf = await Packer.toBuffer(doc)
writeFileSync(join(__dirname, 'base_template.docx'), buf)
console.log('base_template.docx gerado.')
