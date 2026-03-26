'use client'

import { useEffect, useState, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import type { ContractTemplate } from '@/lib/types'

const VARIABLES = [
  { label: 'Razão Social', value: '{{razao_social}}' },
  { label: 'CNPJ/CPF', value: '{{documento}}' },
  { label: 'Endereço', value: '{{endereco}}' },
  { label: 'Valor da Operação', value: '{{valor_operacao}}' },
  { label: 'Data', value: '{{data_atual}}' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Partial<ContractTemplate>>({
    name: '',
    body: ''
  })

  const fetchTemplates = useCallback(async () => {
    const { data } = await insforge.database.from('contract_templates').select('*')
    if (data) setTemplates(data as ContractTemplate[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSave = async () => {
    if (currentTemplate.id) {
      await insforge.database
        .from('contract_templates')
        .update({
          name: currentTemplate.name,
          body: currentTemplate.body,
          is_active: true
        })
        .eq('id', currentTemplate.id)
    } else {
      await insforge.database
        .from('contract_templates')
        .insert([{
          name: currentTemplate.name,
          body: currentTemplate.body,
          is_active: true
        }])
    }
    setIsModalOpen(false)
    fetchTemplates()
  }

  const insertVariable = (variable: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      body: (prev.body || '') + variable
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Modelos de Contrato</h1>
          <p className="text-sm text-zinc-500">Crie e edite seus modelos de contrato com variáveis dinâmicas.</p>
        </div>
        <button
          onClick={() => {
            setCurrentTemplate({ name: '', body: '' })
            setIsModalOpen(true)
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-zinc-900">{template.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentTemplate(template)
                    setIsModalOpen(true)
                  }}
                  className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-3 mb-4">
              {template.body?.replace(/<[^>]*>/g, '') || 'Sem conteúdo'}
            </p>
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
              Última alteração: {new Date(template.updated_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        {templates.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-white border border-zinc-200 rounded-xl border-dashed">
            Nenhum modelo cadastrado.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">
                {currentTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Modelo</label>
                  <input
                    type="text"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-zinc-900"
                    placeholder="Ex: Contrato de Antecipação Padrão"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Conteúdo do Contrato</label>
                  <textarea
                    value={currentTemplate.body}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                    className="w-full h-96 px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif bg-white text-zinc-900"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="sticky top-0">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Variáveis Disponíveis</label>
                  <p className="text-xs text-zinc-500 mb-4">Clique na variável para inserir no texto.</p>
                  <div className="space-y-2">
                    {VARIABLES.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => insertVariable(v.value)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <p className="text-xs font-bold text-zinc-900 mb-1">{v.label}</p>
                        <p className="text-[10px] font-mono text-blue-600">{v.value}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
