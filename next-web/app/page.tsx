'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    let live = true
    const t = setTimeout(() => { if (live) setStuck(true) }, 6000)
    const go = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!live) return
        router.replace(user ? '/dashboard' : '/auth/login')
      } catch {
        if (live) setStuck(true)
      }
    }
    go()
    return () => { live = false; clearTimeout(t) }
  }, [router, supabase])
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand-600" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">SherPay</p>
        <p className="mt-1 text-sm text-ink-secondary">Loading…</p>
        {stuck ? <a href="/auth/login" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">Continue to sign in</a> : null}
      </div>
    </div>
  )
}
