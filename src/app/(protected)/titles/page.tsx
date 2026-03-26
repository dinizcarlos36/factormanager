'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import Link from 'next/link'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Title, Client } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 10

export default function TitlesPage() {
  const [titles, setTitles] = useState<(Title & { clients: Client })[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<(Title & { clients: Client }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // CSV Import
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [csvClientId, setCsvClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])

  const fetchTitles = async () => {
    const [titlesRes, clientsRes] = await Promise.all([
      insforge.database.from('titles').select('*, clients(*)').order('created_at', { ascending: false }),
      insforge.database.from('clients').select('id, razao_social').eq('status', 'aprovado'),
    ])
    if (titlesRes.data) setTitles(titlesRes.data as (Title & { clients: Client })[])
    setClients((clientsRes.data || []) as Client[])
    setLoading(false)
  }

  useEffect(() => { fetchTitles() }, [])

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return
      const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      const rows: Record<string, string>[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[;,]/).map(v => v.trim().replace(/['"]/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })
        rows.push(row)
      }
      setCsvPreview(rows)
      setShowCsvModal(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleCsvImport = async () => {
    if (!csvClientId || csvPreview.length === 0) return
    setImporting(true)
    const { data: userData } = await insforge.auth.getCurrentUser()
    const inserts = csvPreview.map(row => ({
      client_id: csvClientId,
      title_number: row.title_number || row.numero || row['nº'] || '',
      title_type: (row.title_type || row.tipo || 'duplicata') as Title['title_type'],
      face_value: parseFloat(row.face_value || row.valor || '0'),
      due_date: row.due_date || row.vencimento || '',
      debtor_name: row.debtor_name || row.devedor || row.sacado || '',
      debtor_cnpj: row.debtor_cnpj || row.cnpj_devedor || null,
      status: 'disponivel' as const,
      created_by: userData?.user?.id,
    }))
    await insforge.database.from('titles').insert(inserts)
    setImporting(false)
    setShowCsvModal(false)
    setCsvPreview([])
    setCsvClientId('')
    fetchTitles()
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const { error } = await insforge.database.from('titles').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    if (!error) {
      setTitles(prev => prev.filter(t => t.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const totalPages = Math.ceil(titles.length / PAGE_SIZE)
  const paginated = titles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Carteira de Títulos</h1>
          <p className="text-sm text-zinc-500">Gestão de duplicatas, cheques e boletos.</p>
        </div>
        <div className="flex gap-2">
          <label className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar CSV
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          </label>
          <Link href="/titles/new" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Novo Título
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Data</th>
                <th className="text-left px-6 py-4">Vencimento</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-left px-6 py-4">Valor de Face</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Nenhum título cadastrado</td></tr>
              ) : (
                paginated.map((title) => (
                  <tr key={title.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-600">{new Date(title.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-zinc-600 font-medium">{new Date(title.due_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{title.clients?.razao_social}</td>
                    <td className="px-6 py-4 text-zinc-900 font-semibold">{formatCurrency(title.face_value)}</td>
                    <td className="px-6 py-4"><span className={getStatusColor(title.status)}>{getStatusLabel(title.status)}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => setSelected(title)} className="text-blue-600 hover:underline text-xs font-medium">Detalhes</button>
                      <button onClick={() => setConfirmDelete(title.id)} className="text-red-500 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={titles.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">Excluir Título?</h3>
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
              <h3 className="font-bold text-zinc-900">Detalhes do Título</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-zinc-500">Cliente</span><p className="font-medium text-zinc-900">{selected.clients?.razao_social}</p></div>
              <div><span className="text-zinc-500">Status</span><p><span className={getStatusColor(selected.status)}>{getStatusLabel(selected.status)}</span></p></div>
              <div><span className="text-zinc-500">Valor de Face</span><p className="font-semibold text-zinc-900">{formatCurrency(selected.face_value)}</p></div>
              <div><span className="text-zinc-500">Vencimento</span><p className="text-zinc-900">{new Date(selected.due_date).toLocaleDateString()}</p></div>
              <div><span className="text-zinc-500">Tipo</span><p className="text-zinc-900 capitalize">{selected.title_type || '—'}</p></div>
              <div><span className="text-zinc-500">Sacado</span><p className="text-zinc-900">{selected.debtor_name || '—'}</p></div>
              <div><span className="text-zinc-500">CNPJ Sacado</span><p className="text-zinc-600 font-mono text-xs">{selected.debtor_cnpj || '—'}</p></div>
              <div><span className="text-zinc-500">Criado em</span><p className="text-zinc-600">{new Date(selected.created_at).toLocaleString()}</p></div>
            </div>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowCsvModal(false); setCsvPreview([]) }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold text-zinc-900">Importar Títulos via CSV</h3>
              <button onClick={() => { setShowCsvModal(false); setCsvPreview([]) }} className="text-zinc-400 hover:text-zinc-700 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Cliente (Aderente) *</label>
                <select value={csvClientId} onChange={e => setCsvClientId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white">
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                </select>
              </div>
              <p className="text-xs text-zinc-500">Prévia: {csvPreview.length} linhas encontradas. Colunas esperadas: <code>title_number, title_type, face_value, due_date, debtor_name</code></p>
              <div className="overflow-x-auto max-h-40 border border-zinc-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-zinc-50">{csvPreview[0] && Object.keys(csvPreview[0]).map(k => <th key={k} className="px-3 py-2 text-left font-medium text-zinc-500">{k}</th>)}</tr></thead>
                  <tbody>{csvPreview.slice(0, 5).map((row, i) => <tr key={i} className="border-t border-zinc-100">{Object.values(row).map((v, j) => <td key={j} className="px-3 py-1.5 text-zinc-700">{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowCsvModal(false); setCsvPreview([]) }} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
                <button onClick={handleCsvImport} disabled={importing || !csvClientId} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{importing ? 'Importando...' : `Importar ${csvPreview.length} títulos`}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
