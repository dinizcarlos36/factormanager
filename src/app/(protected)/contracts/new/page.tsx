'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import { useRouter } from 'next/navigation'
import type { Client, ContractTemplate, Operation } from '@/lib/types'

export default function NewContractPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedOperation, setSelectedOperation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [clientsRes, templatesRes] = await Promise.all([
        insforge.database.from('clients').select('*'),
        insforge.database.from('contract_templates').select('*'),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (templatesRes.data) setTemplates(templatesRes.data)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      const fetchOps = async () => {
        const { data } = await insforge.database
          .from('operations')
          .select('*')
          .eq('client_id', selectedClient)
          .eq('status', 'aprovado') // Only approved ops can be contracted
        if (data) setOperations(data)
      }
      fetchOps()
    } else {
      setOperations([])
    }
  }, [selectedClient])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Logic for contract generation...
      setLoading(false)
      router.push('/contracts')
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Gerar Novo Contrato</h1>
        <p className="text-sm text-zinc-500">Selecione o cliente, operação e modelo para gerar o documento jurídico.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Selecione o Cliente</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Selecione...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Selecione a Operação Aprovada</label>
          <select
            value={selectedOperation}
            onChange={(e) => setSelectedOperation(e.target.value)}
            disabled={!selectedClient}
            className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-zinc-50"
          >
            <option value="">Selecione...</option>
            {operations.map(o => <option key={o.id} value={o.id}>Operação #{o.operation_number} - R$ {o.net_value.toLocaleString('pt-BR')}</option>)}
          </select>
          {!selectedClient && <p className="text-[10px] text-zinc-400 mt-1">Selecione um cliente primeiro</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Modelo de Contrato</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Selecione...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="pt-6 border-t border-zinc-100 flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedOperation || !selectedTemplate}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Gerando...' : 'Gerar e Enviar para Assinatura'}
          </button>
        </div>
      </div>
    </div>
  )
}
