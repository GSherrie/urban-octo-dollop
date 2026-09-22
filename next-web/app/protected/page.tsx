'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, TrendingUp, CreditCard } from 'lucide-react'

export default function ProtectedPage() {
  const [user, setUser] = useState<{ id?: string; email?: string | null; email_confirmed_at?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <div className="mt-4 space-y-2">
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">User ID:</span> {user?.id}</p>
              <p><span className="font-medium">Email Confirmed:</span> {user?.email_confirmed_at ? 'Yes' : 'No'}</p>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
            <p className="text-gray-600 mb-4">
              Your SherPay account is ready. Start by adding expenses and income to track your finances.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-not-foreground">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium">Dashboard</span>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-not-allowed">
                <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium">Expenses</span>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-not-allowed">
                <User className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}