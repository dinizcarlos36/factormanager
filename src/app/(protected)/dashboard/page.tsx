'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { DashboardKPIs, Operation, Client } from '@/lib/types'
import { cn } from '@/lib/utils'

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

function RecentOperationsTable({ operations }: { operations: (Operation & { clients?: Client })[] }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
        <h3 className="font-bold text-zinc-900">Operações Recentes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-6 py-3 font-medium text-zinc-500 uppercase tracking-wider text-[11px]">Ref</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-500 uppercase tracking-wider text-[11px]">Cliente</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-500 uppercase tracking-wider text-[11px]">Vlr. Face</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-500 uppercase tracking-wider text-[11px]">Vlr. Líquido</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-500 uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {operations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-500 italic">
                  Nenhuma operação encontrada
                </td>
              </tr>
            ) : (
              operations.map((op) => (
                <tr key={op.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    #{op.operation_number}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {op.clients?.razao_social || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatCurrency(op.total_face_value)}
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-900">
                    {formatCurrency(op.net_value)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={getStatusColor(op.status)}>
                      {getStatusLabel(op.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [recentOps, setRecentOps] = useState<(Operation & { clients?: Client })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [opsRes, clientsRes, titlesRes] = await Promise.all([
        insforge.database.from('operations').select('*, clients(razao_social)').order('created_at', { ascending: false }).limit(10),
        insforge.database.from('clients').select('id, status'),
        insforge.database.from('titles').select('id, face_value, status, due_date'),
      ])

      const operations = (opsRes.data || []) as (Operation & { clients?: Client })[]
      const clients = clientsRes.data || []
      const titles = titlesRes.data || []

      const totalAnticipated = operations.reduce((sum, op) => sum + Number(op.net_value || 0), 0)
      const avgDiscount = operations.length
        ? operations.reduce((sum, op) => sum + Number(op.discount_rate || 0), 0) / operations.length
        : 0
      const overdueTitles = titles.filter((t: { status: string }) => t.status === 'vencido' || t.status === 'inadimplente')
      const overdueAmount = overdueTitles.reduce((sum: number, t: { face_value: number }) => sum + Number(t.face_value || 0), 0)
      const activeClients = clients.filter((c: { status: string }) => c.status === 'aprovado').length

      setKpis({
        totalAnticipated,
        averageDiscount: avgDiscount * 100,
        defaultRate: titles.length ? (overdueTitles.length / titles.length) * 100 : 0,
        averageReceivingDays: 0,
        activeClients,
        pendingOperations: operations.filter((op) => op.status === 'proposta').length,
        totalTitles: titles.length,
        overdueAmount,
      })

      setRecentOps(operations.slice(0, 5))
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-500">Carregando painel...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Bem-vindo ao FactorManager. Veja o resumo da sua operação hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Antecipado"
          value={formatCurrency(kpis?.totalAnticipated || 0)}
          subtitle="Volume total líquido"
          colorClass="bg-blue-50 text-blue-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KPICard
          title="Clientes Ativos"
          value={String(kpis?.activeClients || 0)}
          subtitle="Aprovados no sistema"
          colorClass="bg-emerald-50 text-emerald-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KPICard
          title="Inadimplência"
          value={`${(kpis?.defaultRate || 0).toFixed(1)}%`}
          subtitle="Taxa de atraso atual"
          colorClass="bg-amber-50 text-amber-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        />
        <KPICard
          title="Atrasos Críticos"
          value={formatCurrency(kpis?.overdueAmount || 0)}
          subtitle="Valores vencidos"
          colorClass="bg-red-50 text-red-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentOperationsTable operations={recentOps} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 mb-4">Eficiência de Deságio</h3>
            <div className="flex items-end justify-between mb-2">
              <p className="text-2xl font-bold text-zinc-900">{(kpis?.averageDiscount || 0).toFixed(2)}%</p>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min((kpis?.averageDiscount || 0) * 10, 100)}%` }} />
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-xl shadow-lg shadow-blue-200 text-white">
            <h3 className="text-sm font-medium opacity-80 mb-4">Propostas Pendentes</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold">{kpis?.pendingOperations || 0}</p>
                <p className="text-xs opacity-80">Aguardando análise</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
