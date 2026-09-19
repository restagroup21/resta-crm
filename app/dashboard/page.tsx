'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalConsultants: number
  totalContactLogs: number
  totalResidents: number
  activeResidents: number
  conversionRate: number
  avgStayMonths: number
  thisMonthConsultants: number
  thisMonthEntries: number
  statusBreakdown: Record<string, number>
  inquiryRouteBreakdown: Record<string, number>
  inquiryChannelBreakdown: Record<string, number>
  prefectureTop: Array<{ name: string; count: number }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      // 相談者データ全件
      const { data: consultants, error: e1 } = await supabase
        .from('consultants')
        .select('*')

      if (e1) throw new Error(e1.message)

      // 対応履歴全件
      const { data: contactLogs, error: e2 } = await supabase
        .from('contact_logs')
        .select('*')

      if (e2) throw new Error(e2.message)

      // 入寮者データ全件
      const { data: residents, error: e3 } = await supabase
        .from('residents')
        .select('*')

      if (e3) throw new Error(e3.message)

      // 集計処理
      const totalConsultants = consultants?.length ?? 0
      const totalContactLogs = contactLogs?.length ?? 0
      const totalResidents = residents?.length ?? 0

      // 在寮中(退寮日が空)
      const activeResidents =
        residents?.filter((r) => !r.exit_date).length ?? 0

      // 転換率(入寮者÷相談者)
      const conversionRate =
        totalConsultants > 0
          ? Math.round((totalResidents / totalConsultants) * 1000) / 10
          : 0

      // 平均在寮期間(退寮済のみで計算)
      const exitedResidents =
        residents?.filter((r) => r.exit_date && r.entry_date) ?? []
      const totalMonths = exitedResidents.reduce((sum, r) => {
        const entry = new Date(r.entry_date)
        const exit = new Date(r.exit_date!)
        const diffMs = exit.getTime() - entry.getTime()
        const months = diffMs / (1000 * 60 * 60 * 24 * 30.44)
        return sum + months
      }, 0)
      const avgStayMonths =
        exitedResidents.length > 0
          ? Math.round((totalMonths / exitedResidents.length) * 10) / 10
          : 0

      // 今月の集計
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const thisMonthConsultants =
        consultants?.filter((c) =>
          c.received_date?.startsWith(thisMonth)
        ).length ?? 0

      const thisMonthEntries =
        residents?.filter((r) => r.entry_date?.startsWith(thisMonth)).length ??
        0

      // ステータス別
      const statusBreakdown: Record<string, number> = {}
      for (const s of ['対応中', '検討中', '入寮決定', '入寮済', '辞退', '対応終了']) {
        statusBreakdown[s] = consultants?.filter((c) => c.status === s).length ?? 0
      }

      // どこで知ったか別
      const inquiryRouteBreakdown: Record<string, number> = {}
      for (const r of ['HP', '知人紹介', '行政紹介', 'その他']) {
        inquiryRouteBreakdown[r] =
          consultants?.filter((c) => c.inquiry_route === r).length ?? 0
      }

      // 連絡手段別
      const inquiryChannelBreakdown: Record<string, number> = {}
      for (const ch of ['LINE', '電話', 'メール', 'その他']) {
        inquiryChannelBreakdown[ch] =
          consultants?.filter((c) => c.inquiry_channel === ch).length ?? 0
      }

      // 都道府県別上位5
      const prefCount: Record<string, number> = {}
      consultants?.forEach((c) => {
        if (c.prefecture) {
          prefCount[c.prefecture] = (prefCount[c.prefecture] ?? 0) + 1
        }
      })
      const prefectureTop = Object.entries(prefCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setStats({
        totalConsultants,
        totalContactLogs,
        totalResidents,
        activeResidents,
        conversionRate,
        avgStayMonths,
        thisMonthConsultants,
        thisMonthEntries,
        statusBreakdown,
        inquiryRouteBreakdown,
        inquiryChannelBreakdown,
        prefectureTop,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">集計中...</p>
      </main>
    )
  }

  if (error || !stats) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-gray-500 text-sm">
            ← ホーム
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4">
            エラー: {error || 'データがありません'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホーム
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">📊 ダッシュボード</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 主要KPI 上段 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            🎯 主要KPI
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Kpi label="累計相談者" value={stats.totalConsultants} unit="人" color="blue" />
            <Kpi label="累計対応件数" value={stats.totalContactLogs} unit="件" color="indigo" />
            <Kpi label="累計入寮" value={stats.totalResidents} unit="人" color="purple" />
            <Kpi label="現在の在寮" value={stats.activeResidents} unit="人" color="green" />
            <Kpi label="転換率" value={stats.conversionRate} unit="%" color="orange" />
            <Kpi label="平均在寮期間" value={stats.avgStayMonths} unit="ヶ月" color="pink" />
          </div>
        </section>

        {/* 今月 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            📅 今月の状況
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="今月の新規相談" value={stats.thisMonthConsultants} unit="件" color="teal" />
            <Kpi label="今月の入寮者" value={stats.thisMonthEntries} unit="人" color="cyan" />
          </div>
        </section>

        {/* ステータス別 */}
        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">
            📋 ステータス別内訳
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <BreakdownRow
                key={status}
                label={status}
                count={count}
                total={stats.totalConsultants}
              />
            ))}
          </div>
        </section>

        {/* どこで知ったか */}
        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">
            📢 どこで知ったか
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.inquiryRouteBreakdown).map(([route, count]) => (
              <BreakdownRow
                key={route}
                label={route}
                count={count}
                total={stats.totalConsultants}
              />
            ))}
          </div>
        </section>

        {/* 連絡手段 */}
        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">
            📱 連絡手段
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.inquiryChannelBreakdown).map(([channel, count]) => (
              <BreakdownRow
                key={channel}
                label={channel}
                count={count}
                total={stats.totalConsultants}
              />
            ))}
          </div>
        </section>

        {/* 都道府県別 */}
        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">
            🗾 都道府県別 上位5
          </h3>
          {stats.prefectureTop.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-2">
              {stats.prefectureTop.map((p) => (
                <BreakdownRow
                  key={p.name}
                  label={p.name}
                  count={p.count}
                  total={stats.totalConsultants}
                />
              ))}
            </div>
          )}
        </section>

        {/* 補足 */}
        <p className="text-xs text-gray-400 text-center pt-4">
          ※ データは最新の状態です。ページを再読み込みすると更新されます。
        </p>
      </div>
    </main>
  )
}

// KPIカード
function Kpi({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: number
  unit: string
  color: 'blue' | 'indigo' | 'purple' | 'green' | 'orange' | 'pink' | 'teal' | 'cyan'
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    pink: 'bg-pink-50 text-pink-700 border-pink-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  }
  return (
    <div className={`${colors[color]} border rounded-lg p-4`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-sm ml-1">{unit}</span>
      </p>
    </div>
  )
}

// 内訳行(ラベル + 数値 + 割合)
function BreakdownRow({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium text-gray-900">
        {count}人 <span className="text-gray-400 text-xs">({percentage}%)</span>
      </span>
    </div>
  )
}
