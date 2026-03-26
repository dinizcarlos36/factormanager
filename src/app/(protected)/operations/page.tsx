'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Operation, Client, Title } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function OperationsPage() {
  const [operations, setOperations] = useState<(Operation & { clients: Client })[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<(Operation & { clients: Client }) | null>(null)
  const [titles, setTitles] = useState<Title[]>([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchOperations = async () => {
    const { data } = await insforge.database
      .from('operations')
      .select('*, clients(*)')
      .order('created_at', { ascending: false })
    if (data) setOperations(data as any)
    setLoading(false)
  }

  useEffect(() => { fetchOperations() }, [])

  const handleDetails = async (op: Operation & { clients: Client }) => {
    setSelected(op)
    setLoadingTitles(true)
    const { data } = await insforge.database.from('titles').select('*').eq('operation_id', op.id)
    setTitles((data || []) as Title[])
    setLoadingTitles(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await insforge.database.from('titles').delete().eq('operation_id', id)
    await insforge.database.from('contracts').delete().eq('operation_id', id)
    await insforge.database.from('payments').delete().eq('operation_id', id)
    const { error } = await insforge.database.from('operations').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    if (!error) {
      setOperations(prev => prev.filter(o => o.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const totalPages = Math.ceil(operations.length / PAGE_SIZE)
  const paginated = operations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Operações</h1>
          <p className="text-sm text-zinc-500">Acompanhe seus borderôs e operações de antecipação.</p>
        </div>
        <Link href="/operations/new" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          Nova Operação
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Data</th>
                <th className="text-left px-6 py-4">Ref</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-left px-6 py-4">Valor Total</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Nenhuma operação encontrada</td></tr>
              ) : (
                paginated.map((op) => (
                  <tr key={op.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-600">{new Date(op.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono text-zinc-500">{op.operation_number}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{op.clients?.razao_social}</td>
                    <td className="px-6 py-4 text-zinc-900 font-semibold">{formatCurrency(op.total_face_value)}</td>
                    <td className="px-6 py-4"><span className={getStatusColor(op.status)}>{getStatusLabel(op.status)}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleDetails(op)} className="text-blue-600 hover:underline text-xs font-medium">Detalhes</button>
                      <button onClick={() => setConfirmDelete(op.id)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={operations.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">Excluir Operação?</h3>
            <p className="text-sm text-zinc-500 mb-6">Esta ação excluirá a operação e todos os títulos, contratos e pagamentos vinculados. Não é possível desfazer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deleting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 rounded-t-xl">
              <h3 className="font-bold text-zinc-900">Operação #{selected.operation_number}</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-zinc-500">Cliente</span><p className="font-medium text-zinc-900">{selected.clients?.razao_social}</p></div>
                <div><span className="text-zinc-500">Status</span><p><span className={getStatusColor(selected.status)}>{getStatusLabel(selected.status)}</span></p></div>
                <div><span className="text-zinc-500">Valor de Face</span><p className="font-semibold text-zinc-900">{formatCurrency(selected.total_face_value)}</p></div>
                <div><span className="text-zinc-500">Valor Líquido</span><p className="font-semibold text-emerald-600">{formatCurrency(selected.net_value)}</p></div>
                <div><span className="text-zinc-500">Taxa de Deságio</span><p className="text-zinc-900">{selected.discount_rate}%</p></div>
                <div><span className="text-zinc-500">IOF</span><p className="text-zinc-900">{formatCurrency(selected.iof_value)}</p></div>
                <div><span className="text-zinc-500">Criado em</span><p className="text-zinc-600">{new Date(selected.created_at).toLocaleString()}</p></div>
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 text-sm mb-3">Títulos da Operação</h4>
                {loadingTitles ? (
                  <p className="text-sm text-zinc-400">Carregando títulos...</p>
                ) : titles.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">Nenhum título vinculado</p>
                ) : (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b text-zinc-500 uppercase font-bold tracking-wider">
                          <th className="text-left px-4 py-2">Vencimento</th>
                          <th className="text-right px-4 py-2">Valor Face</th>
                          <th className="text-left px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {titles.map(t => (
                          <tr key={t.id}>
                            <td className="px-4 py-2 text-zinc-600">{new Date(t.due_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatCurrency(t.face_value)}</td>
                            <td className="px-4 py-2"><span className={getStatusColor(t.status)}>{getStatusLabel(t.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
