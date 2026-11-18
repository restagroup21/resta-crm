'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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

type MissingField = '' | 'status' | 'route' | 'channel' | 'prefecture'

const missingLabels: Record<MissingField, string> = {
  '': '',
  status: 'ステータス',
  route: '流入経路(どこで知ったか)',
  channel: '連絡手段',
  prefecture: '都道府県',
}

function ConsultantsListContent() {
  const searchParams = useSearchParams()
  const initialInterviewed = searchParams.get('interviewed') === '1'
  const initialMissingRaw = searchParams.get('missing') ?? ''
  const initialMissing: MissingField = (['status', 'route', 'channel', 'prefecture'].includes(initialMissingRaw)
    ? initialMissingRaw
    : '') as MissingField

  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [latestContacts, setLatestContacts] = useState<Record<number, LatestContact>>({})
  const [interviewedIds, setInterviewedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [nextActionOnly, setNextActionOnly] = useState<boolean>(false)
  const [nextActionTypeFilter, setNextActionTypeFilter] = useState<string>('')
  const [interviewedOnly, setInterviewedOnly] = useState<boolean>(initialInterviewed)
  const [missingFilter, setMissingFilter] = useState<MissingField>(initialMissing)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data: consultantsData, error: e1 } = await supabase
        .from('consultants')
        .select('*')

      if (e1) {
        setError(e1.message)
        return
      }

      const { data: logsData, error: e2 } = await supabase
        .from('contact_logs')
        .select('*')
        .order('contact_date', { ascending: false })
        .order('id', { ascending: false })

      if (e2) {
        setError(e2.message)
        return
      }

      const latest: Record<number, LatestContact> = {}
      const interviewSet = new Set<number>()
      const interviewTypes = ['オンライン面談', '対面面談']

      ;(logsData ?? []).forEach((log: ContactLog) => {
        if (!latest[log.consultant_id]) {
          latest[log.consultant_id] = {
            date: log.contact_date,
            type: log.contact_type,
          }
        }
        if (log.contact_type && interviewTypes.includes(log.contact_type)) {
          interviewSet.add(log.consultant_id)
        }
      })

      const sorted = [...(consultantsData ?? [])].sort((a, b) => {
        const latestA = latest[a.id]
        const latestB = latest[b.id]
        if (latestA && latestB) {
          if (latestA.date !== latestB.date) {
            return latestA.date > latestB.date ? -1 : 1
          }
          return b.id - a.id
        }
        if (latestA && !latestB) return -1
        if (!latestA && latestB) return 1
        if (a.received_date !== b.received_date) {
          return a.received_date > b.received_date ? -1 : 1
        }
        return b.id - a.id
      })

      setConsultants(sorted)
      setLatestContacts(latest)
      setInterviewedIds(interviewSet)
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const normalizePhone = (s: string) => s.replace(/[\s\-ー－]/g, '')

  const filtered = consultants.filter((c) => {
    const searchLower = search.toLowerCase()
    const searchDigits = normalizePhone(search)
    const phoneDigits = c.phone ? normalizePhone(c.phone) : ''

    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(searchLower) ||
      c.guardian_name?.toLowerCase().includes(searchLower) ||
      c.line_name?.toLowerCase().includes(searchLower) ||
      (searchDigits && phoneDigits.includes(searchDigits))

    const matchesStatus = !statusFilter || c.status === statusFilter

    const matchesNextActionAny = !nextActionOnly || !!c.next_action_type

    const matchesNextActionType =
      !nextActionTypeFilter || c.next_action_type === nextActionTypeFilter

    const matchesInterviewed = !interviewedOnly || interviewedIds.has(c.id)

    let matchesMissing = true
    if (missingFilter === 'status') matchesMissing = !c.status
    else if (missingFilter === 'route') matchesMissing = !c.inquiry_route
    else if (missingFilter === 'channel') matchesMissing = !c.inquiry_channel
    else if (missingFilter === 'prefecture') matchesMissing = !c.prefecture

    return matchesSearch && matchesStatus && matchesNextActionAny && matchesNextActionType && matchesInterviewed && matchesMissing
  })

  const statusColors: Record<string, string> = {
    対応中: 'bg-blue-100 text-blue-700',
    入寮済: 'bg-green-100 text-green-700',
    対応終了: 'bg-gray-100 text-gray-500',
  }

  const contactTypeColors: Record<string, string> = {
    初回問い合わせ: 'bg-purple-100 text-purple-700',
    LINE: 'bg-green-100 text-green-700',
    電話: 'bg-orange-100 text-orange-700',
    メール: 'bg-cyan-100 text-cyan-700',
    メッセージ: 'bg-teal-100 text-teal-700',
    オンライン面談: 'bg-blue-100 text-blue-700',
    対面面談: 'bg-indigo-100 text-indigo-700',
    辞退: 'bg-gray-100 text-gray-500',
    連絡待ち: 'bg-yellow-100 text-yellow-700',
    その他: 'bg-gray-100 text-gray-700',
  }

  const nextActionColors: Record<string, string> = {
    連絡待ち: 'bg-yellow-100 text-yellow-700',
    '電話・LINE予定': 'bg-blue-100 text-blue-700',
    面談予定: 'bg-orange-100 text-orange-700',
    入寮予定: 'bg-purple-100 text-purple-700',
    返信なし: 'bg-red-100 text-red-700',
    辞退: 'bg-gray-200 text-gray-600',
    その他: 'bg-gray-100 text-gray-700',
  }

  const toggleNextActionOnly = () => {
    const newVal = !nextActionOnly
    setNextActionOnly(newVal)
    if (!newVal) {
      setNextActionTypeFilter('')
    }
  }

  const nextActionTypes = ['連絡待ち', '電話・LINE予定', '面談予定', '入寮予定', '返信なし', '辞退', 'その他']

  const interviewedCount = interviewedIds.size

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← ホーム</Link>
          <h1 className="text-2xl font-bold text-gray-900">相談者一覧</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 回答ナシフィルター表示 */}
        {missingFilter && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  「{missingLabels[missingFilter]}」が未入力の人だけ表示中
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  💡 相談者をタップして編集画面から情報を追加できます
                </p>
              </div>
            </div>
            <button
              onClick={() => setMissingFilter('')}
              className="text-xs text-amber-700 hover:bg-amber-100 px-2 py-1 rounded"
            >
              ✕ 解除
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-3">
          <div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 氏名・LINE名・電話番号で検索" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded-full text-sm ${statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              すべて
            </button>
            {['対応中', '入寮済', '対応終了'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-sm ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {s}
              </button>
            ))}
            <button
              onClick={toggleNextActionOnly}
              className={`px-3 py-1 rounded-full text-sm ${nextActionOnly ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              🗓 次回予定あり {nextActionOnly ? '▼' : '▶'}
            </button>
            <button
              onClick={() => setInterviewedOnly(!interviewedOnly)}
              className={`px-3 py-1 rounded-full text-sm ${interviewedOnly ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              title={`面談(オンライン/対面)を実施した相談者: ${interviewedCount}人`}
            >
              🤝 面談経験あり
            </button>
          </div>

          {/* 次回予定の種別フィルター */}
          {nextActionOnly && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">次回予定の種別で絞り込み:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNextActionTypeFilter('')}
                  className={`px-3 py-1 rounded-full text-xs ${nextActionTypeFilter === '' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  すべて
                </button>
                {nextActionTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setNextActionTypeFilter(t)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      nextActionTypeFilter === t
                        ? 'bg-orange-500 text-white'
                        : nextActionColors[t] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 面談経験ありの時のヒント */}
          {interviewedOnly && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-indigo-700">
                💡 ステータスボタンと組み合わせると、面談後に<span className="font-semibold">入寮済・対応終了・対応中</span>になった人を絞り込めます
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            📊 <span className="font-semibold">{filtered.length}</span>件
            {search || statusFilter || nextActionOnly || nextActionTypeFilter || interviewedOnly || missingFilter ? ` / 全${consultants.length}件` : ''}
            <span className="ml-2 text-xs text-gray-400">(対応順)</span>
          </p>
          <Link href="/consultants/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
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
            {consultants.length === 0 ? '相談者がまだ登録されていません' : '条件に合う相談者が見つかりません'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const latest = latestContacts[c.id]
              const hasInterview = interviewedIds.has(c.id)
              return (
                <Link key={c.id} href={`/consultants/${c.id}`} className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {c.guardian_name || '(保護者名未登録)'}
                        {c.name && (<span className="text-gray-500 font-normal ml-2">/ {c.name}</span>)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">受付: {c.received_date}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {hasInterview && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          🤝 面談済
                        </span>
                      )}
                      {c.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                          {c.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {latest ? (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-gray-500">🕒 最新:</span>
                        <span className="font-medium text-gray-900">{latest.date}</span>
                        {latest.type && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${contactTypeColors[latest.type] || 'bg-gray-100 text-gray-700'}`}>
                            {latest.type}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">🕒 まだ対応履歴がありません</p>
                    )}

                    {c.next_action_type && (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-gray-500">🗓 次回:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${nextActionColors[c.next_action_type] || 'bg-gray-100 text-gray-700'}`}>
                          {c.next_action_type}
                        </span>
                        {c.next_action_date && (<span className="text-gray-700 text-xs">{c.next_action_date}</span>)}
                        {c.next_action_memo && (<span className="text-gray-600 text-xs">{c.next_action_memo}</span>)}
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
                        {c.line_name && ` (${c.line_name})`}
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

export default function ConsultantsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    }>
      <ConsultantsListContent />
    </Suspense>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-100 px-2 py-1 rounded">{children}</span>
  )
}
