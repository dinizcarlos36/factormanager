'use client'

import { useState, useEffect } from 'react'
import { insforge } from '@/lib/insforge'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Payment, Operation } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function ConciliationPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    operation_id: '', amount: '', payment_type: 'pix', payment_date: '', notes: '',
  })

  const fetchPayments = async () => {
    const [payRes, opRes] = await Promise.all([
      insforge.database.from('payments').select('*').order('created_at', { ascending: false }),
      insforge.database.from('operations').select('*, clients(razao_social)').in('status', ['assinado', 'pago']),
    ])
    setPayments((payRes.data || []) as Payment[])
    setOperations((opRes.data || []) as Operation[])
    setLoading(false)
  }

  useEffect(() => { fetchPayments() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: userData } = await insforge.auth.getCurrentUser()
    const { error } = await insforge.database.from('payments').insert([{
      operation_id: form.operation_id,
      amount: parseFloat(form.amount),
      payment_type: form.payment_type,
      payment_date: form.payment_date,
      notes: form.notes || null,
      status: 'pendente',
      created_by: userData?.user?.id,
    }])
    if (!error) {
      setShowForm(false)
      setForm({ operation_id: '', amount: '', payment_type: 'pix', payment_date: '', notes: '' })
      fetchPayments()
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const { error } = await insforge.database.from('payments').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    if (!error) setPayments(prev => prev.filter(p => p.id !== id))
  }

  const totalPages = Math.ceil(payments.length / PAGE_SIZE)
  const paginated = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Conciliação</h1>
          <p className="text-sm text-zinc-500 mt-1">Registre e concilie pagamentos de operações</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-md">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Registrar Pagamento
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-zinc-800 mb-4">Novo Pagamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Operação *</label>
              <select value={form.operation_id} onChange={(e) => setForm({...form, operation_id: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white" required>
                <option value="">Selecione...</option>
                {operations.map((op) => (
                  <option key={op.id} value={op.id}>#{(op as Operation & {clients?: {razao_social:string}}).operation_number} — {(op as Operation & {clients?: {razao_social:string}}).clients?.razao_social}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Tipo</label>
              <select value={form.payment_type} onChange={(e) => setForm({...form, payment_type: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white">
                <option value="pix">Pix</option>
                <option value="transferencia">Transferência</option>
                <option value="boleto">Boleto</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Data *</label>
              <input type="date" value={form.payment_date} onChange={(e) => setForm({...form, payment_date: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Observações</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" placeholder="Referência do pagamento..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Salvar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
              <th className="text-left px-5 py-3">Operação</th>
              <th className="text-right px-5 py-3">Valor</th>
              <th className="text-left px-5 py-3">Tipo</th>
              <th className="text-left px-5 py-3">Data</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-zinc-400">Carregando...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-zinc-400">Nenhum pagamento registrado</td></tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 text-zinc-600 font-mono text-xs">{p.operation_id?.slice(0, 8)}...</td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-800">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3 text-zinc-600 capitalize">{p.payment_type}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setConfirmDelete(p.id)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={payments.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">Excluir Pagamento?</h3>
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
    </div>
  )
}
