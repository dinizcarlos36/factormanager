export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: 'admin' | 'analista_credito' | 'cobranca' | 'financeiro' | 'contador'
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Address {
  rua: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export interface BankInfo {
  banco: string
  agencia: string
  conta: string
  tipo: string
  pix: string
}

export type ClientStatus = 'rascunho' | 'em_analise' | 'aprovado' | 'rejeitado' | 'suspenso'

export interface Client {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  email: string | null
  phone: string | null
  address: Address | null
  bank_info: BankInfo | null
  credit_limit: number
  status: ClientStatus
  status_comment: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClientContact {
  id: string
  client_id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  is_legal_rep: boolean
  created_at: string
}

export interface ClientDocument {
  id: string
  client_id: string
  doc_type: string
  file_name: string
  file_url: string
  file_key: string
  uploaded_by: string | null
  created_at: string
}

export type TitleType = 'duplicata' | 'boleto' | 'nota_fiscal' | 'contrato'
export type TitleStatus = 'disponivel' | 'em_operacao' | 'liquidado' | 'vencido' | 'inadimplente'

export interface Title {
  id: string
  client_id: string
  title_number: string
  title_type: TitleType
  face_value: number
  due_date: string
  debtor_name: string
  debtor_cnpj: string | null
  status: TitleStatus
  proof_file_url: string | null
  proof_file_key: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: Client
}

export type OperationModality = 'com_recurso' | 'sem_recurso'
export type OperationStatus = 'proposta' | 'contrato_gerado' | 'assinado' | 'pago' | 'liquidado' | 'inadimplente' | 'cancelado'

export interface Operation {
  id: string
  client_id: string
  operation_number: number
  total_face_value: number
  discount_rate: number
  iof_value: number
  tax_value: number
  net_value: number
  modality: OperationModality
  status: OperationStatus
  contract_pdf_url: string | null
  contract_pdf_key: string | null
  contract_hash: string | null
  signed_at: string | null
  signed_by: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: Client
  operation_titles?: OperationTitle[]
}

export interface OperationTitle {
  id: string
  operation_id: string
  title_id: string
  face_value: number
  due_date: string
  titles?: Title
}

export type PaymentType = 'pix' | 'transferencia' | 'boleto' | 'outros'
export type PaymentStatus = 'pendente' | 'confirmado' | 'rejeitado'

export interface Payment {
  id: string
  operation_id: string | null
  title_id: string | null
  amount: number
  payment_type: PaymentType | null
  payment_date: string
  proof_file_url: string | null
  proof_file_key: string | null
  status: PaymentStatus
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface DashboardKPIs {
  totalAnticipated: number
  averageDiscount: number
  defaultRate: number
  averageReceivingDays: number
  activeClients: number
  pendingOperations: number
  totalTitles: number
  overdueAmount: number
}

export interface ContractTemplate {
  id: string
  name: string
  body: string
  created_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ContractStatus = 'pendente' | 'visualizado' | 'assinado' | 'expirado' | 'cancelado'

export interface Contract {
  id: string
  template_id: string | null
  client_id: string | null
  operation_id: string | null
  public_token: string
  body_rendered: string
  status: ContractStatus
  signer_name: string | null
  signer_cpf: string | null
  signer_ip: string | null
  signed_at: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: Client
  operations?: Operation
}
