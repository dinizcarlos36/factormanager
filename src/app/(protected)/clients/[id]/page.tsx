'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import { formatCNPJ, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Client, ClientContact, ClientDocument, Operation, Title } from '@/lib/types'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [titles, setTitles] = useState<Title[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'docs' | 'operations' | 'titles'>('info')

  // Status workflow
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusAction, setStatusAction] = useState<string>('')
  const [statusComment, setStatusComment] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  // Document upload
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('contrato_social')

  useEffect(() => {
    const fetchAll = async () => {
      const [clientRes, contactRes, docRes, opRes, titleRes] = await Promise.all([
        insforge.database.from('clients').select('*').eq('id', clientId).single(),
        insforge.database.from('client_contacts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        insforge.database.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        insforge.database.from('operations').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        insforge.database.from('titles').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      ])
      if (clientRes.data) setClient(clientRes.data as Client)
      setContacts((contactRes.data || []) as ClientContact[])
      setDocuments((docRes.data || []) as ClientDocument[])
      setOperations((opRes.data || []) as Operation[])
      setTitles((titleRes.data || []) as Title[])
      setLoading(false)
    }
    fetchAll()
  }, [clientId])

  const handleStatusChange = async () => {
    if (!client) return
    setSavingStatus(true)
    const { data: userData } = await insforge.auth.getCurrentUser()
    await insforge.database.from('clients').update({ status: statusAction, status_comment: statusComment || null }).eq('id', client.id)
    await insforge.database.from('audit_logs').insert([{
      user_id: userData?.user?.id,
      action: `client_status_${statusAction}`,
      entity_type: 'client',
      entity_id: client.id,
      details: { from: client.status, to: statusAction, comment: statusComment },
    }])
    setClient({ ...client, status: statusAction as Client['status'], status_comment: statusComment || null })
    setSavingStatus(false)
    setShowStatusModal(false)
    setStatusComment('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return
    setUploading(true)
    const { data: userData } = await insforge.auth.getCurrentUser()
    const key = `${client.id}/${Date.now()}-${file.name}`
    const { data, error } = await insforge.storage.from('client-documents').upload(key, file)
    if (!error && data) {
      await insforge.database.from('client_documents').insert([{
        client_id: client.id,
        doc_type: docType,
        file_name: file.name,
        file_url: data.url,
        file_key: data.key,
        uploaded_by: userData?.user?.id,
      }])
      const { data: refreshed } = await insforge.database.from('client_documents').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
      setDocuments((refreshed || []) as ClientDocument[])
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDeleteDoc = async (doc: ClientDocument) => {
    await insforge.storage.from('client-documents').remove(doc.file_key)
    await insforge.database.from('client_documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-zinc-400">Carregando...</div>
  if (!client) return <div className="flex items-center justify-center py-20 text-red-500">Cliente não encontrado</div>

  const statusTransitions: Record<string, { label: string; value: string; color: string }[]> = {
    rascunho: [
      { label: 'Enviar para Análise', value: 'em_analise', color: 'bg-amber-500 hover:bg-amber-600' },
    ],
    em_analise: [
      { label: 'Aprovar', value: 'aprovado', color: 'bg-emerald-600 hover:bg-emerald-700' },
      { label: 'Rejeitar', value: 'rejeitado', color: 'bg-red-600 hover:bg-red-700' },
    ],
    aprovado: [
      { label: 'Suspender', value: 'suspenso', color: 'bg-orange-500 hover:bg-orange-600' },
    ],
    rejeitado: [
      { label: 'Reabrir Análise', value: 'em_analise', color: 'bg-amber-500 hover:bg-amber-600' },
    ],
    suspenso: [
      { label: 'Reativar', value: 'aprovado', color: 'bg-emerald-600 hover:bg-emerald-700' },
    ],
  }

  const docTypeLabels: Record<string, string> = {
    contrato_social: 'Contrato Social',
    certidao_negativa: 'Certidão Negativa',
    comprovante_endereco: 'Comprovante de Endereço',
    balanco_patrimonial: 'Balanço Patrimonial',
    procuracao: 'Procuração',
    outros: 'Outros',
  }

  const transitions = statusTransitions[client.status] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/clients')} className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-zinc-900">{client.razao_social}</h1>
          {client.nome_fantasia && <p className="text-sm text-zinc-500">{client.nome_fantasia}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={getStatusColor(client.status)}>{getStatusLabel(client.status)}</span>
          {transitions.map(t => (
            <button key={t.value} onClick={() => { setStatusAction(t.value); setShowStatusModal(true) }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${t.color}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {client.status_comment && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <strong>Comentário:</strong> {client.status_comment}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-1">
        {([['info', 'Informações'], ['docs', 'Documentos'], ['operations', 'Operações'], ['titles', 'Títulos']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            {label}
            {key === 'docs' && documents.length > 0 && <span className="ml-1.5 bg-zinc-200 text-zinc-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{documents.length}</span>}
            {key === 'operations' && operations.length > 0 && <span className="ml-1.5 bg-zinc-200 text-zinc-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{operations.length}</span>}
            {key === 'titles' && titles.length > 0 && <span className="ml-1.5 bg-zinc-200 text-zinc-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{titles.length}</span>}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 mb-4">Dados da Empresa</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-500">CNPJ</dt><dd className="font-mono text-zinc-900">{formatCNPJ(client.cnpj)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Email</dt><dd className="text-zinc-900">{client.email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Telefone</dt><dd className="text-zinc-900">{client.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Limite de Crédito</dt><dd className="font-semibold text-emerald-600">{formatCurrency(client.credit_limit)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Cadastrado em</dt><dd className="text-zinc-600">{new Date(client.created_at).toLocaleString()}</dd></div>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 mb-4">Endereço</h3>
            {client.address ? (
              <div className="text-sm text-zinc-700 space-y-1">
                <p>{client.address.rua}, {client.address.numero}</p>
                <p>{client.address.bairro} — {client.address.cidade}/{client.address.uf}</p>
                <p className="text-zinc-500">CEP: {client.address.cep}</p>
              </div>
            ) : <p className="text-sm text-zinc-400 italic">Endereço não informado</p>}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 mb-4">Dados Bancários</h3>
            {client.bank_info ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-500">Banco</dt><dd className="text-zinc-900">{client.bank_info.banco}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Agência</dt><dd className="text-zinc-900">{client.bank_info.agencia}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Conta</dt><dd className="text-zinc-900">{client.bank_info.conta} ({client.bank_info.tipo})</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Pix</dt><dd className="text-zinc-900">{client.bank_info.pix || '—'}</dd></div>
              </dl>
            ) : <p className="text-sm text-zinc-400 italic">Dados bancários não informados</p>}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 mb-4">Responsável Legal / Contatos</h3>
            {contacts.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">Nenhum contato cadastrado</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="border border-zinc-100 rounded-lg p-3 text-sm">
                    <p className="font-medium text-zinc-900">{c.name} {c.is_legal_rep && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-1">Rep. Legal</span>}</p>
                    <p className="text-zinc-500">{c.role || '—'} · {c.email || '—'} · {c.phone || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 mb-4">Upload de Documento</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Tipo de Documento</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white">
                  {Object.entries(docTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Arquivo (PDF, imagem)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} disabled={uploading}
                  className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-blue-700 disabled:opacity-50" />
              </div>
              {uploading && <span className="text-sm text-blue-600 animate-pulse">Enviando...</span>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="text-left px-6 py-4">Tipo</th>
                  <th className="text-left px-6 py-4">Arquivo</th>
                  <th className="text-left px-6 py-4">Data</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {documents.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-zinc-400 italic">Nenhum documento cadastrado</td></tr>
                ) : documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-900 font-medium">{docTypeLabels[doc.doc_type] || doc.doc_type}</td>
                    <td className="px-6 py-4 text-zinc-600 truncate max-w-[200px]">{doc.file_name}</td>
                    <td className="px-6 py-4 text-zinc-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs font-medium">Abrir</a>
                      <button onClick={() => handleDeleteDoc(doc)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operations Tab */}
      {tab === 'operations' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Data</th>
                <th className="text-left px-6 py-4">Ref</th>
                <th className="text-left px-6 py-4">Valor Face</th>
                <th className="text-left px-6 py-4">Valor Líquido</th>
                <th className="text-left px-6 py-4">Modalidade</th>
                <th className="text-left px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {operations.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-400 italic">Nenhuma operação encontrada</td></tr>
              ) : operations.map(op => (
                <tr key={op.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-zinc-600">{new Date(op.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-mono text-zinc-500">{op.operation_number}</td>
                  <td className="px-6 py-4 text-zinc-900">{formatCurrency(op.total_face_value)}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{formatCurrency(op.net_value)}</td>
                  <td className="px-6 py-4"><span className={getStatusColor(op.modality)}>{getStatusLabel(op.modality)}</span></td>
                  <td className="px-6 py-4"><span className={getStatusColor(op.status)}>{getStatusLabel(op.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Titles Tab */}
      {tab === 'titles' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Nº Título</th>
                <th className="text-left px-6 py-4">Tipo</th>
                <th className="text-left px-6 py-4">Valor</th>
                <th className="text-left px-6 py-4">Vencimento</th>
                <th className="text-left px-6 py-4">Devedor</th>
                <th className="text-left px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {titles.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-400 italic">Nenhum título vinculado</td></tr>
              ) : titles.map(t => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-zinc-700">{t.title_number}</td>
                  <td className="px-6 py-4 text-zinc-600 capitalize">{t.title_type}</td>
                  <td className="px-6 py-4 text-zinc-900 font-semibold">{formatCurrency(t.face_value)}</td>
                  <td className="px-6 py-4 text-zinc-600">{new Date(t.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-zinc-900">{t.debtor_name}</td>
                  <td className="px-6 py-4"><span className={getStatusColor(t.status)}>{getStatusLabel(t.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-1">Alterar Status</h3>
            <p className="text-sm text-zinc-500 mb-4">
              <span className={getStatusColor(client.status)}>{getStatusLabel(client.status)}</span>
              <span className="mx-2">→</span>
              <span className={getStatusColor(statusAction)}>{getStatusLabel(statusAction)}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Comentário {statusAction === 'rejeitado' ? '*' : '(opcional)'}</label>
              <textarea value={statusComment} onChange={e => setStatusComment(e.target.value)} rows={3} placeholder="Motivo da alteração..."
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm resize-none" required={statusAction === 'rejeitado'} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={handleStatusChange} disabled={savingStatus || (statusAction === 'rejeitado' && !statusComment.trim())}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {savingStatus ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
