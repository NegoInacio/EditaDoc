import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useFlow } from '../lib/flowContext'
import type { AnalyzeResult } from '../lib/types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function uploadPdf(file: File): Promise<AnalyzeResult> {
  const token = localStorage.getItem('token')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/edital/upload-pdf`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Erro ${res.status}`)
  }
  return res.json()
}

export default function EditalInput() {
  const navigate = useNavigate()
  const { setAnalyzeResult } = useFlow()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAnalyze() {
    setError(null)
    setLoading(true)
    try {
      const result = await api.post<AnalyzeResult>('/edital/analyze', { text })
      setAnalyzeResult(result)
      navigate('/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar edital')
    } finally {
      setLoading(false)
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const result = await uploadPdf(file)
      setAnalyzeResult(result)
      navigate('/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar PDF')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">EditaDoc</h1>
          <p className="text-gray-500 mt-1">Passo 1 de 3 — Cole o texto ou faça upload do edital</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {/* Upload PDF */}
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-600">Clique para enviar um PDF</p>
            <p className="text-xs text-gray-400">Máx. 20 MB · requer plano Pro</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou cole o texto</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Texto colado */}
          <div>
            <textarea
              className="w-full h-56 rounded-lg border border-gray-300 p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cole aqui o texto completo do edital licitatório..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{text.length} caracteres</span>
            <button
              onClick={handleAnalyze}
              disabled={text.length < 100 || loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analisando...' : 'Analisar edital →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
