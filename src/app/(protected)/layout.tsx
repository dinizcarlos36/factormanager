'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await insforge.auth.getCurrentUser()
        if (!data?.user) {
          router.push('/login')
          return
        }
        setLoading(false)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Carregando FactorManager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <Sidebar />
      <div className="flex-1 min-h-screen flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
