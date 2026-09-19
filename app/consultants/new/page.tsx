'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import VoiceInput from '@/app/components/VoiceInput'

export default function NewConsultantPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    received_date: new Date().toISOString().split('T')[0],
    name: '',
    gender: '',
    grade: '',
    guardian_name: '',
    guardian_relation: '',
    phone: '',
    prefecture: '',
    inquiry_route: '',
    status: '対応中',
    notes: '',
  })

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
      // 空文字を null に変換(データベース側でNULLとして扱われる)
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      )

      const { error: insertError } = await supabase
        .from('consultants')
        .insert([payload])

      if (insertError) {
        setError(`保存に失敗しました: ${insertError.message}`)
        setSubmitting(false)
        return
      }

      // 保存成功!ホーム画面に戻る
      router.push('/')
      router.refresh()
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← ホーム
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            新規問い合わせ登録
          </h1>
        </div>
      </header>

      {/* フォーム */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto px-4 py-8 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* 受付日 */}
        <Field label="📅 受付日" required>
          <input
            type="date"
            name="received_date"
            value={form.received_date}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

                {/* 保護者氏名 */}
        <Field label="👨‍👩‍👧 保護者氏名" required>
          <input
            type="text"
            name="guardian_name"
            value={form.guardian_name}
            onChange={handleChange}
            required
            placeholder="山田 花子"
            className="input"
          />
        </Field>

        {/* 本人氏名 */}
        <Field label="👤 本人氏名(お子さん)">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="山田 太郎"
            className="input"
          />
        </Field>

        {/* 性別 */}
        <Field label="⚧ 性別">
          <select name="gender" value={form.gender} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        {/* 学年 */}
        <Field label="📚 学年">
          <select name="grade" value={form.grade} onChange={handleChange} className="input">
            <option value="">選択してください</option>
            <option value="小1">小1</option>
            <option value="小2">小2</option>
            <option value="小3">小3</option>
            <option value="小4">小4</option>
            <option value="小5">小5</option>
            <option value="小6">小6</option>
            <option value="中1">中1</option>
            <option value="中2">中2</option>
            <option value="中3">中3</option>
            <option value="高1">高1</option>
            <option value="高2">高2</option>
            <option value="高3">高3</option>
            <option value="高卒後">高卒後</option>
          </select>
        </Field>

        {/* 続柄 */}
        <Field label="👥 続柄">
          <select
            name="guardian_relation"
            value={form.guardian_relation}
            onChange={handleChange}
            className="input"
          >
            <option value="">選択してください</option>
            <option value="父">父</option>
            <option value="母">母</option>
            <option value="祖父">祖父</option>
            <option value="祖母">祖母</option>
            <option value="兄弟姉妹">兄弟姉妹</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        {/* 電話番号 */}
        <Field label="📞 電話番号">
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="090-XXXX-XXXX"
            className="input"
          />
        </Field>

        {/* 都道府県 */}
        <Field label="🗾 都道府県">
          <select
            name="prefecture"
            value={form.prefecture}
            onChange={handleChange}
            className="input"
          >
            <option value="">選択してください</option>
            {[
              '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
              '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
              '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
              '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
              '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
              '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
              '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
            ].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        {/* 問い合わせ経路 */}
        <Field label="📢 問い合わせ経路">
          <select
            name="inquiry_route"
            value={form.inquiry_route}
            onChange={handleChange}
            className="input"
          >
            <option value="">選択してください</option>
            <option value="HP">HP</option>
            <option value="知人紹介">知人紹介</option>
            <option value="行政紹介">行政紹介</option>
            <option value="その他">その他</option>
          </select>
        </Field>

        {/* ステータス */}
        <Field label="📊 ステータス">
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="input"
          >
            <option value="対応中">対応中</option>
            <option value="検討中">検討中</option>
            <option value="入寮決定">入寮決定</option>
            <option value="入寮済">入寮済</option>
            <option value="辞退">辞退</option>
            <option value="対応終了">対応終了</option>
          </select>
        </Field>

                {/* 備考(音声入力対応) */}
        <Field label="📝 備考(🎤ボタンで音声入力可)">
          <VoiceInput
            name="notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
            placeholder="自由に記入 / 🎤ボタンで音声入力"
            rows={4}
          />
        </Field>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
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

// フィールドコンポーネント
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