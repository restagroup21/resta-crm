'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const PUBLIC_PATHS = ['/login']

/**
 * ログインしていない場合はログイン画面へ移動させる。
 * データそのものはSupabaseのRLS（ログイン済みの職員のみ閲覧可）で守られているため、
 * この画面側のチェックは「見た目」の制御。
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (checking) return
    if (!session && !isPublic) router.replace('/login')
    if (session && pathname === '/login') router.replace('/')
  }, [checking, session, isPublic, pathname, router])

  if (isPublic) return <>{children}</>

  if (checking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">読み込み中...</p>
      </div>
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      <div className="bg-gray-800 text-gray-100 text-xs">
        <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center justify-end gap-3">
          <span className="truncate">{session.user.email}</span>
          <button
            onClick={handleLogout}
            className="rounded px-2 py-0.5 border border-gray-500 hover:bg-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>
      {children}
    </>
  )
}
