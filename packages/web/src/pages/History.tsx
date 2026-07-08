import { useState, useEffect } from 'react'
import { api } from '../lib/api'

type HistoryItem = {
  id: string
  title: string
  licitacaoRef: string | null
  exportedAt: string | null
  createdAt: string
}

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export default function History() {
  const [docs, setDocs] = useState<HistoryItem[]>([])

  useEffect(() => {
    api.get<HistoryItem[]>('/documents').then(setDocs).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>

        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{d.title}</p>
                <p className="text-sm text-gray-500">
                  {d.licitacaoRef ?? '—'} · {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                  {d.exportedAt && ' · exportado'}
                </p>
              </div>
              <a
                href={`${BASE}/documents/${d.id}/export?format=docx`}
                download
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                .docx
              </a>
            </div>
          ))}
          {docs.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhum documento gerado ainda.</p>}
        </div>
      </div>
    </div>
  )
}
