'use client'

import { useEffect, useState, useMemo } from 'react'
import { insforge } from '@/lib/insforge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Title, Client } from '@/lib/types'
import Pagination from '@/components/ui/Pagination'

type Stage = 'vencido' | 'notificacao_1' | 'notificacao_2' | 'negativacao' | 'ajuizamento'

const STAGES: { key: Stage; label: string; color: string; bgClass: string }[] = [
  { key: 'vencido', label: 'Vencido', color: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-200' },
  { key: 'notificacao_1', label: '1ª Notificação', color: 'text-orange-700', bgClass: 'bg-orange-50 border-orange-200' },
  { key: 'notificacao_2', label: '2ª Notificação', color: 'text-red-600', bgClass: 'bg-red-50 border-red-200' },
  { key: 'negativacao', label: 'Negativação', color: 'text-red-800', bgClass: 'bg-red-100 border-red-300' },
  { key: 'ajuizamento', label: 'Ajuizamento', color: 'text-zinc-800', bgClass: 'bg-zinc-100 border-zinc-300' },
]

interface CollectionItem {
  id: string
  title_id: string
  stage: Stage
  notes: string | null
  history: { date: string; action: string; note: string }[]
  created_at: string
  updated_at: string
  title?: Title & { clients?: Client }
}

const PAGE_SIZE = 10

export default function CollectionsPage() {
  const [items, setItems] = useState<CollectionItem[]>([])
  const [overdueTitles, setOverdueTitles] = useState<(Title & { clients?: Client })[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<Stage | ''>('')
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])

  const fetchData = async () => {
    // Fetch collection items
    const { data: collData } = await insforge.database
      .from('collections')
      .select('*, titles(*, clients(razao_social, cnpj))')
      .order('updated_at', { ascending: false })

    // Fetch overdue titles not yet in collection
    const { data: titlesData } = await insforge.database
      .from('titles')
      .select('*, clients(razao_social, cnpj)')
      .in('status', ['vencido', 'inadimplente'])

    const collItems = (collData || []) as CollectionItem[]
    const collTitleIds = new Set(collItems.map(c => c.title_id))
    const available = ((titlesData || []) as (Title & { clients?: Client })[]).filter(t => !collTitleIds.has(t.id))

    // Map joined title data
    const mapped = collItems.map(item => ({
      ...item,
      title: (item as CollectionItem & { titles?: Title & { clients?: Client } }).titles || undefined,
    }))

    setItems(mapped as CollectionItem[])
    setOverdueTitles(available)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAddToCollection = async () => {
    if (selectedTitles.length === 0) return
    const inserts = selectedTitles.map(titleId => ({
      title_id: titleId,
      stage: 'vencido' as Stage,
      notes: null,
      history: [{ date: new Date().toISOString(), action: 'Criado', note: 'Adicionado à cobrança' }],
    }))
    await insforge.database.from('collections').insert(inserts)
    setSelectedTitles([])
    setShowAddModal(false)
    fetchData()
  }

  const handleAdvanceStage = async (item: CollectionItem) => {
    const idx = STAGES.findIndex(s => s.key === item.stage)
    if (idx >= STAGES.length - 1) return
    const next = STAGES[idx + 1].key
    const newHistory = [...(item.history || []), { date: new Date().toISOString(), action: `Avançou para ${STAGES[idx + 1].label}`, note: '' }]
    await insforge.database.from('collections').update({ stage: next, history: newHistory }).eq('id', item.id)
    fetchData()
  }

  const handleAddNote = async () => {
    if (!selectedItem || !noteText.trim()) return
    const newHistory = [...(selectedItem.history || []), { date: new Date().toISOString(), action: 'Nota', note: noteText }]
    await insforge.database.from('collections').update({ notes: noteText, history: newHistory }).eq('id', selectedItem.id)
    setNoteText('')
    setSelectedItem(null)
    fetchData()
  }

  const handleRemove = async (id: string) => {
    await insforge.database.from('collections').delete().eq('id', id)
    fetchData()
  }

  const filtered = useMemo(() => {
    if (!stageFilter) return items
    return items.filter(i => i.stage === stageFilter)
  }, [items, stageFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [stageFilter])

  // Stage counts
  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {}
    STAGES.forEach(s => { map[s.key] = items.filter(i => i.stage === s.key).length })
    return map
  }, [items])

  if (loading) return <div className="flex items-center justify-center py-20 text-zinc-400">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cobrança</h1>
          <p className="text-sm text-zinc-500 mt-1">Pipeline de cobrança e recuperação de títulos vencidos</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          Adicionar Títulos
        </button>
      </div>

      {/* Stage Pipeline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAGES.map(s => (
          <button key={s.key} onClick={() => setStageFilter(stageFilter === s.key ? '' : s.key)}
            className={cn(`rounded-xl p-4 border transition-all text-left`, s.bgClass, stageFilter === s.key && 'ring-2 ring-blue-500 ring-offset-1')}>
            <p className={cn('text-xs font-bold uppercase tracking-wider', s.color)}>{s.label}</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{stageCounts[s.key] || 0}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Título</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-left px-6 py-4">Devedor</th>
                <th className="text-right px-6 py-4">Valor</th>
                <th className="text-left px-6 py-4">Vencimento</th>
                <th className="text-left px-6 py-4">Etapa</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-400 italic">Nenhum item na cobrança{stageFilter && ` (filtro: ${STAGES.find(s => s.key === stageFilter)?.label})`}</td></tr>
              ) : paginated.map(item => {
                const stage = STAGES.find(s => s.key === item.stage)!
                return (
                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600">{item.title?.title_number || '—'}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{item.title?.clients?.razao_social || '—'}</td>
                    <td className="px-6 py-4 text-zinc-600">{item.title?.debtor_name || '—'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-zinc-900">{formatCurrency(item.title?.face_value || 0)}</td>
                    <td className="px-6 py-4 text-zinc-600">{item.title?.due_date ? formatDate(item.title.due_date) : '—'}</td>
                    <td className="px-6 py-4"><span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', stage.bgClass, stage.color)}>{stage.label}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleAdvanceStage(item)} disabled={item.stage === 'ajuizamento'} className="text-blue-600 hover:underline text-xs font-medium disabled:opacity-40">Avançar</button>
                      <button onClick={() => { setSelectedItem(item); setNoteText('') }} className="text-zinc-500 hover:underline text-xs font-medium">Nota</button>
                      <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:underline text-xs font-medium">Remover</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Add Titles Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold text-zinc-900">Adicionar Títulos Vencidos à Cobrança</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-700 text-xl">&times;</button>
            </div>
            <div className="p-6">
              {overdueTitles.length === 0 ? (
                <p className="text-sm text-zinc-400 italic text-center py-4">Nenhum título vencido disponível para adicionar</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {overdueTitles.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedTitles.includes(t.id)} onChange={e => {
                        setSelectedTitles(e.target.checked ? [...selectedTitles, t.id] : selectedTitles.filter(id => id !== t.id))
                      }} className="rounded border-zinc-300" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{t.clients?.razao_social} — #{t.title_number}</p>
                        <p className="text-xs text-zinc-500">{t.debtor_name} · {formatCurrency(t.face_value)} · Venc: {formatDate(t.due_date)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-200">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Cancelar</button>
                <button onClick={handleAddToCollection} disabled={selectedTitles.length === 0} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  Adicionar ({selectedTitles.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold text-zinc-900">Histórico e Notas</h3>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-zinc-700 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {/* History */}
              <div className="max-h-40 overflow-y-auto space-y-2">
                {(selectedItem.history || []).map((h, i) => (
                  <div key={i} className="text-xs border-l-2 border-zinc-200 pl-3 py-1">
                    <span className="text-zinc-400">{new Date(h.date).toLocaleString()}</span>
                    <span className="font-medium text-zinc-700 ml-2">{h.action}</span>
                    {h.note && <p className="text-zinc-500 mt-0.5">{h.note}</p>}
                  </div>
                ))}
              </div>
              {/* Add note */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Adicionar Nota</label>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Interação, tentativa de contato..."
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">Fechar</button>
                <button onClick={handleAddNote} disabled={!noteText.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">Salvar Nota</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
