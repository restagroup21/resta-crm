'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface ConsultantInfo {
  id: number
  guardian_name: string | null
  name: string | null
}

export default function EditResidentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consultantId, setConsultantId] = useState<number | null>(null)
  const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo | null>(null)

  const [form, setForm] = useState({
    entry_count: '1回目',
    entry_date: '',
    exit_date: '',
    dorm: '',
    notes: '',
  })

  useEffect(() => {
    fetchResident()
  }, [id])

  async function fetchResident() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
        return
      }

      setForm({
        entry_count: data.entry_count ?? '1回目',
        entry_date: data.entry_date ?? '',
        exit_date: data.exit_date ?? '',
        dorm: data.dorm ?? '',
        notes: data.notes ?? '',
      })
      setConsultantId(data.consultant_id)

      // 相談者情報を取得
      if (data.consultant_id) {
        const { data: c } = await supabase
          .from('consultants')
          .select('id, guardian_name, name')
          .eq('id', data.consultant_id)
          .single()
        if (c) setConsultantInfo(c)
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
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        entry_count: form.entry_count,
        entry_date: form.entry_date,
        exit_date: form.exit_date || null,
        dorm: form.dorm || null,
        notes: form.notes || null,
      }

      const { error: updateError } = await supabase
        .from('residents')
        .update(payload)
        .eq('id', id)

      if (updateError) {
        setError(`保存に失敗しました: ${updateError.message}`)
        setSubmitting(false)
        return
      }

      // 退寮日が入ったら、相談者のステータスを「対応終了」に自動更新
      if (form.exit_date && consultantId) {
        await supabase
          .from('consultants')
          .update({ status: '対応終了' })
          .eq('id', consultantId)
      }

      if (consultantId) {
        router.push(`/consultants/${consultantId}`)
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('この入寮情報を削除しますか?')) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id)

      if (error) {
        alert(`削除に失敗しました: ${error.message}`)
        setDeleting(false)
        return
      }

      if (consultantId) {
        router.push(`/consultants/${consultantId}`)
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (e) {
      alert(`予期せぬエラー: ${e}`)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  const consultantLabel = consultantInfo
    ? `${consultantInfo.guardian_name || '(保護者名未登録)'}${consultantInfo.name ? ` (${consultantInfo.name})` : ''}`
    : ''

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href={consultantId ? `/consultants/${consultantId}` : '/'} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">入寮情報を編集</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
        )}

        {consultantInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium">👤 {consultantLabel}</p>
          </div>
        )}

        <Field label="🏠 入寮先の寮" required>
          <select name="dorm" value={form.dorm} onChange={handleChange} required className="input">
            <option value="">選択してください</option>
            <option value="東京本校">東京本校</option>
            <option value="静岡校">静岡校</option>
          </select>
        </Field>

        <Field label="🔢 入寮回数" required>
          <select name="entry_count" value={form.entry_count} onChange={handleChange} required className="input">
            <option value="1回目">1回目</option>
            <option value="2回目">2回目</option>
            <option value="3回目">3回目</option>
          </select>
        </Field>

        <Field label="📅 入寮日" required>
          <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} required className="input" />
        </Field>

        <Field label="📅 退寮日">
          <input type="date" name="exit_date" value={form.exit_date} onChange={handleChange} className="input" />
          <p className="text-xs text-gray-500 mt-1">
            退寮日を入れると、相談者ステータスが自動で「対応終了」に変わります
          </p>
        </Field>

        <Field label="📝 備考">
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="自由に記入" className="input" />
        </Field>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            {submitting ? '保存中...' : '💾 保存'}
          </button>
          <Link href={consultantId ? `/consultants/${consultantId}` : '/'} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 text-center">
            キャンセル
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full bg-red-50 text-red-600 font-medium py-2 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? '削除中...' : '🗑 この入寮情報を削除'}
          </button>
        </div>

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
      </form>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
