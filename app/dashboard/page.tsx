'use client'

import { useEffect, useMemo, useState } from 'react'
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
  dormBreakdown: Record<string, number>
  consultantDates: string[]  // received_dateのリスト
}

type Period = '30days' | 'thisMonth' | '3months'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('30days')

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const { data: consultants, error: e1 } = await supabase
        .from('consultants')
        .select('*')
      if (e1) throw new Error(e1.message)

      const { data: contactLogs, error: e2 } = await supabase
        .from('contact_logs')
        .select('*')
      if (e2) throw new Error(e2.message)

      const { data: residents, error: e3 } = await supabase
        .from('residents')
        .select('*')
      if (e3) throw new Error(e3.message)

      const totalConsultants = consultants?.length ?? 0
      const totalContactLogs = contactLogs?.length ?? 0
      const totalResidents = residents?.length ?? 0
      const activeResidents = residents?.filter((r) => !r.exit_date).length ?? 0

      const conversionRate = totalConsultants > 0
        ? Math.round((totalResidents / totalConsultants) * 1000) / 10
        : 0

      const exitedResidents = residents?.filter((r) => r.exit_date && r.entry_date) ?? []
      const totalMonths = exitedResidents.reduce((sum, r) => {
        const entry = new Date(r.entry_date)
        const exit = new Date(r.exit_date!)
        const diffMs = exit.getTime() - entry.getTime()
        const months = diffMs / (1000 * 60 * 60 * 24 * 30.44)
        return sum + months
      }, 0)
      const avgStayMonths = exitedResidents.length > 0
        ? Math.round((totalMonths / exitedResidents.length) * 10) / 10
        : 0

      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const thisMonthConsultants = consultants?.filter((c) =>
        c.received_date?.startsWith(thisMonth)
      ).length ?? 0

      const thisMonthEntries = residents?.filter((r) =>
        r.entry_date?.startsWith(thisMonth)
      ).length ?? 0

      const statusBreakdown: Record<string, number> = {}
      for (const s of ['対応中', '入寮済', '対応終了']) {
        statusBreakdown[s] = consultants?.filter((c) => c.status === s).length ?? 0
      }

      const inquiryRouteBreakdown: Record<string, number> = {}
      for (const r of ['HP', '知人紹介', '行政紹介', 'その他']) {
        inquiryRouteBreakdown[r] = consultants?.filter((c) => c.inquiry_route === r).length ?? 0
      }

      const inquiryChannelBreakdown: Record<string, number> = {}
      for (const ch of ['LINE', '電話', 'メール', 'メッセージ', 'その他']) {
        inquiryChannelBreakdown[ch] = consultants?.filter((c) => c.inquiry_channel === ch).length ?? 0
      }

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

      const dormBreakdown: Record<string, number> = {}
      for (const d of ['東京本校', '静岡校']) {
        dormBreakdown[d] = residents?.filter((r) => !r.exit_date && r.dorm === d).length ?? 0
      }

      // 問い合わせ日のリスト
      const consultantDates = consultants
        ?.map((c) => c.received_date)
        .filter((d): d is string => !!d) ?? []

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
        dormBreakdown,
        consultantDates,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // 期間別の問い合わせ数集計
  const chartData = useMemo(() => {
    if (!stats) return { labels: [], values: [], max: 0, periodLabel: '' }

    const now = new Date()
    const dateCount: Record<string, number> = {}

    if (period === '30days') {
      // 直近30日間、日ごと
      const labels: string[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        labels.push(key)
        dateCount[key] = 0
      }
      stats.consultantDates.forEach((d) => {
        if (dateCount[d] !== undefined) {
          dateCount[d]++
        }
      })
      const values = labels.map((l) => dateCount[l])
      const displayLabels = labels.map((l) => {
        const [, m, d] = l.split('-')
        return `${parseInt(m)}/${parseInt(d)}`
      })
      return {
        labels: displayLabels,
        values,
        max: Math.max(...values, 1),
        periodLabel: '直近30日(日ごと)',
      }
    } else if (period === 'thisMonth') {
      // 今月、日ごと
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const daysInMonth = new Date(year, month, 0).getDate()

      const labels: string[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        labels.push(key)
        dateCount[key] = 0
      }
      stats.consultantDates.forEach((d) => {
        if (dateCount[d] !== undefined) {
          dateCount[d]++
        }
      })
      const values = labels.map((l) => dateCount[l])
      const displayLabels = labels.map((l) => {
        const [, , d] = l.split('-')
        return `${parseInt(d)}日`
      })
      return {
        labels: displayLabels,
        values,
        max: Math.max(...values, 1),
        periodLabel: `${year}年${month}月(日ごと)`,
      }
    } else {
      // 直近3ヶ月、月ごと
      const labels: string[] = []
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        labels.push(key)
        dateCount[key] = 0
      }
      stats.consultantDates.forEach((d) => {
        const monthKey = d.slice(0, 7)
        if (dateCount[monthKey] !== undefined) {
          dateCount[monthKey]++
        }
      })
      const values = labels.map((l) => dateCount[l])
      const displayLabels = labels.map((l) => {
        const [y, m] = l.split('-')
        return `${y.slice(2)}/${parseInt(m)}月`
      })
      return {
        labels: displayLabels,
        values,
        max: Math.max(...values, 1),
        periodLabel: '直近3ヶ月(月ごと)',
      }
    }
  }, [stats, period])

  const total = chartData.values.reduce((a, b) => a + b, 0)

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
          <Link href="/" className="text-gray-500 text-sm">← ホーム</Link>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4">
            エラー: {error || 'データがありません'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← ホーム</Link>
          <h1 className="text-2xl font-bold text-gray-900">📊 ダッシュボード</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">🎯 主要KPI</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Kpi label="累計相談者" value={stats.totalConsultants} unit="人" color="blue" />
            <Kpi label="累計対応件数" value={stats.totalContactLogs} unit="件" color="indigo" />
            <Kpi label="累計入寮" value={stats.totalResidents} unit="人" color="purple" />
            <Kpi label="現在の在寮" value={stats.activeResidents} unit="人" color="green" />
            <Kpi label="転換率" value={stats.conversionRate} unit="%" color="orange" />
            <Kpi label="平均在寮期間" value={stats.avgStayMonths} unit="ヶ月" color="pink" />
          </div>
        </section>

        {/* 問い合わせ数グラフ */}
        <section className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="text-base font-semibold text-gray-700">
              📈 問い合わせ数の推移
            </h3>
            <div className="flex gap-1">
              {([
                { key: '30days', label: '30日' },
                { key: 'thisMonth', label: '今月' },
                { key: '3months', label: '3ヶ月' },
              ] as const).map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    period === p.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {chartData.periodLabel} - 合計 <span className="font-semibold text-gray-900">{total}</span>件
          </p>

          {/* 棒グラフ(SVG) */}
          <BarChart labels={chartData.labels} values={chartData.values} max={chartData.max} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">📅 今月の状況</h2>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="今月の新規相談" value={stats.thisMonthConsultants} unit="件" color="teal" />
            <Kpi label="今月の入寮者" value={stats.thisMonthEntries} unit="人" color="cyan" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">🏠 現在の寮別在寮者</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.dormBreakdown).map(([dorm, count]) => (
              <Kpi key={dorm} label={dorm} value={count} unit="人" color="green" />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">📋 ステータス別内訳</h3>
          <div className="space-y-2">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <BreakdownRow key={status} label={status} count={count} total={stats.totalConsultants} />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">📢 どこで知ったか</h3>
          <div className="space-y-2">
            {Object.entries(stats.inquiryRouteBreakdown).map(([route, count]) => (
              <BreakdownRow key={route} label={route} count={count} total={stats.totalConsultants} />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">📱 連絡手段</h3>
          <div className="space-y-2">
            {Object.entries(stats.inquiryChannelBreakdown).map(([channel, count]) => (
              <BreakdownRow key={channel} label={channel} count={count} total={stats.totalConsultants} />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-3">🗾 都道府県別 上位5</h3>
          {stats.prefectureTop.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-2">
              {stats.prefectureTop.map((p) => (
                <BreakdownRow key={p.name} label={p.name} count={p.count} total={stats.totalConsultants} />
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-400 text-center pt-4">
          ※ データは最新の状態です。ページを再読み込みすると更新されます。
        </p>
      </div>
    </main>
  )
}

function BarChart({ labels, values, max }: { labels: string[]; values: number[]; max: number }) {
  const barCount = labels.length
  const chartHeight = 180
  const chartWidth = Math.max(barCount * 24, 320)  // 棒ごとに24px確保
  const barWidth = chartWidth / barCount - 4  // 棒の幅
  const padding = 4

  return (
    <div className="overflow-x-auto">
      <svg
        width={chartWidth}
        height={chartHeight + 40}
        className="min-w-full"
      >
        {/* 棒グラフ */}
        {values.map((v, i) => {
          const barHeight = max > 0 ? (v / max) * chartHeight : 0
          const x = i * (chartWidth / barCount) + padding / 2
          const y = chartHeight - barHeight

          return (
            <g key={i}>
              {/* 棒 */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={v > 0 ? '#3b82f6' : '#e5e7eb'}
                rx="2"
              />
              {/* 値ラベル(0以外のみ) */}
              {v > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="600"
                >
                  {v}
                </text>
              )}
              {/* X軸ラベル */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {labels[i]}
              </text>
            </g>
          )
        })}
        {/* X軸 */}
        <line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke="#d1d5db"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}

function Kpi({ label, value, unit, color }: { label: string; value: number; unit: string; color: 'blue' | 'indigo' | 'purple' | 'green' | 'orange' | 'pink' | 'teal' | 'cyan' }) {
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

function BreakdownRow({ label, count, total }: { label: string; count: number; total: number }) {
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
