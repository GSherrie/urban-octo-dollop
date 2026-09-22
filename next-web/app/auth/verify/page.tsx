'use client'
/*
 * Resend strategy for auth emails
 * --------------------------------
 * Preferred path:
 *   - Use Supabase Auth SMTP/Resend integration for verification, OTP, and
 *     password reset emails. Those emails are part of the Supabase Auth token
 *     lifecycle, so they are easiest to manage from the Supabase dashboard.
 *
 * Custom path (only if you need custom email content/tracking):
 *   - next-web/supabase/functions/resend-verification   — Supabase edge function
 *   - next-web/lib/email/send-verification.ts           — app-side helper
 *   - next-web/lib/email/provider.ts                    — Resend provider contract
 *
 * The custom function is scaffolded but not deployed yet. Until it is deployed,
 * the client fallback in this page (supabase.auth.signUp) is still used as a
 * resend shortcut.
 */



import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, RefreshCw } from 'lucide-react'

export default function VerifyPage() {
  const [email, setEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get email from URL params
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email') || ''
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [])

  useEffect(() => {
    // Check if there's a confirmation token in the URL hash
    const checkConfirmation = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token') && hash.includes('refresh_token')) {
        // Tokens are available, session is set automatically by Supabase
        setMessage('Email verified successfully!')
        setTimeout(() => {
          router.push('/protected')
        }, 2000)
      }
    }

    checkConfirmation()
  }, [])

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setResendLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error: resendError } = await supabase.functions.invoke('resend-verification', {
        body: { email },
      })

      if (resendError) {
        throw resendError
      }

      setMessage('Verification email resent! Please check your inbox.')
    } catch (err) {
      // Fallback: Use auth.signUp to resend confirmation
      try {
        const { error: signUpError } = await supabase.auth.signUp({ email, password: 'resend' })
        if (signUpError) throw signUpError
        setMessage('Verification email resent! Please check your inbox.')
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to resend verification email')
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ve sent a verification email to <strong>{email}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{message}</p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Resending...
              </>
            ) : (
              'Resend verification email'
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}