'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Consultant {
  id: number
  name: string | null
  guardian_name: string | null
  line_name: string | null
  received_date: string
}

export default function NewContactLogPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchConsultant, setSearchConsultant] = useState('')

  const [form, setForm] = useState({
    consultant_id: '',
    contact_date: new Date().toISOString().split('T')[0],
    contact_type: '',
    memo: '',
    next_action_type: '',
    next_action_date: '',
    next_action_memo: '',
  })

  useEffect(() => {
    fetchConsultants()
  }, [])

  async function fetchConsultants() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('id, name, guardian_name, line_name, received_date')
        .order('received_date', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setConsultants(data ?? [])
      }
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.consultant_id) {
      setError('相談者を選択してください')
      return
    }
    if (!form.contact_type) {
      setError('対応種別を選択してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        consultant_id: parseInt(form.consultant_id),
        contact_date: form.contact_date,
        contact_type: form.contact_type,
        memo: form.memo || null,
      }

            const { error: insertError } = await supabase
        .from('contact_logs')
        .insert([payload])

      if (insertError) {
        setError(`保存に失敗しました: ${insertError.message}`)
        setSubmitting(false)
        return
      }

      // 相談者情報を更新
      const consultantUpdate: Record<string, string | null> = {}

      // 対応種別が「辞退」ならステータスも自動更新
      if (form.contact_type === '辞退') {
        consultantUpdate.status = '対応終了'
      }

      // 次回予定が入力されていたら更新
      if (form.next_action_type) {
        consultantUpdate.next_action_type = form.next_action_type
        consultantUpdate.next_action_date = form.next_action_date || null
        consultantUpdate.next_action_memo = form.next_action_memo || null
      }

      if (Object.keys(consultantUpdate).length > 0) {
        await supabase
          .from('consultants')
          .update(consultantUpdate)
          .eq('id', parseInt(form.consultant_id))
      }

      router.push('/')
      router.refresh()
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
      setSubmitting(false)
    }
  }

  // 相談者検索フィルタ
  const filteredConsultants = consultants.filter((c) => {
    if (!searchConsultant) return true
    const s = searchConsultant.toLowerCase()
    return (
      c.name?.toLowerCase().includes(s) ||
      c.guardian_name?.toLowerCase().includes(s) ||
      c.line_name?.toLowerCase().includes(s)
    )
  })

  // 相談者の表示名
  const consultantLabel = (c: Consultant) => {
    const parts = []
    if (c.guardian_name) parts.push(c.guardian_name)
    if (c.name) parts.push(`(${c.name})`)
    if (c.line_name) parts.push(`[LINE: ${c.line_name}]`)
    return parts.join(' ') || `ID: ${c.id}`
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホーム
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">対応履歴を追加</h1>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto px-4 py-8 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* 相談者選択 */}
        <Field label="👤 相談者を選択" required>
          {loading ? (
            <p className="text-gray-500 text-sm py-2">読み込み中...</p>
          ) : consultants.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
              相談者がまだ登録されていません。
              <Link href="/consultants/new" className="underline ml-1">
                先に新規問い合わせ登録
              </Link>
              をしてください。
            </div>
          ) : (
            <>
              <input
                type="text"
                value={searchConsultant}
                onChange={(e) => setSearchConsultant(e.target.value)}
                placeholder="🔍 氏名で絞り込み"
                className="input mb-2"
              />
              <select
                name="consultant_id"
                value={form.consultant_id}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="">選択してください</option>
                {filteredConsultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {consultantLabel(c)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {filteredConsultants.length}件 / 全{consultants.length}件
              </p>
            </>
          )}
        </Field>

        {/* 対応日 */}
        <Field label="📅 対応日" required>
          <input
            type="date"
            name="contact_date"
            value={form.contact_date}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        {/* 対応種別 */}
        <Field label="📞 対応種別" required>
          <select
            name="contact_type"
            value={form.contact_type}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="">選択してください</option>
            <option value="LINE">LINE</option>
            <option value="電話">電話</option>
            <option value="オンライン面談">オンライン面談</option>
            <option value="対面面談">対面面談</option>
            <option value="辞退">辞退</option>
            <option value="連絡待ち">連絡待ち</option>
          </select>
        </Field>

                {/* メモ */}
        <Field label="📝 メモ">
          <textarea
            name="memo"
            value={form.memo}
            onChange={handleChange}
            rows={5}
            placeholder="対応内容の詳細を記入"
            className="input"
          />
        </Field>

        {/* 次回予定 */}
        <Field label="🗓 次回予定(相談者情報を更新)">
          <select
            name="next_action_type"
            value={form.next_action_type}
            onChange={handleChange}
            className="input"
          >
            <option value="">変更しない</option>
            <option value="連絡待ち">連絡待ち</option>
            <option value="電話・LINE予定">電話・LINE予定</option>
            <option value="面談予定">面談予定</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        {/* 次回予定日 */}
        <Field label="📅 次回予定日(任意)">
          <input
            type="date"
            name="next_action_date"
            value={form.next_action_date}
            onChange={handleChange}
            className="input"
          />
        </Field>

        {/* 次回予定メモ */}
        <Field label="📝 次回予定メモ(任意)">
          <input
            type="text"
            name="next_action_memo"
            value={form.next_action_memo}
            onChange={handleChange}
            placeholder="例: 保護者と面談、資料送付予定"
            className="input"
          />
        </Field>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting || consultants.length === 0}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '保存中...' : '💾 保存'}
          </button>
          <Link
            href="/"
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors text-center"
          >
            キャンセル
          </Link>
        </div>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background-color: white;
          font-size: 1rem;
        }
        .input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </main>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}