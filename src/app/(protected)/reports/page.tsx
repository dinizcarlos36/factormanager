'use client'

import { useEffect, useState, useMemo } from 'react'
import { insforge } from '@/lib/insforge'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import type { Operation, Client, Title, Payment } from '@/lib/types'

type PeriodFilter = '7d' | '30d' | '90d' | 'month' | 'year' | 'custom'

function getDateRange(filter: PeriodFilter, customStart: string, customEnd: string) {
  const now = new Date()
  let start: Date
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (filter) {
    case '7d':
      start = new Date(now); start.setDate(now.getDate() - 7); break
    case '30d':
      start = new Date(now); start.setDate(now.getDate() - 30); break
    case '90d':
      start = new Date(now); start.setDate(now.getDate() - 90); break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1); break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1); break
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), 0, 1)
      if (customEnd) { end.setTime(new Date(customEnd + 'T23:59:59').getTime()) }
      break
    default:
      start = new Date(now.getFullYear(), 0, 1)
  }
  return { start, end }
}

// ─── KPI Card ───
function KPICard({ title, value, subtitle, icon, colorClass }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode; colorClass: string
}) {
  return (
    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-zinc-900">{value}</p>
          <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
        </div>
        <div className={cn("p-3 rounded-lg", colorClass)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Section Wrapper ───
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
        <h3 className="font-bold text-zinc-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Status Card ───
function StatusCard({ label, count, total, bgClass }: {
  label: string; count: number; total: string; bgClass: string
}) {
  return (
    <div className={cn("rounded-xl p-5 border", bgClass)}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm font-semibold mt-1">{total}</p>
    </div>
  )
}

export default function ReportsPage() {
  const [operations, setOperations] = useState<(Operation & { clients?: Client })[]>([])
  const [titles, setTitles] = useState<Title[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('year')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [opsRes, titlesRes, paymentsRes, clientsRes] = await Promise.all([
        insforge.database.from('operations').select('*, clients(razao_social, cnpj)').order('created_at', { ascending: false }),
        insforge.database.from('titles').select('*').order('due_date', { ascending: true }),
        insforge.database.from('payments').select('*').order('payment_date', { ascending: false }),
        insforge.database.from('clients').select('*'),
      ])
      setOperations((opsRes.data || []) as (Operation & { clients?: Client })[])
      setTitles((titlesRes.data || []) as Title[])
      setPayments((paymentsRes.data || []) as Payment[])
      setClients((clientsRes.data || []) as Client[])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ─── Filtered data ───
  const { start, end } = useMemo(() => getDateRange(periodFilter, customStart, customEnd), [periodFilter, customStart, customEnd])

  const filteredOps = useMemo(() =>
    operations.filter(op => {
      const d = new Date(op.created_at)
      return d >= start && d <= end
    }), [operations, start, end])

  const filteredTitles = useMemo(() =>
    titles.filter(t => {
      const d = new Date(t.created_at)
      return d >= start && d <= end
    }), [titles, start, end])

  const filteredPayments = useMemo(() =>
    payments.filter(p => {
      const d = new Date(p.payment_date)
      return d >= start && d <= end
    }), [payments, start, end])

  // ─── KPI computations ───
  const totalNet = filteredOps.reduce((s, o) => s + Number(o.net_value || 0), 0)
  const totalFace = filteredOps.reduce((s, o) => s + Number(o.total_face_value || 0), 0)
  const avgDiscount = filteredOps.length
    ? (filteredOps.reduce((s, o) => s + Number(o.discount_rate || 0), 0) / filteredOps.length) * 100
    : 0
  const overdueTitles = filteredTitles.filter(t => t.status === 'vencido' || t.status === 'inadimplente')
  const overdueAmount = overdueTitles.reduce((s, t) => s + Number(t.face_value || 0), 0)

  // ─── Title status breakdown ───
  const titleStatuses: { key: string; label: string; bgClass: string }[] = [
    { key: 'disponivel', label: 'Disponível', bgClass: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
    { key: 'em_operacao', label: 'Em Operação', bgClass: 'bg-blue-50 text-blue-800 border-blue-200' },
    { key: 'liquidado', label: 'Liquidado', bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { key: 'vencido', label: 'Vencido', bgClass: 'bg-amber-50 text-amber-800 border-amber-200' },
    { key: 'inadimplente', label: 'Inadimplente', bgClass: 'bg-red-50 text-red-800 border-red-200' },
  ]

  const titleBreakdown = titleStatuses.map(s => {
    const items = filteredTitles.filter(t => t.status === s.key)
    return { ...s, count: items.length, total: items.reduce((sum, t) => sum + Number(t.face_value || 0), 0) }
  })

  // ─── Client ranking ───
  const clientRanking = useMemo(() => {
    const map = new Map<string, { name: string; ops: number; faceTotal: number; netTotal: number }>()
    filteredOps.forEach(op => {
      const name = op.clients?.razao_social || 'Desconhecido'
      const existing = map.get(op.client_id) || { name, ops: 0, faceTotal: 0, netTotal: 0 }
      existing.ops += 1
      existing.faceTotal += Number(op.total_face_value || 0)
      existing.netTotal += Number(op.net_value || 0)
      map.set(op.client_id, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.faceTotal - a.faceTotal).slice(0, 10)
  }, [filteredOps])

  // ─── Payment summary ───
  const paymentSummary = useMemo(() => {
    const confirmed = filteredPayments.filter(p => p.status === 'confirmado')
    const pending = filteredPayments.filter(p => p.status === 'pendente')
    const rejected = filteredPayments.filter(p => p.status === 'rejeitado')
    const pix = filteredPayments.filter(p => p.payment_type === 'pix')
    const transfer = filteredPayments.filter(p => p.payment_type === 'transferencia')
    const boleto = filteredPayments.filter(p => p.payment_type === 'boleto')
    const sumAmount = (arr: Payment[]) => arr.reduce((s, p) => s + Number(p.amount || 0), 0)
    return {
      confirmed: { count: confirmed.length, total: sumAmount(confirmed) },
      pending: { count: pending.length, total: sumAmount(pending) },
      rejected: { count: rejected.length, total: sumAmount(rejected) },
      pix: { count: pix.length, total: sumAmount(pix) },
      transfer: { count: transfer.length, total: sumAmount(transfer) },
      boleto: { count: boleto.length, total: sumAmount(boleto) },
    }
  }, [filteredPayments])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-500">Carregando relatórios...</p>
      </div>
    )
  }

  const periodButtons: { key: PeriodFilter; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'month', label: 'Este mês' },
    { key: 'year', label: 'Este ano' },
    { key: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Relatórios</h1>
          <p className="text-sm text-zinc-500 mt-1">Relatórios detalhados de operações, títulos, clientes e pagamentos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportToCSV(filteredOps.map(o => ({
            Data: formatDate(o.created_at), Ref: o.operation_number, Cliente: (o as Operation & { clients?: Client }).clients?.razao_social || '',
            'Valor Face': o.total_face_value, 'Valor Líquido': o.net_value, Deságio: o.discount_rate,
            IOF: o.iof_value, Modalidade: o.modality, Status: o.status,
          })), `operacoes_${periodFilter}`)} className="px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Operações CSV
          </button>
          <button onClick={() => exportToCSV(filteredTitles.map(t => ({
            Número: t.title_number, Tipo: t.title_type, 'Valor Face': t.face_value,
            Vencimento: formatDate(t.due_date), Devedor: t.debtor_name, Status: t.status,
          })), `titulos_${periodFilter}`)} className="px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Títulos CSV
          </button>
          <button onClick={() => exportToCSV(filteredPayments.map(p => ({
            Operação: p.operation_id, Valor: p.amount, Tipo: p.payment_type,
            Data: formatDate(p.payment_date), Status: p.status, Obs: p.notes || '',
          })), `pagamentos_${periodFilter}`)} className="px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Pagamentos CSV
          </button>
        </div>
      </div>

      {/* ─── Period Filter ─── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 mr-2">Período:</span>
          {periodButtons.map(b => (
            <button
              key={b.key}
              onClick={() => setPeriodFilter(b.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                periodFilter === b.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              )}
            >
              {b.label}
            </button>
          ))}
          {periodFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-zinc-300 text-xs"
              />
              <span className="text-zinc-400 text-xs">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-zinc-300 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Antecipado"
          value={formatCurrency(totalNet)}
          subtitle={`${filteredOps.length} operações no período`}
          colorClass="bg-blue-50 text-blue-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Volume de Face"
          value={formatCurrency(totalFace)}
          subtitle="Valor total dos títulos operados"
          colorClass="bg-emerald-50 text-emerald-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <KPICard
          title="Títulos Vencidos"
          value={String(overdueTitles.length)}
          subtitle={`${formatCurrency(overdueAmount)} em atraso`}
          colorClass="bg-amber-50 text-amber-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        />
        <KPICard
          title="Taxa Média Deságio"
          value={`${avgDiscount.toFixed(2)}%`}
          subtitle="Média ponderada no período"
          colorClass="bg-indigo-50 text-indigo-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
      </div>

      {/* ─── Operations Table ─── */}
      <Section title="Operações no Período">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-4">Data</th>
                <th className="text-left px-6 py-4">Ref</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-right px-6 py-4">Vlr. Face</th>
                <th className="text-right px-6 py-4">Deságio</th>
                <th className="text-right px-6 py-4">IOF</th>
                <th className="text-right px-6 py-4">Taxas</th>
                <th className="text-right px-6 py-4">Vlr. Líquido</th>
                <th className="text-left px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-zinc-400 italic">
                    Nenhuma operação encontrada no período
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => (
                  <tr key={op.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 text-xs">{formatDate(op.created_at)}</td>
                    <td className="px-6 py-4 font-mono text-zinc-500 text-xs">#{op.operation_number}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 text-xs">{op.clients?.razao_social || '—'}</td>
                    <td className="px-6 py-4 text-right text-zinc-700 text-xs">{formatCurrency(op.total_face_value)}</td>
                    <td className="px-6 py-4 text-right text-zinc-500 text-xs">{(Number(op.discount_rate || 0) * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right text-zinc-500 text-xs">{formatCurrency(op.iof_value)}</td>
                    <td className="px-6 py-4 text-right text-zinc-500 text-xs">{formatCurrency(op.tax_value)}</td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 text-xs">{formatCurrency(op.net_value)}</td>
                    <td className="px-6 py-4">
                      <span className={getStatusColor(op.status)}>{getStatusLabel(op.status)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredOps.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-50 border-t-2 border-zinc-300 font-bold text-xs">
                  <td colSpan={3} className="px-6 py-4 text-zinc-700 uppercase tracking-wider">Totais ({filteredOps.length} operações)</td>
                  <td className="px-6 py-4 text-right text-zinc-900">{formatCurrency(totalFace)}</td>
                  <td className="px-6 py-4 text-right text-zinc-500">{avgDiscount.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right text-zinc-500">
                    {formatCurrency(filteredOps.reduce((s, o) => s + Number(o.iof_value || 0), 0))}
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-500">
                    {formatCurrency(filteredOps.reduce((s, o) => s + Number(o.tax_value || 0), 0))}
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-900">{formatCurrency(totalNet)}</td>
                  <td className="px-6 py-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Section>

      {/* ─── Titles Breakdown ─── */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Títulos por Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {titleBreakdown.map(s => (
            <StatusCard
              key={s.key}
              label={s.label}
              count={s.count}
              total={formatCurrency(s.total)}
              bgClass={s.bgClass}
            />
          ))}
        </div>
      </div>

      {/* ─── Bottom Grid: Clients + Payments ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Client Ranking ─── */}
        <Section title="Ranking de Clientes por Volume">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-6 py-3">Cliente</th>
                  <th className="text-center px-6 py-3">Ops</th>
                  <th className="text-right px-6 py-3">Vlr. Face</th>
                  <th className="text-right px-6 py-3">Vlr. Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clientRanking.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-zinc-400 italic">Nenhum dado disponível</td>
                  </tr>
                ) : (
                  clientRanking.map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 text-zinc-400 font-bold">{i + 1}</td>
                      <td className="px-6 py-3 font-medium text-zinc-900">{c.name}</td>
                      <td className="px-6 py-3 text-center text-zinc-600">{c.ops}</td>
                      <td className="px-6 py-3 text-right text-zinc-600">{formatCurrency(c.faceTotal)}</td>
                      <td className="px-6 py-3 text-right font-bold text-zinc-900">{formatCurrency(c.netTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ─── Payments Summary ─── */}
        <Section title="Resumo de Pagamentos">
          <div className="p-6 space-y-6">
            {/* By status */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Por Status</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Confirmados</p>
                  <p className="text-xl font-bold text-emerald-800 mt-1">{paymentSummary.confirmed.count}</p>
                  <p className="text-sm font-semibold text-emerald-700">{formatCurrency(paymentSummary.confirmed.total)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pendentes</p>
                  <p className="text-xl font-bold text-amber-800 mt-1">{paymentSummary.pending.count}</p>
                  <p className="text-sm font-semibold text-amber-700">{formatCurrency(paymentSummary.pending.total)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Rejeitados</p>
                  <p className="text-xl font-bold text-red-800 mt-1">{paymentSummary.rejected.count}</p>
                  <p className="text-sm font-semibold text-red-700">{formatCurrency(paymentSummary.rejected.total)}</p>
                </div>
              </div>
            </div>
            {/* By method */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Por Método</p>
              <div className="space-y-3">
                {[
                  { label: 'PIX', data: paymentSummary.pix, color: 'bg-blue-600' },
                  { label: 'Transferência', data: paymentSummary.transfer, color: 'bg-cyan-600' },
                  { label: 'Boleto', data: paymentSummary.boleto, color: 'bg-zinc-600' },
                ].map(m => {
                  const maxTotal = Math.max(paymentSummary.pix.total, paymentSummary.transfer.total, paymentSummary.boleto.total, 1)
                  const pct = (m.data.total / maxTotal) * 100
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-zinc-700">{m.label}</span>
                        <span className="text-sm font-bold text-zinc-900">
                          {formatCurrency(m.data.total)} <span className="text-zinc-400 font-normal">({m.data.count})</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div className={cn("h-full rounded-full transition-all", m.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
