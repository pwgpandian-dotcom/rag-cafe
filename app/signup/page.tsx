'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type FormState = {
  fullName: string
  email: string
  password: string
  employerCode: string
  empCode: string
}

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    fullName: '', email: '', password: '', employerCode: '', empCode: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Check your email to confirm your account, then sign in.')
      setLoading(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('register_employee', {
      p_employer_code: form.employerCode.trim().toUpperCase(),
      p_emp_code:      form.empCode.trim(),
      p_full_name:     form.fullName.trim(),
    })

    if (rpcError) {
      // Roll back the auth session so the user can try again cleanly.
      await supabase.auth.signOut()
      setError(rpcError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent focus:bg-white transition-colors'

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gray-50 py-10">
      <div className="mb-6 text-center">
        <p className="text-[10px] font-semibold text-gray-400 tracking-[0.3em] uppercase mb-2">Authentic Cuisine Rooted</p>
        <span className="text-4xl font-black text-brand tracking-[0.1em]">RAGCAFE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-5">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              {error}
            </p>
          )}

          {[
            { key: 'fullName',     label: 'Full name',      type: 'text',     hint: '' },
            { key: 'email',        label: 'Email',           type: 'email',    hint: '' },
            { key: 'password',     label: 'Password',        type: 'password', hint: 'At least 6 characters' },
            { key: 'employerCode', label: 'Employer code',   type: 'text',     hint: 'Given by your company, e.g. JOSA2026' },
            { key: 'empCode',      label: 'Employee ID',     type: 'text',     hint: 'Your company staff ID' },
          ].map(({ key, label, type, hint }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                {label}
              </label>
              <input
                type={type}
                required
                minLength={key === 'password' ? 6 : undefined}
                autoComplete={
                  key === 'email' ? 'email' :
                  key === 'password' ? 'new-password' : 'off'
                }
                value={form[key as keyof FormState]}
                onChange={field(key as keyof FormState)}
                className={`${inputCls}${key === 'employerCode' ? ' uppercase' : ''}`}
              />
              {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors mt-1"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
