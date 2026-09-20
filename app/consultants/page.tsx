'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Consultant {
  id: number
  received_date: string
  name: string | null
  gender: string | null
  grade: string | null
  guardian_name: string | null
  guardian_relation: string | null
  phone: string | null
  prefecture: string | null
  inquiry_route: string | null
  inquiry_channel: string | null
  line_name: string | null
  status: string | null
  notes: string | null
  next_action_type: string | null
  next_action_date: string | null
  next_action_memo: string | null
}

interface ContactLog {
  id: number
  consultant_id: number
  contact_date: string
  contact_type: string | null
  memo: string | null
}

interface LatestContact {
  date: string
  type: string | null
}

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [latestContacts, setLatestContacts] = useState<Record<number, LatestContact>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      // 相談者
      const { data: consultantsData, error: e1 } = await supabase
        .from('consultants')
        .select('*')
        .order('received_date', { ascending: false })
        .order('id', { ascending: false })

      if (e1) {
        setError(e1.message)
        return
      }

      // 対応履歴(全件、日付降順)
      const { data: logsData, error: e2 } = await supabase
        .from('contact_logs')
        .select('*')
        .order('contact_date', { ascending: false })
        .order('id', { ascending: false })

      if (e2) {
        setError(e2.message)
        return
      }

      // 各相談者の最新対応履歴を抽出
      const latest: Record<number, LatestContact> = {}
      ;(logsData ?? []).forEach((log: ContactLog) => {
        if (!latest[log.consultant_id]) {
          latest[log.consultant_id] = {
            date: log.contact_date,
            type: log.contact_type,
          }
        }
      })

      setConsultants(consultantsData ?? [])
      setLatestContacts(latest)
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const filtered = consultants.filter((c) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(searchLower) ||
      c.guardian_name?.toLowerCase().includes(searchLower) ||
      c.line_name?.toLowerCase().includes(searchLower)

    const matchesStatus = !statusFilter || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, string> = {
    対応中: 'bg-blue-100 text-blue-700',
    検討中: 'bg-yellow-100 text-yellow-700',
    入寮決定: 'bg-purple-100 text-purple-700',
    入寮済: 'bg-green-100 text-green-700',
    辞退: 'bg-gray-100 text-gray-500',
    対応終了: 'bg-gray-100 text-gray-500',
  }

  const contactTypeColors: Record<string, string> = {
    LINE: 'bg-green-100 text-green-700',
    電話: 'bg-orange-100 text-orange-700',
    オンライン面談: 'bg-blue-100 text-blue-700',
    対面面談: 'bg-indigo-100 text-indigo-700',
    辞退: 'bg-gray-100 text-gray-500',
    連絡待ち: 'bg-yellow-100 text-yellow-700',
  }

  const nextActionColors: Record<string, string> = {
    連絡待ち: 'bg-yellow-100 text-yellow-700',
    '電話・LINE予定': 'bg-blue-100 text-blue-700',
    面談予定: 'bg-orange-100 text-orange-700',
    辞退: 'bg-gray-200 text-gray-600',
    その他: 'bg-gray-100 text-gray-700',
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホーム
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">相談者一覧</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-3">
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 氏名・LINE名で検索"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1 rounded-full text-sm ${
                statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              すべて
            </button>
            {['対応中', '検討中', '入寮決定', '入寮済', '辞退', '対応終了'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-sm ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            📊 <span className="font-semibold">{filtered.length}</span>件
            {search || statusFilter ? ` / 全${consultants.length}件` : ''}
          </p>
          <Link
            href="/consultants/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + 新規登録
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            エラー: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {consultants.length === 0
              ? '相談者がまだ登録されていません'
              : '条件に合う相談者が見つかりません'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const latest = latestContacts[c.id]
              return (
                <Link
                  key={c.id}
                  href={`/consultants/${c.id}`}
                  className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {c.guardian_name || '(保護者名未登録)'}
                        {c.name && (
                          <span className="text-gray-500 font-normal ml-2">
                            / {c.name}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        受付: {c.received_date}
                      </p>
                    </div>
                    {c.status && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[c.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    )}
                  </div>

                  {/* 最新対応 + 次回予定 */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {latest ? (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-gray-500">🕒 最新:</span>
                        <span className="font-medium text-gray-900">
                          {latest.date}
                        </span>
                        {latest.type && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              contactTypeColors[latest.type] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {latest.type}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">🕒 まだ対応履歴がありません</p>
                    )}

                    {/* 次回予定 */}
                    {c.next_action_type && (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-gray-500">🗓 次回:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            nextActionColors[c.next_action_type] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {c.next_action_type}
                        </span>
                        {c.next_action_date && (
                          <span className="text-gray-700 text-xs">
                            {c.next_action_date}
                          </span>
                        )}
                        {c.next_action_memo && (
                          <span className="text-gray-600 text-xs">
                            {c.next_action_memo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-3">
                    {c.grade && <Tag>📚 {c.grade}</Tag>}
                    {c.prefecture && <Tag>🗾 {c.prefecture}</Tag>}
                    {c.inquiry_route && <Tag>📢 {c.inquiry_route}</Tag>}
                    {c.inquiry_channel && (
                      <Tag>
                        📱 {c.inquiry_channel}
                        {c.inquiry_channel === 'LINE' && c.line_name && ` (${c.line_name})`}
                      </Tag>
                    )}
                    {c.phone && <Tag>📞 {c.phone}</Tag>}
                  </div>

                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-100 px-2 py-1 rounded">
      {children}
    </span>
  )
}