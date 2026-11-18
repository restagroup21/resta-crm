'use client'

import { useEffect, useState, useRef } from 'react'
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
  next_action_type: string | null
  next_action_date: string | null
  next_action_memo: string | null
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
  dorm: string | null
  notes: string | null
}

interface Attachment {
  id: number
  file_path: string
  file_name: string
  file_type: string | null
  file_size: number | null
  description: string | null
  uploaded_at: string
  signedUrl?: string
}

const BUCKET = 'consultant-attachments'

export default function ConsultantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDescription, setUploadDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    try {
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

      const { data: logs } = await supabase
        .from('contact_logs')
        .select('*')
        .eq('consultant_id', id)
        .order('contact_date', { ascending: false })

      setContactLogs(logs ?? [])

      const { data: res } = await supabase
        .from('residents')
        .select('*')
        .eq('consultant_id', id)
        .order('entry_date', { ascending: false })

      setResidents(res ?? [])

      // 添付ファイル取得 + signed URL生成(1時間有効)
      const { data: atts } = await supabase
        .from('consultant_attachments')
        .select('*')
        .eq('consultant_id', id)
        .order('uploaded_at', { ascending: false })

      if (atts && atts.length > 0) {
        const withUrls = await Promise.all(
          atts.map(async (a: Attachment) => {
            const { data: urlData } = await supabase
              .storage
              .from(BUCKET)
              .createSignedUrl(a.file_path, 3600)
            return { ...a, signedUrl: urlData?.signedUrl }
          })
        )
        setAttachments(withUrls)
      } else {
        setAttachments([])
      }
    } catch (e) {
      setError(`予期せぬエラー: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('この相談者を削除しますか?対応履歴・入寮情報・添付ファイルも一緒に削除されます。')) return

    setDeleting(true)
    try {
      // storage上の添付ファイルも削除
      if (attachments.length > 0) {
        await supabase.storage.from(BUCKET).remove(attachments.map(a => a.file_path))
      }

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

  async function handleDeleteContactLog(logId: number) {
    if (!confirm('この対応履歴を削除しますか?')) return

    try {
      const { error } = await supabase
        .from('contact_logs')
        .delete()
        .eq('id', logId)

      if (error) {
        alert(`削除に失敗しました: ${error.message}`)
        return
      }

      fetchData()
    } catch (e) {
      alert(`予期せぬエラー: ${e}`)
    }
  }

  async function handleDeleteResident(residentId: number) {
    if (!confirm('この入寮情報を削除しますか?')) return

    try {
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentId)

      if (error) {
        alert(`削除に失敗しました: ${error.message}`)
        return
      }

      fetchData()
    } catch (e) {
      alert(`予期せぬエラー: ${e}`)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('ファイルサイズは20MB以下にしてください')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const random = Math.random().toString(36).slice(2, 10)
      const filePath = `${id}/${Date.now()}-${random}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        alert(`アップロードに失敗しました: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('consultant_attachments')
        .insert([{
          consultant_id: parseInt(id),
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          description: uploadDescription || null,
        }])

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([filePath])
        alert(`保存に失敗しました: ${insertError.message}`)
        setUploading(false)
        return
      }

      setUploadDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchData()
    } catch (err) {
      alert(`予期せぬエラー: ${err}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteAttachment(att: Attachment) {
    if (!confirm(`「${att.description || att.file_name}」を削除しますか?`)) return

    try {
      await supabase.storage.from(BUCKET).remove([att.file_path])

      const { error } = await supabase
        .from('consultant_attachments')
        .delete()
        .eq('id', att.id)

      if (error) {
        alert(`削除に失敗しました: ${error.message}`)
        return
      }

      fetchData()
    } catch (e) {
      alert(`予期せぬエラー: ${e}`)
    }
  }

  const statusColors: Record<string, string> = {
    対応中: 'bg-blue-100 text-blue-700',
    入寮済: 'bg-green-100 text-green-700',
    対応終了: 'bg-gray-100 text-gray-500',
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
          <Link href="/consultants" className="text-gray-500 text-sm">← 相談者一覧</Link>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4">
            エラー: {error || '相談者が見つかりません'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link href="/consultants" className="text-gray-500 hover:text-gray-700 text-sm">← 一覧</Link>
          <h1 className="text-2xl font-bold text-gray-900">相談者詳細</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[consultant.status] || 'bg-gray-100 text-gray-700'}`}>
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
            <InfoItem label="📱 連絡手段" value={consultant.inquiry_channel} />
            {consultant.line_name && (
              <InfoItem label="💬 LINE名" value={consultant.line_name} />
            )}
          </dl>

          {consultant.next_action_type && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">🗓 次回予定</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${nextActionColors[consultant.next_action_type] || 'bg-gray-100 text-gray-700'}`}>
                  {consultant.next_action_type}
                </span>
                {consultant.next_action_date && (
                  <span className="text-sm text-gray-700">{consultant.next_action_date}</span>
                )}
                {consultant.next_action_memo && (
                  <span className="text-sm text-gray-600">{consultant.next_action_memo}</span>
                )}
              </div>
            </div>
          )}

          {consultant.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">📝 内容</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{consultant.notes}</p>
            </div>
          )}

          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
            <Link href={`/consultants/${id}/edit`} className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg font-medium hover:bg-blue-700">
              ✏️ 編集
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50">
              {deleting ? '削除中...' : '🗑 削除'}
            </button>
          </div>
        </section>

        {/* 📎 添付ファイルセクション */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📎 添付ファイル ({attachments.length}件)
          </h3>

          {/* アップロード欄 */}
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <input
              type="text"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="ラベル(例: カウンセリングシート) ※任意"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              disabled={uploading}
            />
            <label className={`block w-full text-center py-2 rounded font-medium cursor-pointer ${uploading ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {uploading ? 'アップロード中...' : '📷 画像・PDFを選択 / 撮影'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500">
              💡 スマホの場合、カメラ撮影 or 写真ライブラリから選択できます(最大20MB)
            </p>
          </div>

          {/* 添付一覧 */}
          {attachments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">まだ添付ファイルがありません</p>
          ) : (
            <div className="space-y-3">
              {attachments.map((att) => {
                const isImage = att.file_type?.startsWith('image/')
                return (
                  <div key={att.id} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                    <div className="flex-shrink-0">
                      {isImage && att.signedUrl ? (
                        <a href={att.signedUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={att.signedUrl}
                            alt={att.file_name}
                            className="w-20 h-20 object-cover rounded border border-gray-200"
                          />
                        </a>
                      ) : (
                        <a href={att.signedUrl} target="_blank" rel="noopener noreferrer" className="w-20 h-20 flex items-center justify-center bg-red-50 rounded border border-red-200 text-3xl">
                          📄
                        </a>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {att.description && (
                        <p className="font-medium text-gray-900 text-sm">{att.description}</p>
                      )}
                      <p className="text-xs text-gray-600 truncate" title={att.file_name}>
                        {att.file_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatBytes(att.file_size)} ・ {new Date(att.uploaded_at).toLocaleString('ja-JP')}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {att.signedUrl && (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                          >
                            👁 開く
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteAttachment(att)}
                          className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                        >
                          🗑 削除
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📝 対応履歴 ({contactLogs.length}件)
            </h3>
            <Link
              href={`/contact-logs/new?consultant_id=${id}`}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded"
            >
              + 追加
            </Link>
          </div>

          {contactLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">対応履歴がありません</p>
          ) : (
            <div className="space-y-3">
              {contactLogs.map((log) => (
                <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500">{log.contact_date}</span>
                      {log.contact_type && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {log.contact_type}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/contact-logs/${log.id}/edit`} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                        ✏️
                      </Link>
                      <button onClick={() => handleDeleteContactLog(log.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                        🗑
                      </button>
                    </div>
                  </div>
                  {log.memo && (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{log.memo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🏠 入寮情報 ({residents.length}件)
            </h3>
            <Link
              href={`/residents/new?consultant_id=${id}`}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded"
            >
              + 追加
            </Link>
          </div>

          {residents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">入寮情報がありません</p>
          ) : (
            <div className="space-y-3">
              {residents.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <span className="font-medium text-sm">{r.entry_count}</span>
                      {r.dorm && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          🏠 {r.dorm}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${r.exit_date ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {r.exit_date ? '退寮済' : '在寮中'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/residents/${r.id}/edit`} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                        ✏️
                      </Link>
                      <button onClick={() => handleDeleteResident(r.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
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

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
