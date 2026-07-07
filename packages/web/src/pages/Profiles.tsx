import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { CompanyProfile } from '../lib/types'

const EMPTY = {
  name: '', razaoSocial: '', cnpj: '',
  endereco: '', cidade: '', uf: '', cep: '',
  representanteNome: '', representanteCpf: '', representanteCargo: '',
}

export default function Profiles() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await api.get<CompanyProfile[]>('/profiles').catch(() => [])
    setProfiles(data)
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/profiles/${editId}`, form)
      } else {
        await api.post('/profiles', form)
      }
      setForm(EMPTY)
      setEditId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover perfil?')) return
    await api.delete(`/profiles/${id}`)
    await load()
  }

  function startEdit(p: CompanyProfile) {
    setEditId(p.id)
    setForm({ name: p.name, razaoSocial: p.razaoSocial, cnpj: p.cnpj, endereco: '', cidade: p.cidade ?? '', uf: p.uf ?? '', cep: '', representanteNome: '', representanteCpf: '', representanteCargo: '' })
  }

  const field = (key: keyof typeof EMPTY, label: string, placeholder = '') => (
    <div key={key}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfis de empresa</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <p className="text-sm font-medium text-gray-700">{editId ? 'Editar perfil' : 'Novo perfil'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('name', 'Nome amigável', 'Construtora X - RS')}
            {field('razaoSocial', 'Razão social')}
            {field('cnpj', 'CNPJ (14 dígitos)', '00000000000000')}
            {field('cidade', 'Cidade')}
            {field('uf', 'UF', 'RS')}
            {field('representanteNome', 'Representante')}
            {field('representanteCargo', 'Cargo')}
            {field('representanteCpf', 'CPF do representante')}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            {editId && (
              <button onClick={() => { setEditId(null); setForm(EMPTY) }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.razaoSocial || !form.cnpj}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Criar perfil'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">{p.razaoSocial} · {p.cnpj}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => startEdit(p)} className="text-sm text-blue-600 hover:text-blue-800">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="text-sm text-red-500 hover:text-red-700">Remover</button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhum perfil cadastrado.</p>}
        </div>
      </div>
    </div>
  )
}
