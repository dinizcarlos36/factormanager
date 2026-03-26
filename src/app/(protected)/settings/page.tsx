'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import { cn, formatDateTime } from '@/lib/utils'
import type { UserProfile, AuditLog } from '@/lib/types'
import { useRole } from '@/hooks/useRole'

type Tab = 'profile' | 'rates' | 'users' | 'logs'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'profile', label: 'Perfil',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    key: 'rates', label: 'Taxas Padrão',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    key: 'users', label: 'Usuários',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    key: 'logs', label: 'Auditoria',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
]

// ─── Field ───
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── Toast ───
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in border',
      type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
    )}>
      {message}
    </div>
  )
}

// ═══════════════════════════════════════════
//  TAB 1: Perfil
// ═══════════════════════════════════════════
function ProfileTab({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await insforge.auth.getCurrentUser()
      if (userData?.user) {
        setEmail(userData.user.email || '')
        const { data: profileData } = await insforge.database
          .from('user_profiles').select('*').eq('user_id', userData.user.id).single()
        if (profileData) {
          const p = profileData as UserProfile
          setProfile(p)
          setFullName(p.full_name)
          setPhone(p.phone || '')
        }
      }
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await insforge.database
      .from('user_profiles').update([{ full_name: fullName, phone: phone || null }]).eq('id', profile.id)
    setSaving(false)
    if (error) { onToast('Erro ao salvar perfil', 'error'); return }
    onToast('Perfil atualizado com sucesso!', 'success')
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { onToast('Senhas não coincidem', 'error'); return }
    if (newPassword.length < 6) { onToast('Senha deve ter no mínimo 6 caracteres', 'error'); return }
    setChangingPw(true)
    // TODO: updatePassword not available in current SDK version
    // Use edge function or admin API to update password
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      setChangingPw(false)
      if (!res.ok) { onToast('Erro ao alterar senha', 'error'); return }
      onToast('Senha alterada com sucesso!', 'success')
    } catch {
      setChangingPw(false)
      onToast('Funcionalidade indisponível no momento', 'error')
    }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6">Informações Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Email">
            <input type="email" value={email} disabled className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 cursor-not-allowed" />
          </Field>
          <Field label="Cargo">
            <input type="text" value={profile?.role === 'admin' ? 'Administrador' : 'Analista de Crédito'} disabled className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 cursor-not-allowed" />
          </Field>
          <Field label="Nome Completo *">
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
          </Field>
          <Field label="Telefone">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
          </Field>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={handleSaveProfile} disabled={saving} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6">Alterar Senha</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Senha Atual">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" />
          </Field>
          <Field label="Nova Senha">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" />
          </Field>
          <Field label="Confirmar Nova Senha">
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm" />
          </Field>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={handleChangePassword} disabled={changingPw || !newPassword} className="px-5 py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-900 transition-colors disabled:opacity-60 shadow-sm">
            {changingPw ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  TAB 2: Taxas Padrão
// ═══════════════════════════════════════════
function RatesTab({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [rates, setRates] = useState(() => {
    if (typeof window === 'undefined') return {
      discountRate: '2.50',
      iofDaily: '0.0082',
      iofFixed: '0.38',
      adminFee: '0.50',
    }
    const saved = localStorage.getItem('fm_default_rates')
    return saved ? JSON.parse(saved) : {
      discountRate: '2.50',
      iofDaily: '0.0082',
      iofFixed: '0.38',
      adminFee: '0.50',
    }
  })

  // Removed useEffect for rates loading to avoid cascading renders

  const handleSave = () => {
    localStorage.setItem('fm_default_rates', JSON.stringify(rates))
    onToast('Taxas padrão salvas com sucesso!', 'success')
  }

  const rateFields: { key: keyof typeof rates; label: string; hint: string }[] = [
    { key: 'discountRate', label: 'Taxa de Deságio (%)', hint: 'Aplicada sobre o valor de face dos títulos' },
    { key: 'iofDaily', label: 'IOF Diário (%)', hint: 'Alíquota diária do IOF (base: 0.0082%)' },
    { key: 'iofFixed', label: 'IOF Fixo (%)', hint: 'Alíquota fixa adicional do IOF (base: 0.38%)' },
    { key: 'adminFee', label: 'Taxa Administrativa (%)', hint: 'Taxa de serviço sobre a operação' },
  ]

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-bold text-zinc-900">Taxas Padrão de Operação</h3>
        <p className="text-sm text-zinc-500 mt-1">Estes valores serão preenchidos automaticamente ao criar novas operações.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rateFields.map(f => (
          <div key={String(f.key)}>
            <Field label={f.label}>
              <input
                type="number" step="0.0001" min="0"
                value={rates[f.key]}
                onChange={e => setRates({ ...rates, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </Field>
            <p className="text-xs text-zinc-400 mt-1.5">{f.hint}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
        <p className="text-xs text-zinc-400">Valores salvos localmente no navegador</p>
        <button onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Salvar Taxas
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  TAB 3: Usuários e Permissões
// ═══════════════════════════════════════════
function UsersTab({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '', role: 'analista_credito',
  })

  const loadUsers = async () => {
    const { data } = await insforge.database.from('user_profiles').select('*').order('created_at', { ascending: true })
    if (data) setUsers(data as UserProfile[])
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    const fetch = async () => {
      const { data } = await insforge.database.from('user_profiles').select('*').order('created_at', { ascending: true })
      if (isMounted) {
        if (data) setUsers(data as UserProfile[])
        setLoading(false)
      }
    }
    fetch()
    return () => { isMounted = false }
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await insforge.database
      .from('user_profiles').update([{ role: newRole }]).eq('id', userId)
    if (error) { onToast('Erro ao atualizar cargo', 'error'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as UserProfile['role'] } : u))
    onToast('Cargo atualizado!', 'success')
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.full_name) {
      onToast('Preencha email, senha e nome completo', 'error'); return
    }
    if (form.password.length < 6) {
      onToast('Senha deve ter no mínimo 6 caracteres', 'error'); return
    }
    setCreating(true)
    const { data, error } = await insforge.functions.invoke('admin-create-user', {
      body: {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || null,
      },
      headers: {
        'x-base-url': process.env.NEXT_PUBLIC_INSFORGE_URL || ''
      }
    })
    setCreating(false)
    if (error) {
      console.error('User creation error:', error)
      onToast(error.message || 'Erro de rede ao conectar ao servidor', 'error'); return
    }
    if (data && !data.success) {
      onToast(data.error || 'Erro ao processar criação de usuário', 'error'); return
    }
    onToast(`Usuário ${form.full_name} criado com sucesso!`, 'success')
    setForm({ email: '', password: '', full_name: '', phone: '', role: 'analista_credito' })
    setShowForm(false)
    loadUsers()
  }

  const roleLabel = (role: string) => role === 'admin' ? 'Admin' : 'Analista'
  const roleBadge = (role: string) =>
    role === 'admin'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-zinc-100 text-zinc-600 border-zinc-200'

  return (
    <div className="space-y-6">
      {/* ─── Create User Form ─── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Cadastrar Novo Usuário
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateUser} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm animate-fade-in">
          <h3 className="font-bold text-zinc-900 mb-1">Novo Usuário do Sistema</h3>
          <p className="text-xs text-zinc-400 mb-5">O usuário será criado com email já verificado, sem necessidade de confirmação.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome Completo *">
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="João da Silva" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required />
            </Field>
            <Field label="Email *">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="joao@empresa.com" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required />
            </Field>
            <Field label="Senha *">
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" required />
            </Field>
            <Field label="Telefone">
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999" className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </Field>
            <Field label="Cargo *">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                <option value="admin">Administrador</option>
                <option value="analista_credito">Analista de Crédito</option>
                <option value="cobranca">Cobrança</option>
                <option value="financeiro">Financeiro</option>
                <option value="contador">Contador</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-zinc-200">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={creating} className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-sm">
              {creating ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Users Table ─── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Usuários do Sistema</h3>
          <span className="text-xs font-medium text-zinc-400">{users.length} usuário(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-3">Nome</th>
                <th className="text-left px-6 py-3">Telefone</th>
                <th className="text-left px-6 py-3">Cargo</th>
                <th className="text-left px-6 py-3">Desde</th>
                <th className="text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-400">Carregando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-400 italic">Nenhum usuário encontrado</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {u.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium text-zinc-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{u.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', roleBadge(u.role))}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">{formatDateTime(u.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-600"
                      >
                        <option value="admin">Admin</option>
                        <option value="analista_credito">Analista</option>
                        <option value="cobranca">Cobrança</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="contador">Contador</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════
//  TAB 4: Logs de Auditoria
// ═══════════════════════════════════════════
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await insforge.database.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (data) setLogs(data as AuditLog[])
      setLoading(false)
    }
    load()
  }, [])

  const actions = [...new Set(logs.map(l => l.action))]
  const filtered = filterAction ? logs.filter(l => l.action === filterAction) : logs

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-500">Filtrar por ação:</span>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm bg-white text-zinc-600"
        >
          <option value="">Todas</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-zinc-400">{filtered.length} registros</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="text-left px-6 py-3">Data/Hora</th>
                <th className="text-left px-6 py-3">Ação</th>
                <th className="text-left px-6 py-3">Entidade</th>
                <th className="text-left px-6 py-3">ID</th>
                <th className="text-left px-6 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-400 italic">Nenhum log encontrado</td></tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3 text-zinc-500 text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 capitalize">{log.entity_type}</td>
                    <td className="px-6 py-3 font-mono text-zinc-400 text-xs">{log.entity_id?.slice(0, 8) || '—'}</td>
                    <td className="px-6 py-3 text-zinc-500 text-xs max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { role, loading } = useRole()

  const handleToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
      <div className="flex gap-6">
        <div className="w-56 h-48 bg-zinc-50 rounded animate-pulse" />
        <div className="flex-1 h-96 bg-white rounded-xl border border-zinc-200 animate-pulse" />
      </div>
    </div>
  )

  // Filter tabs: profile is for everyone, others are admin only
  const availableTabs = TABS.filter(t => t.key === 'profile' || role === 'admin')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie seu perfil e preferências do sistema.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Tab Navigation ─── */}
        <nav className="flex lg:flex-col gap-1 lg:w-56 shrink-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <span className={cn(activeTab === tab.key ? 'text-blue-600' : 'text-zinc-400')}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ─── Tab Content ─── */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileTab onToast={handleToast} />}
          {activeTab === 'rates' && role === 'admin' && <RatesTab onToast={handleToast} />}
          {activeTab === 'users' && role === 'admin' && <UsersTab onToast={handleToast} />}
          {activeTab === 'logs' && role === 'admin' && <AuditTab />}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
