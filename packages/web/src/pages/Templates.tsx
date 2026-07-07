import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Template } from '../lib/types'

const CATEGORIES: Record<string, string> = {
  declaracao: 'Declaração',
  proposta: 'Proposta',
  credencial: 'Credencial',
  planilha: 'Planilha',
  outro: 'Outro',
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get<Template[]>('/templates').then(setTemplates).catch(() => {})
  }, [])

  const filtered = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(filter.toLowerCase()) ||
      (t.category ?? '').toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca de templates</h1>
          <span className="text-sm text-gray-400">{templates.length} template(s)</span>
        </div>

        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por título ou categoria..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {CATEGORIES[t.category ?? ''] ?? t.category ?? 'Outro'}
                    {' · '}{t.fields.length} campos
                    {' · '}{t.usageCount} uso(s)
                  </p>
                </div>
                {t.isPublic && (
                  <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">público</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum template encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
