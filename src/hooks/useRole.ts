'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import type { UserProfile } from '@/lib/types'

export type UserRole = 'admin' | 'analista_credito' | 'cobranca' | 'financeiro' | 'contador'

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: userData } = await insforge.auth.getCurrentUser()
        if (userData?.user) {
          const { data, error } = await insforge.database
            .from('user_profiles')
            .select('*')
            .eq('user_id', userData.user.id)
            .single()

          if (data && !error) {
            const p = data as UserProfile
            setRole(p.role)
            setProfile(p)
          }
        }
      } catch (err) {
        console.error('Failed to fetch role:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  const hasRole = (roles: UserRole[]) => role && roles.includes(role)
  const isAdmin = role === 'admin'
  const isAnalyst = role === 'analista_credito'
  const isFinance = role === 'financeiro'
  const isCollections = role === 'cobranca'
  const isAccountant = role === 'contador'

  return { 
    role, 
    profile, 
    loading, 
    hasRole,
    isAdmin,
    isAnalyst,
    isFinance,
    isCollections,
    isAccountant
  }
}
