'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import Link from 'next/link'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Contract, Client } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function ContractsPage() {
  const [contracts, setContracts] = useState<(Contract & { clients: Client })[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<(Contract & { clients: Client }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchContracts = async () => {
    const { data } = await insforge.database
      .from('contracts').select('*, clients(*)').order('created_at', { ascending: false })
    if (data) setContracts(data as any)
    setLoading(false)
  }

  useEffect(() => { fetchContracts() }, [])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const { error } = await insforge.database.from('contracts').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    if (!error) {
      setContracts(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const totalPages = Math.ceil(contracts.length / PAGE_SIZE)
  const paginated = contracts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestão de Contratos</h1>
          <p className="text-sm text-zinc-500">Gerencie seus contratos e assinaturas digitais.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/contracts/templates" className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
            Modelos
          </Link>
          <Link href="/contracts/new" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Novo Contrato
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Data</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-left px-6 py-4">Valor Operação</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Nenhum contrato gerado</td></tr>
              ) : (
                paginated.map((contract) => (
                  <tr key={contract.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-600">{new Date(contract.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{contract.clients?.razao_social}</td>
                    <td className="px-6 py-4 text-zinc-600">{formatCurrency(0)}</td>
                    <td className="px-6 py-4"><span className={getStatusColor(contract.status)}>{getStatusLabel(contract.status)}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => setSelected(contract)} className="text-blue-600 hover:underline text-xs font-medium">Detalhes</button>
                      <button onClick={() => setConfirmDelete(contract.id)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={contracts.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">Excluir Contrato?</h3>
            <p className="text-sm text-zinc-500 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deleting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 rounded-t-xl">
              <h3 className="font-bold text-zinc-900">Detalhes do Contrato</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-zinc-500">Cliente</span><p className="font-medium text-zinc-900">{selected.clients?.razao_social}</p></div>
                <div><span className="text-zinc-500">Status</span><p><span className={getStatusColor(selected.status)}>{getStatusLabel(selected.status)}</span></p></div>
                <div><span className="text-zinc-500">Assinado por</span><p className="text-zinc-900">{selected.signer_name || '—'}</p></div>
                <div><span className="text-zinc-500">Data Assinatura</span><p className="text-zinc-600">{selected.signed_at ? new Date(selected.signed_at).toLocaleString() : '—'}</p></div>
              </div>
              {selected.body_rendered && (
                <div>
                  <h4 className="font-bold text-zinc-800 mb-2">Conteúdo do Contrato</h4>
                  <div className="border border-zinc-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-zinc-50 prose prose-sm prose-zinc" dangerouslySetInnerHTML={{ __html: selected.body_rendered }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
