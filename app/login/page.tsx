'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent focus:bg-white transition-colors'

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gray-50">
      <div className="mb-8 text-center">
        <p className="text-[10px] font-semibold text-gray-400 tracking-[0.3em] uppercase mb-2">Authentic Cuisine Rooted</p>
        <span className="text-4xl font-black text-brand tracking-[0.1em]">RAGCAFE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-5">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors mt-1"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          New here?{' '}
          <Link href="/signup" className="text-brand font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
