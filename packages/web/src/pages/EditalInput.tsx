import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useFlow } from '../lib/flowContext'
import type { AnalyzeResult } from '../lib/types'

export default function EditalInput() {
  const navigate = useNavigate()
  const { setAnalyzeResult } = useFlow()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">EditaDoc</h1>
          <p className="text-gray-500 mt-1">Passo 1 de 3 — Cole o texto do edital</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Texto do edital
          </label>
          <textarea
            className="w-full h-64 rounded-lg border border-gray-300 p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cole aqui o texto completo do edital licitatório..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
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
