'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import type { Client } from '@/lib/types'

export default function NewTitlePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])

  const [form, setForm] = useState({
    client_id: '', title_number: '', title_type: 'duplicata',
    face_value: '', due_date: '', debtor_name: '', debtor_cnpj: '', notes: '',
  })

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await insforge.database.from('clients').select('id, razao_social').eq('status', 'aprovado').order('razao_social')
      setClients((data || []) as Client[])
    }
    fetchClients()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: userData } = await insforge.auth.getCurrentUser()

    const { error: dbError } = await insforge.database.from('titles').insert([{
      client_id: form.client_id,
      title_number: form.title_number,
      title_type: form.title_type,
      face_value: parseFloat(form.face_value),
      due_date: form.due_date,
      debtor_name: form.debtor_name,
      debtor_cnpj: form.debtor_cnpj || null,
      notes: form.notes || null,
      status: 'disponivel',
      created_by: userData?.user?.id,
    }])

    if (dbError) {
      setError(dbError.message || 'Erro ao registrar título')
      setLoading(false)
      return
    }
    router.push('/titles')
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 placeholder:text-slate-400 bg-white'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Novo Título</h1>
        <p className="text-sm text-slate-500 mt-1">Registre uma duplicata, boleto ou nota fiscal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados do Título</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cliente (Aderente) *</label>
              <select name="client_id" value={form.client_id} onChange={handleChange} className={inputClass} required>
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número do Título *</label>
              <input name="title_number" value={form.title_number} onChange={handleChange} placeholder="0001" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Tipo *</label>
              <select name="title_type" value={form.title_type} onChange={handleChange} className={inputClass}>
                <option value="duplicata">Duplicata</option>
                <option value="boleto">Boleto</option>
                <option value="nota_fiscal">Nota Fiscal</option>
                <option value="contrato">Contrato</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Valor de Face (R$) *</label>
              <input name="face_value" type="number" step="0.01" value={form.face_value} onChange={handleChange} placeholder="25000.00" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Vencimento *</label>
              <input name="due_date" type="date" value={form.due_date} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Nome do Devedor *</label>
              <input name="debtor_name" value={form.debtor_name} onChange={handleChange} placeholder="Empresa devedora" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>CNPJ do Devedor</label>
              <input name="debtor_cnpj" value={form.debtor_cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Observações</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notas adicionais..." className={inputClass} rows={3} />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-60 shadow-md">
            {loading ? 'Salvando...' : 'Registrar Título'}
          </button>
        </div>
      </form>
    </div>
  )
}
