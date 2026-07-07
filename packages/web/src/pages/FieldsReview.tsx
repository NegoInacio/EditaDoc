import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useFlow } from '../lib/flowContext'
import type { Template, CompanyProfile } from '../lib/types'

export default function FieldsReview() {
  const navigate = useNavigate()
  const {
    analyzeResult,
    setSelectedTemplate, setSelectedProfile, setManualValues, setLicitacaoRef, setGeneratedDocId,
    manualValues, licitacaoRef,
  } = useFlow()

  const [templates, setTemplates] = useState<Template[]>([])
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [chosenTemplateId, setChosenTemplateId] = useState<string>('')
  const [chosenProfileId, setChosenProfileId] = useState<string>('')
  const [localManual, setLocalManual] = useState<Record<string, string>>(manualValues)
  const [localRef, setLocalRef] = useState(licitacaoRef)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!analyzeResult) { navigate('/'); return }

    Promise.all([
      api.get<Template[]>('/templates'),
      api.get<CompanyProfile[]>('/profiles'),
    ]).then(([tmpl, prof]) => {
      // Mostrar apenas templates extraídos do edital + demais da biblioteca
      const extractedIds = new Set(analyzeResult.templates.map((t) => t.id))
      const ordered = [...tmpl.filter((t) => extractedIds.has(t.id)), ...tmpl.filter((t) => !extractedIds.has(t.id))]
      setTemplates(ordered)
      setProfiles(prof)
      if (ordered.length > 0) setChosenTemplateId(ordered[0].id)
      if (prof.length > 0) setChosenProfileId(prof[0].id)
    })
  }, [analyzeResult, navigate])

  const chosenTemplate = templates.find((t) => t.id === chosenTemplateId)
  const manualFields = chosenTemplate?.fields.filter((f) => !f.auto) ?? []

  async function handleGenerate() {
    setError(null)
    setLoading(true)
    try {
      const doc = await api.post<{ id: string; title: string; bodyFilled: string }>('/documents/generate', {
        templateId: chosenTemplateId,
        profileId: chosenProfileId,
        manualValues: localManual,
        licitacaoRef: localRef || undefined,
      })
      const tmpl = templates.find((t) => t.id === chosenTemplateId)!
      const prof = profiles.find((p) => p.id === chosenProfileId)!
      setSelectedTemplate(tmpl)
      setSelectedProfile(prof)
      setManualValues(localManual)
      setLicitacaoRef(localRef)
      setGeneratedDocId(doc.id)
      navigate('/export')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar documento')
    } finally {
      setLoading(false)
    }
  }

  if (!analyzeResult) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EditaDoc</h1>
          <p className="text-gray-500 mt-1">
            Passo 2 de 3 — Revisar campos · {analyzeResult.new} novo(s), {analyzeResult.duplicates} duplicata(s)
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={chosenTemplateId}
              onChange={(e) => setChosenTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de empresa</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={chosenProfileId}
              onChange={(e) => setChosenProfileId(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.cnpj}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referência da licitação <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Pregão 012/2025 - PMPA"
              value={localRef}
              onChange={(e) => setLocalRef(e.target.value)}
            />
          </div>

          {manualFields.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Campos manuais</p>
              <div className="space-y-3">
                {manualFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input
                      type={f.type === 'date' ? 'date' : 'text'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={localManual[f.key] ?? ''}
                      onChange={(e) => setLocalManual((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={handleGenerate}
              disabled={!chosenTemplateId || !chosenProfileId || loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Gerando...' : 'Gerar documento →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
