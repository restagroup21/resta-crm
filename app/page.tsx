'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<string>('接続確認中...')

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from('consultants')
          .select('count', { count: 'exact', head: true })

        if (error) {
          setConnectionStatus(`❌ エラー: ${error.message}`)
        } else {
          setConnectionStatus('✅ Supabaseに接続できました!')
        }
      } catch (e) {
        setConnectionStatus(`❌ 予期せぬエラー: ${e}`)
      }
    }
    testConnection()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">リスタCRM</h1>
      <p className="text-lg text-gray-600 mb-8">開発版</p>
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">接続テスト</h2>
        <p className="text-gray-700">{connectionStatus}</p>
      </div>
    </main>
  )
}