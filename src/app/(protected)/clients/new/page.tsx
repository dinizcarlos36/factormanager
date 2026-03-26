'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import { validateCNPJ, parseCNPJ } from '@/lib/utils'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    cnpj: '', razao_social: '', nome_fantasia: '', email: '', phone: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
    banco: '', agencia: '', conta: '', tipo_conta: 'corrente', pix: '',
    credit_limit: '',
    contact_name: '', contact_role: '', contact_email: '', contact_phone: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cnpj = parseCNPJ(form.cnpj)
    if (!validateCNPJ(cnpj)) {
      setError('CNPJ inválido')
      setLoading(false)
      return
    }

    const { data: userData } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id

    const { data, error: dbError } = await insforge.database.from('clients').insert([{
      cnpj,
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      email: form.email || null,
      phone: form.phone || null,
      address: {
        rua: form.rua, numero: form.numero, bairro: form.bairro,
        cidade: form.cidade, uf: form.uf, cep: form.cep,
      },
      bank_info: {
        banco: form.banco, agencia: form.agencia, conta: form.conta,
        tipo: form.tipo_conta, pix: form.pix,
      },
      credit_limit: parseFloat(form.credit_limit) || 0,
      status: 'rascunho',
      created_by: userId,
    }]).select()

    if (dbError) {
      setError(dbError.message || 'Erro ao cadastrar cliente')
      setLoading(false)
      return
    }

    // Create contact if provided
    if (form.contact_name && data?.[0]?.id) {
      await insforge.database.from('client_contacts').insert([{
        client_id: data[0].id,
        name: form.contact_name,
        role: form.contact_role || null,
        email: form.contact_email || null,
        phone: form.contact_phone || null,
        is_legal_rep: true,
      }])
    }

    // Audit log
    if (data?.[0]?.id) {
      await insforge.database.from('audit_logs').insert([{
        user_id: userId,
        action: 'create_client',
        entity_type: 'client',
        entity_id: data[0].id,
        details: { razao_social: form.razao_social, cnpj },
      }])
    }

    router.push('/clients')
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 placeholder:text-slate-400 bg-white'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Novo Cliente</h1>
        <p className="text-sm text-slate-500 mt-1">Cadastre um novo aderente na plataforma</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Empresa */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados da Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CNPJ *</label>
              <input name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Razão Social *</label>
              <input name="razao_social" value={form.razao_social} onChange={handleChange} placeholder="Nome da empresa" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Nome Fantasia</label>
              <input name="nome_fantasia" value={form.nome_fantasia} onChange={handleChange} placeholder="Nome fantasia" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Limite de Crédito (R$)</label>
              <input name="credit_limit" type="number" step="0.01" value={form.credit_limit} onChange={handleChange} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="empresa@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Rua</label>
              <input name="rua" value={form.rua} onChange={handleChange} placeholder="Rua, Avenida..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input name="numero" value={form.numero} onChange={handleChange} placeholder="123" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bairro</label>
              <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Cidade" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <input name="uf" value={form.uf} onChange={handleChange} placeholder="SP" maxLength={2} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados Bancários</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Banco</label>
              <input name="banco" value={form.banco} onChange={handleChange} placeholder="Bradesco" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Agência</label>
              <input name="agencia" value={form.agencia} onChange={handleChange} placeholder="1234" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Conta</label>
              <input name="conta" value={form.conta} onChange={handleChange} placeholder="56789-0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select name="tipo_conta" value={form.tipo_conta} onChange={handleChange} className={inputClass}>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Chave Pix</label>
              <input name="pix" value={form.pix} onChange={handleChange} placeholder="CNPJ, email, celular..." className={inputClass} />
            </div>
          </div>
        </div>

        {/* Contato Principal */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Responsável Legal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome</label>
              <input name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Nome completo" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cargo</label>
              <input name="contact_role" value={form.contact_role} onChange={handleChange} placeholder="Sócio Administrador" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} placeholder="contato@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="(11) 99999-9999" className={inputClass} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-60 shadow-md">
            {loading ? 'Salvando...' : 'Cadastrar Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
