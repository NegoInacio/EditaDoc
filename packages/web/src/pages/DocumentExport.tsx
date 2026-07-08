import { useNavigate } from 'react-router-dom'
import { useFlow } from '../lib/flowContext'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export default function DocumentExport() {
  const navigate = useNavigate()
  const { selectedTemplate, selectedProfile, generatedDocId, licitacaoRef, reset } = useFlow()

  if (!generatedDocId || !selectedTemplate || !selectedProfile) {
    navigate('/')
    return null
  }

  function exportUrl(format: 'docx' | 'txt') {
    return `${BASE}/documents/${generatedDocId}/export?format=${format}`
  }

  function handleNewDocument() {
    reset()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EditaDoc</h1>
          <p className="text-gray-500 mt-1">Passo 3 de 3 — Exportar documento</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{selectedTemplate.title}</p>
            {licitacaoRef && <p className="text-sm text-gray-500">{licitacaoRef}</p>}
            <p className="text-sm text-gray-500">
              Empresa: <span className="font-medium">{selectedProfile.name}</span>
              {selectedProfile.cidade && ` · ${selectedProfile.cidade}/${selectedProfile.uf}`}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Documento gerado com sucesso. Escolha o formato para baixar.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={exportUrl('docx')}
              download
              className="flex-1 text-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Baixar .docx
            </a>
            <a
              href={exportUrl('txt')}
              download
              className="flex-1 text-center px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Baixar .txt
            </a>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => navigate('/review')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={handleNewDocument}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Analisar outro edital →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
