export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function parseCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  const calcDigit = (digits: string, factors: number[]): number => {
    let sum = 0
    for (let i = 0; i < factors.length; i++) {
      sum += parseInt(digits[i]) * factors[i]
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const factors1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const factors2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const digit1 = calcDigit(cleaned, factors1)
  const digit2 = calcDigit(cleaned, factors2)

  return parseInt(cleaned[12]) === digit1 && parseInt(cleaned[13]) === digit2
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function calculateNetValue(
  totalFaceValue: number,
  discountRate: number,
  iofValue: number,
  taxValue: number
): number {
  return totalFaceValue * (1 - discountRate) - iofValue - taxValue
}

export function calculateIOF(
  totalFaceValue: number,
  daysToMaturity: number,
  iofDailyRate: number = 0.000082,
  iofFixed: number = 0.0038
): number {
  const dailyIOF = totalFaceValue * iofDailyRate * Math.min(daysToMaturity, 365)
  const fixedIOF = totalFaceValue * iofFixed
  return Number((dailyIOF + fixedIOF).toFixed(2))
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    rascunho: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    em_analise: 'bg-amber-50 text-amber-700 border-amber-200',
    aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejeitado: 'bg-red-50 text-red-700 border-red-200',
    suspenso: 'bg-orange-50 text-orange-700 border-orange-200',
    disponivel: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    em_operacao: 'bg-blue-50 text-blue-700 border-blue-200',
    liquidado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    vencido: 'bg-red-50 text-red-700 border-red-200',
    inadimplente: 'bg-red-50 text-red-700 border-red-200',
    proposta: 'bg-blue-50 text-blue-700 border-blue-200',
    contrato_gerado: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    assinado: 'bg-blue-50 text-blue-700 border-blue-200',
    pago: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelado: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    pendente: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return `inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    em_analise: 'Em Análise',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    suspenso: 'Suspenso',
    disponivel: 'Disponível',
    em_operacao: 'Em Operação',
    liquidado: 'Liquidado',
    vencido: 'Vencido',
    inadimplente: 'Inadimplente',
    proposta: 'Proposta',
    contrato_gerado: 'Contrato Gerado',
    assinado: 'Assinado',
    pago: 'Pago',
    cancelado: 'Cancelado',
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    com_recurso: 'Com Recurso',
    sem_recurso: 'Sem Recurso',
  }
  return labels[status] || status
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
