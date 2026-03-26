'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import { formatCurrency, calculateNetValue, calculateIOF, daysBetween } from '@/lib/utils'
import type { Client, Title } from '@/lib/types'

type WizardStep = 'select_client' | 'select_titles' | 'calculate' | 'contract' | 'confirm'

export default function NewOperationPage() {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('select_client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [titles, setTitles] = useState<Title[]>([])
  const [selectedTitleIds, setSelectedTitleIds] = useState<string[]>([])
  const [discountRate, setDiscountRate] = useState('0.04')
  const [modality, setModality] = useState<'com_recurso' | 'sem_recurso'>('sem_recurso')
  const [signedBy, setSignedBy] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Calculations
  const selectedTitles = titles.filter((t) => selectedTitleIds.includes(t.id))
  const totalFaceValue = selectedTitles.reduce((sum, t) => sum + Number(t.face_value), 0)
  const avgDays = selectedTitles.length
    ? selectedTitles.reduce((sum, t) => sum + daysBetween(new Date().toISOString(), t.due_date), 0) / selectedTitles.length
    : 0
  const iofValue = calculateIOF(totalFaceValue, avgDays)
  const netValue = calculateNetValue(totalFaceValue, parseFloat(discountRate), iofValue, 0)

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await insforge.database.from('clients').select('*').eq('status', 'aprovado').order('razao_social')
      setClients((data || []) as Client[])
    }
    fetchClients()
  }, [])

  const fetchTitles = async (clientId: string) => {
    const { data } = await insforge.database.from('titles').select('*')
      .eq('client_id', clientId).eq('status', 'disponivel').order('due_date')
    setTitles((data || []) as Title[])
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    fetchTitles(client.id)
    setStep('select_titles')
  }

  const toggleTitle = (id: string) => {
    setSelectedTitleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleFinalize = async () => {
    if (!selectedClient || selectedTitles.length === 0) return
    setLoading(true)
    setError('')

    const { data: userData } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    const now = new Date().toISOString()

    // Create operation
    const { data: opData, error: opErr } = await insforge.database.from('operations').insert([{
      client_id: selectedClient.id,
      total_face_value: totalFaceValue,
      discount_rate: parseFloat(discountRate),
      iof_value: iofValue,
      tax_value: 0,
      net_value: netValue,
      modality,
      status: 'assinado',
      contract_hash: btoa(`${selectedClient.cnpj}-${totalFaceValue}-${now}`),
      signed_at: now,
      signed_by: signedBy,
      created_by: userId,
    }]).select()

    if (opErr || !opData?.[0]) {
      setError(opErr?.message || 'Erro ao criar operação')
      setLoading(false)
      return
    }

    const operationId = opData[0].id

    // Link titles to operation
    const opTitles = selectedTitles.map((t) => ({
      operation_id: operationId,
      title_id: t.id,
      face_value: t.face_value,
      due_date: t.due_date,
    }))
    await insforge.database.from('operation_titles').insert(opTitles)

    // Update titles status
    for (const t of selectedTitles) {
      await insforge.database.from('titles').update({ status: 'em_operacao' }).eq('id', t.id)
    }

    // Audit log
    await insforge.database.from('audit_logs').insert([{
      user_id: userId,
      action: 'create_operation',
      entity_type: 'operation',
      entity_id: operationId,
      details: { total_face_value: totalFaceValue, net_value: netValue, titles_count: selectedTitles.length },
    }])

    router.push('/operations')
  }

  const steps = [
    { key: 'select_client', label: '1. Cliente' },
    { key: 'select_titles', label: '2. Títulos' },
    { key: 'calculate', label: '3. Proposta' },
    { key: 'contract', label: '4. Contrato' },
    { key: 'confirm', label: '5. Confirmação' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Nova Operação de Antecipação</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              step === s.key ? 'bg-blue-600 text-white shadow-md' :
              steps.findIndex((x) => x.key === step) > i ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {steps.findIndex((x) => x.key === step) > i ? '✓' : ''} {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Client */}
      {step === 'select_client' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Selecione o Cliente</h2>
          <div className="space-y-2">
            {clients.map((c) => (
              <button key={c.id} onClick={() => handleSelectClient(c)}
                className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">{c.razao_social}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Limite: {formatCurrency(c.credit_limit)}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
            {clients.length === 0 && <p className="text-slate-400 text-center py-8">Nenhum cliente aprovado encontrado</p>}
          </div>
        </div>
      )}

      {/* Step 2: Select Titles */}
      {step === 'select_titles' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Selecione os Títulos</h2>
          <p className="text-sm text-slate-500 mb-4">Cliente: {selectedClient?.razao_social}</p>
          <div className="space-y-2 mb-6">
            {titles.map((t) => (
              <label key={t.id} className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                selectedTitleIds.includes(t.id) ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input type="checkbox" checked={selectedTitleIds.includes(t.id)} onChange={() => toggleTitle(t.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-slate-700">Nº {t.title_number} — {t.debtor_name}</p>
                  <p className="text-xs text-slate-400">Venc: {new Date(t.due_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="font-semibold text-slate-800">{formatCurrency(t.face_value)}</p>
              </label>
            ))}
            {titles.length === 0 && <p className="text-slate-400 text-center py-8">Nenhum título disponível para este cliente</p>}
          </div>
          {selectedTitleIds.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="font-medium text-slate-700">{selectedTitleIds.length} título(s) — Total: {formatCurrency(totalFaceValue)}</p>
              <button onClick={() => setStep('calculate')} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium shadow-md">
                Continuar →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Calculate */}
      {step === 'calculate' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Proposta de Antecipação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Taxa de Deságio (%)</label>
              <input type="number" step="0.01" min="0" max="1" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" />
              <p className="text-xs text-slate-400 mt-1">Ex: 0.04 = 4%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Modalidade</label>
              <select value={modality} onChange={(e) => setModality(e.target.value as 'com_recurso' | 'sem_recurso')}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="sem_recurso">Sem Recurso (risco do factor)</option>
                <option value="com_recurso">Com Recurso (risco do aderente)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-5 space-y-3 mb-6">
            <div className="flex justify-between"><span className="text-slate-600">Valor de Face Total</span><span className="font-semibold">{formatCurrency(totalFaceValue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Deságio ({(parseFloat(discountRate) * 100).toFixed(2)}%)</span><span className="text-red-500">- {formatCurrency(totalFaceValue * parseFloat(discountRate))}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">IOF (~{avgDays.toFixed(0)} dias)</span><span className="text-red-500">- {formatCurrency(iofValue)}</span></div>
            <div className="border-t border-slate-200 my-2" />
            <div className="flex justify-between text-lg"><span className="font-semibold text-slate-800">Valor Líquido</span><span className="font-bold text-emerald-600">{formatCurrency(netValue)}</span></div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep('select_titles')} className="text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
            <button onClick={() => setStep('contract')} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium shadow-md">
              Gerar Contrato →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Contract & Signature */}
      {step === 'contract' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Contrato de Cessão de Crédito</h2>

          <div className="bg-slate-50 rounded-lg p-5 text-sm text-slate-600 space-y-3 mb-6 max-h-64 overflow-y-auto border border-slate-200">
            <p className="font-semibold text-slate-800">CONTRATO DE CESSÃO DE CRÉDITO — OPERAÇÃO DE ANTECIPAÇÃO</p>
            <p><strong>CESSIONÁRIO (Factor):</strong> FactorManager S.A.</p>
            <p><strong>CEDENTE (Aderente):</strong> {selectedClient?.razao_social} — CNPJ: {selectedClient?.cnpj}</p>
            <p><strong>Modalidade:</strong> {modality === 'sem_recurso' ? 'Sem Recurso — O risco de inadimplência é assumido pelo Cessionário' : 'Com Recurso — Em caso de inadimplência, o Cedente deverá ressarcir o Cessionário'}</p>
            <p><strong>Títulos cedidos:</strong> {selectedTitles.length} título(s), valor de face total: {formatCurrency(totalFaceValue)}</p>
            <p><strong>Deságio:</strong> {(parseFloat(discountRate) * 100).toFixed(2)}%</p>
            <p><strong>IOF:</strong> {formatCurrency(iofValue)}</p>
            <p><strong>Valor Líquido a ser creditado:</strong> {formatCurrency(netValue)}</p>
            <p className="text-xs text-slate-400 mt-4">Cláusula: O Cedente declara ser o legítimo credor dos títulos acima e garante sua liquidez e certeza. {modality === 'com_recurso' ? 'O Cedente assume responsabilidade solidária em caso de não-pagamento pelo devedor.' : 'O Cessionário assume integralmente o risco de não-pagamento.'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Signatário *</label>
              <input type="text" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Nome completo de quem assina"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600" />
              <span className="text-sm text-slate-600">Declaro que li e aceito todas as cláusulas deste contrato de cessão de crédito. Este aceite digital tem validade jurídica.</span>
            </label>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setStep('calculate')} className="text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
            <button onClick={() => setStep('confirm')} disabled={!signedBy || !acceptTerms}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium shadow-md disabled:opacity-60">
              Assinar Contrato ✓
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Confirm */}
      {step === 'confirm' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Contrato Assinado!</h2>
          <p className="text-sm text-slate-500 mb-6">Assinado por {signedBy} em {new Date().toLocaleDateString('pt-BR')}</p>

          <div className="bg-slate-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{selectedClient?.razao_social}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Títulos</span><span className="font-medium">{selectedTitles.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Valor Líquido</span><span className="font-bold text-emerald-600">{formatCurrency(netValue)}</span></div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200 mb-4">{error}</div>}

          <button onClick={handleFinalize} disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium shadow-md disabled:opacity-60">
            {loading ? 'Finalizando...' : 'Finalizar Operação'}
          </button>
        </div>
      )}
    </div>
  )
}
