'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { insforge } from '@/lib/insforge'
import { formatCNPJ, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Client } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      let query = insforge.database.from('clients').select('*').order('created_at', { ascending: false })
      if (statusFilter) query = query.eq('status', statusFilter)
      const { data } = await query
      setClients((data || []) as Client[])
      setLoading(false)
    }
    fetchClients()
  }, [statusFilter])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const { error } = await insforge.database.from('clients').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    if (!error) setClients(prev => prev.filter(c => c.id !== id))
  }

  const filtered = clients.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.razao_social.toLowerCase().includes(s) || c.cnpj.includes(s) || c.nome_fantasia?.toLowerCase().includes(s)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1) }, [search, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-500">Gestão de aderentes e limites de crédito.</p>
        </div>
        <Link href="/clients/new" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-center">
          Novo Cliente
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <input type="text" placeholder="Procurar por Razão Social ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-600">
          <option value="">Todos Status</option>
          <option value="rascunho">Rascunho</option>
          <option value="em_analise">Em Análise</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Razão Social</th>
                <th className="text-left px-6 py-4">CNPJ</th>
                <th className="text-left px-6 py-4">Limite</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Nenhum cliente encontrado</td></tr>
              ) : (
                paginated.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">{client.razao_social}</span>
                        {client.nome_fantasia && <span className="text-xs text-zinc-500">{client.nome_fantasia}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 font-mono text-xs">{formatCNPJ(client.cnpj)}</td>
                    <td className="px-6 py-4 text-zinc-900">{formatCurrency(client.credit_limit)}</td>
                    <td className="px-6 py-4"><span className={getStatusColor(client.status)}>{getStatusLabel(client.status)}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline text-xs font-medium">Detalhes</Link>
                      <button onClick={() => setConfirmDelete(client.id)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">Excluir Cliente?</h3>
            <p className="text-sm text-zinc-500 mb-6">Esta ação excluirá o cliente permanentemente.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deleting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
