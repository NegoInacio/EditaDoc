import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { Template } from '../lib/types'

const CATEGORIES = [
  { value: '', label: 'Todas categorias' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'credencial', label: 'Credencial' },
  { value: 'planilha', label: 'Planilha' },
  { value: 'outro', label: 'Outro' },
]

const CATEGORY_LABEL: Record<string, string> = {
  declaracao: 'Declaração', proposta: 'Proposta',
  credencial: 'Credencial', planilha: 'Planilha', outro: 'Outro',
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [estado, setEstado] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (estado) params.set('estado', estado)
    const data = await api.get<Template[]>(`/templates?${params}`).catch(() => [])
    setTemplates(data)
  }, [q, category, estado])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Remover este template?')) return
    setDeleting(id)
    setError(null)
    try {
      await api.delete(`/templates/${id}`)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca de templates</h1>
          <span className="text-sm text-gray-400">{templates.length} resultado(s)</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por título..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            maxLength={2}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="UF"
            value={estado}
            onChange={(e) => setEstado(e.target.value.toUpperCase())}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Lista */}
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div
                className="px-5 py-4 flex items-start justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {CATEGORY_LABEL[t.category ?? ''] ?? 'Outro'}
                    {' · '}{(t.fields as unknown[]).length} campos
                    {' · '}{t.usageCount} uso(s)
                    {t.isPublic && <span className="ml-2 text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">público</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                    disabled={deleting === t.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remover
                  </button>
                  <span className="text-gray-400 text-xs">{expanded === t.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === t.id && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mt-3 mb-2">Corpo do template</p>
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {t.body}
                  </pre>
                  <p className="text-xs font-medium text-gray-500 mt-3 mb-2">Campos</p>
                  <div className="flex flex-wrap gap-2">
                    {(t.fields as Array<{ key: string; label: string; auto: boolean }>).map((f) => (
                      <span
                        key={f.key}
                        className={`text-xs rounded-full px-2 py-0.5 ${f.auto ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {f.label} {f.auto ? '(auto)' : '(manual)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {templates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum template encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
