'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [stats, setStats] = useState({
    consultants: 0,
    contactLogs: 0,
    activeResidents: 0,
    loading: true,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        // 相談者数
        const { count: consultantsCount } = await supabase
          .from('consultants')
          .select('*', { count: 'exact', head: true })

        // 対応履歴数
        const { count: contactLogsCount } = await supabase
          .from('contact_logs')
          .select('*', { count: 'exact', head: true })

        // 在寮者数(退寮日が入っていない人)
        const { count: activeResidentsCount } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .is('exit_date', null)

        setStats({
          consultants: consultantsCount ?? 0,
          contactLogs: contactLogsCount ?? 0,
          activeResidents: activeResidentsCount ?? 0,
          loading: false,
        })
      } catch (e) {
        console.error('データ取得エラー:', e)
        setStats((prev) => ({ ...prev, loading: false }))
      }
    }
    fetchStats()
  }, [])

  const menuItems = [
    {
      href: '/consultants/new',
      icon: '👤',
      title: '新規問い合わせ登録',
      description: '相談者情報を登録',
    },
    {
      href: '/contact-logs/new',
      icon: '📝',
      title: '対応履歴を追加',
      description: '電話・LINE・面談などを記録',
    },
    {
      href: '/residents/new',
      icon: '🏠',
      title: '入寮者登録',
      description: '入寮日・退寮日を管理',
    },
    {
      href: '/consultants',
      icon: '📋',
      title: '相談者一覧',
      description: 'すべての相談者を検索・閲覧',
    },
    {
      href: '/dashboard',
      icon: '📊',
      title: 'ダッシュボード',
      description: '集計・分析グラフを見る',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            リスタCRM
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            リスタスクール 相談者・入寮者管理システム
          </p>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 統計カード */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            📊 現在の状況
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="累計相談者"
              value={stats.consultants}
              unit="人"
              color="blue"
              loading={stats.loading}
            />
            <StatCard
              label="累計対応件数"
              value={stats.contactLogs}
              unit="件"
              color="green"
              loading={stats.loading}
            />
            <StatCard
              label="現在の在寮者"
              value={stats.activeResidents}
              unit="人"
              color="orange"
              loading={stats.loading}
            />
          </div>
        </section>

        {/* メニュー */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            🎯 やること
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 flex items-start gap-4 group"
              >
                <div className="text-4xl">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* フッター */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <p>Powered by Next.js + Supabase + Vercel</p>
        </footer>
      </div>
    </main>
  )
}

// 統計カードコンポーネント
function StatCard({
  label,
  value,
  unit,
  color,
  loading,
}: {
  label: string
  value: number
  unit: string
  color: 'blue' | 'green' | 'orange'
  loading: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
  }

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      {loading ? (
        <p className="text-2xl font-bold">...</p>
      ) : (
        <p className="text-2xl font-bold">
          {value}
          <span className="text-sm ml-1">{unit}</span>
        </p>
      )}
    </div>
  )
}
