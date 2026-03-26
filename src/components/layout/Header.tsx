'use client'

import { insforge } from '@/lib/insforge'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data } = await insforge.auth.getCurrentUser()
      if (data?.user) {
        setUserName(data.user.email || 'Usuário')
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await insforge.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-zinc-200 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-zinc-900">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-4 border-r border-zinc-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-zinc-900">{userName || 'Usuário'}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Administrador</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
          title="Sair"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clientes',
    '/clients/new': 'Novo Cliente',
    '/titles': 'Títulos',
    '/titles/new': 'Novo Título',
    '/operations': 'Operações',
    '/operations/new': 'Nova Operação',
    '/contracts': 'Contratos',
    '/contracts/templates': 'Modelos de Contrato',
    '/contracts/new': 'Gerar Contrato',
    '/conciliation': 'Conciliação',
    '/reports': 'Relatórios',
    '/settings': 'Configurações',
  }
  return titles[pathname] || 'FactorManager'
}
