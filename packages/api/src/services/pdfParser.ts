import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Build legado não usa worker thread — necessário para Node.js (sem DOM)
GlobalWorkerOptions.workerSrc = ''

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function extractTextFromPdf(buffer: Buffer): Promise<Result<string>> {
  try {
    const uint8 = new Uint8Array(buffer)
    const pdf = await getDocument({
      data: uint8,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise

    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      pages.push(pageText)
    }

    const text = pages.join('\n\n').replace(/ {2,}/g, ' ').trim()
    if (text.length < 100) {
      return { ok: false, error: 'PDF não contém texto extraível (pode ser imagem escaneada)' }
    }

    return { ok: true, data: text }
  } catch (e) {
    return { ok: false, error: `Falha ao processar PDF: ${e instanceof Error ? e.message : String(e)}` }
  }
}
