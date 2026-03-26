'use client'

import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'
import { useParams, useRouter } from 'next/navigation'
import type { Contract, Client } from '@/lib/types'

export default function PublicSigningPage() {
  const { token } = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    const fetchContract = async () => {
      const { data } = await insforge.database
        .from('contracts')
        .select('*, clients(*)')
        .eq('token', token)
        .single()
      
      if (data) {
        setContract(data)
        setClient(data.clients)
      }
      setLoading(false)
    }
    fetchContract()
  }, [token])

  const handleSign = async () => {
    setSigning(true)
    try {
      await insforge.database
        .from('contracts')
        .update({ status: 'assinado', signed_at: new Date().toISOString() })
        .eq('token', token)
      
      // Update operation status too if needed
      
      setSigning(false)
      alert('Contrato assinado com sucesso!')
    } catch (error) {
      console.error(error)
      setSigning(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50">Carregando...</div>

  if (!contract) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Contrato não encontrado</h1>
        <p className="text-zinc-500 mt-2">Este link pode ter expirado ou o contrato foi removido.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Assinatura Digital de Contrato</h1>
          <p className="text-zinc-500 mt-2">
            Olá, <span className="font-bold">{client?.razao_social}</span>. Você recebeu um contrato para assinatura digital.
          </p>
        </div>

        <div className="bg-white p-12 rounded-xl border border-zinc-200 shadow-sm font-serif text-zinc-800 leading-relaxed min-h-[600px] whitespace-pre-wrap">
          {contract.body_rendered}
        </div>

        <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-bold text-zinc-900">Concordo com os termos acima</h3>
            <p className="text-sm text-zinc-500">Ao clicar em assinar, você confirma sua identidade e aceita este contrato digitalmente.</p>
          </div>
          <button
            onClick={handleSign}
            disabled={signing || contract.status === 'assinado'}
            className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {contract.status === 'assinado' ? 'Contrato já Assinado' : signing ? 'Assinando...' : 'Assinar Contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}
