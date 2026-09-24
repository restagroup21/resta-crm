'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditContactLogPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consultantId, setConsultantId] = useState<number | null>(null)

  const [form, setForm] = useState({
    contact_date: '',
    contact_type: '',
    memo: '',
  })

  useEffect(() => {
    fetchContactLog()
  }, [id])

  async function fetchContactLog() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contact_logs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
        return
      }

      setForm({
        contact_date: data.contact_date ?? '',
        contact_type: data.contact_type ?? '',
        memo: data.memo ?? '',
      })
      setConsultantId(data.consultant_id)
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
        contact_date: form.contact_date,
        contact_type: form.contact_type || null,
        memo: form.memo || null,
      }

      const { error: updateError } = await supabase
        .from('contact_logs')
        .update(payload)
        .eq('id', id)

      if (updateError) {
        setError(`保存に失敗しました: ${updateError.message}`)
        setSubmitting(false)
        return
      }

      // 元の相談者詳細ページに戻る
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link
            href={consultantId ? `/consultants/${consultantId}` : '/'}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← 戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">対応履歴を編集</h1>
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

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? '保存中...' : '💾 保存'}
          </button>
          <Link
            href={consultantId ? `/consultants/${consultantId}` : '/'}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 text-center"
          >
            キャンセル
          </Link>
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