'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditConsultantPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    received_date: '',
    name: '',
    gender: '',
    grade: '',
    guardian_name: '',
    guardian_relation: '',
    phone: '',
    prefecture: '',
    inquiry_route: '',
    inquiry_channel: '',
    line_name: '',
    status: '',
    notes: '',
  })

  useEffect(() => {
    fetchConsultant()
  }, [id])

  async function fetchConsultant() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
        return
      }

      setForm({
        received_date: data.received_date ?? '',
        name: data.name ?? '',
        gender: data.gender ?? '',
        grade: data.grade ?? '',
        guardian_name: data.guardian_name ?? '',
        guardian_relation: data.guardian_relation ?? '',
        phone: data.phone ?? '',
        prefecture: data.prefecture ?? '',
        inquiry_route: data.inquiry_route ?? '',
        inquiry_channel: data.inquiry_channel ?? '',
        line_name: data.line_name ?? '',
        status: data.status ?? '対応中',
        notes: data.notes ?? '',
      })
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
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      )

      const { error: updateError } = await supabase
        .from('consultants')
        .update(payload)
        .eq('id', id)

      if (updateError) {
        setError(`保存に失敗しました: ${updateError.message}`)
        setSubmitting(false)
        return
      }

      router.push(`/consultants/${id}`)
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
          <Link href={`/consultants/${id}`} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 詳細
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">相談者を編集</h1>
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

        <Field label="📅 受付日" required>
          <input type="date" name="received_date" value={form.received_date} onChange={handleChange} required className="input" />
        </Field>

        <Field label="👨‍👩‍👧 保護者氏名" required>
          <input type="text" name="guardian_name" value={form.guardian_name} onChange={handleChange} required className="input" />
        </Field>

        <Field label="👤 本人氏名(お子さん)">
          <input type="text" name="name" value={form.name} onChange={handleChange} className="input" />
        </Field>

        <Field label="⚧ 性別">
          <select name="gender" value={form.gender} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        <Field label="📚 学年">
          <select name="grade" value={form.grade} onChange={handleChange} className="input">
            <option value="">選択してください</option>
                        {['小学生','小1','小2','小3','小4','小5','小6','中学生','中1','中2','中3','高校生','高1','高2','高3','高卒後'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>

        <Field label="👥 続柄">
          <select name="guardian_relation" value={form.guardian_relation} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            {['父','母','祖父','祖母','兄弟姉妹','その他'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="📞 電話番号">
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input" />
        </Field>

        <Field label="🗾 都道府県">
          <select name="prefecture" value={form.prefecture} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            {['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="📢 どこで知ったか">
          <select name="inquiry_route" value={form.inquiry_route} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            <option value="HP">HP</option>
            <option value="知人紹介">知人紹介</option>
            <option value="行政紹介">行政紹介</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        <Field label="📱 どの手段で連絡が来たか">
          <select name="inquiry_channel" value={form.inquiry_channel} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            <option value="LINE">LINE</option>
            <option value="電話">電話</option>
            <option value="メール">メール</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        {form.inquiry_channel === 'LINE' && (
          <Field label="💬 LINE名">
            <input type="text" name="line_name" value={form.line_name} onChange={handleChange} className="input" />
          </Field>
        )}

        <Field label="📊 ステータス">
          <select name="status" value={form.status} onChange={handleChange} className="input">
            <option value="対応中">対応中</option>
            <option value="検討中">検討中</option>
            <option value="入寮決定">入寮決定</option>
            <option value="入寮済">入寮済</option>
            <option value="辞退">辞退</option>
            <option value="対応終了">対応終了</option>
          </select>
        </Field>

        <Field label="📝 備考">
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} className="input" />
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
            href={`/consultants/${id}`}
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