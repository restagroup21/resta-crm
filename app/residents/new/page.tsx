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

export default function NewResidentPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchConsultant, setSearchConsultant] = useState('')

  const [form, setForm] = useState({
    consultant_id: '',
    entry_count: '1回目',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    notes: '',
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

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        consultant_id: parseInt(form.consultant_id),
        entry_count: form.entry_count,
        entry_date: form.entry_date,
        exit_date: form.exit_date || null,
        notes: form.notes || null,
      }

      const { error: insertError } = await supabase
        .from('residents')
        .insert([payload])

      if (insertError) {
        setError(`保存に失敗しました: ${insertError.message}`)
        setSubmitting(false)
        return
      }

      // 相談者のステータスも「入寮済」に自動更新
      await supabase
        .from('consultants')
        .update({ status: '入寮済' })
        .eq('id', parseInt(form.consultant_id))

      router.push('/')
      router.refresh()
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
      setSubmitting(false)
    }
  }

  const filteredConsultants = consultants.filter((c) => {
    if (!searchConsultant) return true
    const s = searchConsultant.toLowerCase()
    return (
      c.name?.toLowerCase().includes(s) ||
      c.guardian_name?.toLowerCase().includes(s) ||
      c.line_name?.toLowerCase().includes(s)
    )
  })

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
          <h1 className="text-2xl font-bold text-gray-900">入寮者登録</h1>
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

        {/* 入寮回数 */}
        <Field label="🔢 入寮回数" required>
          <select
            name="entry_count"
            value={form.entry_count}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="1回目">1回目</option>
            <option value="2回目">2回目</option>
            <option value="3回目">3回目</option>
          </select>
        </Field>

        {/* 入寮日 */}
        <Field label="📅 入寮日" required>
          <input
            type="date"
            name="entry_date"
            value={form.entry_date}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        {/* 退寮日 */}
        <Field label="📅 退寮日(まだ在寮中なら空欄)">
          <input
            type="date"
            name="exit_date"
            value={form.exit_date}
            onChange={handleChange}
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">
            まだ在寮中の場合は空欄のままにしてください
          </p>
        </Field>

        {/* 備考 */}
        <Field label="📝 備考">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="自由に記入"
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