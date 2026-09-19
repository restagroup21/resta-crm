'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
}

interface ContactLog {
  id: number
  contact_date: string
  contact_type: string | null
  memo: string | null
}

interface Resident {
  id: number
  entry_count: string | null
  entry_date: string
  exit_date: string | null
  notes: string | null
}

export default function ConsultantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      // 相談者情報
      const { data: c, error: e1 } = await supabase
        .from('consultants')
        .select('*')
        .eq('id', id)
        .single()

      if (e1) {
        setError(e1.message)
        return
      }
      setConsultant(c)

      // 対応履歴
      const { data: logs } = await supabase
        .from('contact_logs')
        .select('*')
        .eq('consultant_id', id)
        .order('contact_date', { ascending: false })

      setContactLogs(logs ?? [])

      // 入寮情報
      const { data: res } = await supabase
        .from('residents')
        .select('*')
        .eq('consultant_id', id)
        .order('entry_date', { ascending: false })

      setResidents(res ?? [])
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('この相談者を削除しますか?対応履歴と入寮情報も一緒に削除されます。')) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('consultants')
        .delete()
        .eq('id', id)

      if (error) {
        alert(`削除に失敗しました: ${error.message}`)
        setDeleting(false)
        return
      }

      router.push('/consultants')
      router.refresh()
    } catch (e) {
      alert(`予期せぬエラー: ${e}`)
      setDeleting(false)
    }
  }

  const statusColors: Record<string, string> = {
    対応中: 'bg-blue-100 text-blue-700',
    検討中: 'bg-yellow-100 text-yellow-700',
    入寮決定: 'bg-purple-100 text-purple-700',
    入寮済: 'bg-green-100 text-green-700',
    辞退: 'bg-gray-100 text-gray-500',
    対応終了: 'bg-gray-100 text-gray-500',
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  if (error || !consultant) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/consultants" className="text-gray-500 text-sm">
            ← 相談者一覧
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4">
            エラー: {error || '相談者が見つかりません'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/consultants" className="text-gray-500 hover:text-gray-700 text-sm">
            ← 一覧
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">相談者詳細</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 基本情報カード */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {consultant.guardian_name || '(保護者名未登録)'}
              </h2>
              {consultant.name && (
                <p className="text-gray-600 mt-1">👤 {consultant.name}</p>
              )}
            </div>
            {consultant.status && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[consultant.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {consultant.status}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem label="📅 受付日" value={consultant.received_date} />
            <InfoItem label="👥 続柄" value={consultant.guardian_relation} />
            <InfoItem label="⚧ 性別" value={consultant.gender} />
            <InfoItem label="📚 学年" value={consultant.grade} />
            <InfoItem label="📞 電話番号" value={consultant.phone} />
            <InfoItem label="🗾 都道府県" value={consultant.prefecture} />
            <InfoItem label="📢 どこで知ったか" value={consultant.inquiry_route} />
            <InfoItem
              label="📱 連絡手段"
              value={
                consultant.inquiry_channel
                  ? `${consultant.inquiry_channel}${
                      consultant.line_name ? ` (${consultant.line_name})` : ''
                    }`
                  : null
              }
            />
          </dl>

          {consultant.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">📝 備考</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {consultant.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
            <Link
              href={`/consultants/${id}/edit`}
              className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              ✏️ 編集
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? '削除中...' : '🗑 削除'}
            </button>
          </div>
        </section>

        {/* 対応履歴 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📝 対応履歴 ({contactLogs.length}件)
            </h3>
            <Link
              href="/contact-logs/new"
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded"
            >
              + 追加
            </Link>
          </div>

          {contactLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              対応履歴がありません
            </p>
          ) : (
            <div className="space-y-3">
              {contactLogs.map((log) => (
                <div
                  key={log.id}
                  className="border-l-4 border-blue-200 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-gray-500">
                        {log.contact_date}
                      </span>
                      {log.contact_type && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {log.contact_type}
                        </span>
                      )}
                    </div>
                  </div>
                  {log.memo && (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {log.memo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 入寮情報 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🏠 入寮情報 ({residents.length}件)
            </h3>
            <Link
              href="/residents/new"
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded"
            >
              + 追加
            </Link>
          </div>

          {residents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              入寮情報がありません
            </p>
          ) : (
            <div className="space-y-3">
              {residents.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {r.entry_count}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        r.exit_date
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.exit_date ? '退寮済' : '在寮中'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    📅 入寮: {r.entry_date}
                    {r.exit_date && <> / 退寮: {r.exit_date}</>}
                  </div>
                  {r.notes && (
                    <p className="text-sm text-gray-700 mt-2">{r.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{value || '-'}</dd>
    </div>
  )
}
