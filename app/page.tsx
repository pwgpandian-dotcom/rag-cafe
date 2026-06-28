import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Outlet, OutletKind } from '@/types/db'

const KIND_LABEL: Record<OutletKind, string> = {
  FOOD:   'Food',
  JUICE:  'Juice',
  COFFEE: 'Coffee',
  OTHER:  'Other',
}

const KIND_EMOJI: Record<OutletKind, string> = {
  FOOD:   '🍱',
  JUICE:  '🥤',
  COFFEE: '☕',
  OTHER:  '🍽️',
}

const KIND_ORDER: OutletKind[] = ['FOOD', 'JUICE', 'COFFEE', 'OTHER']

export default async function HomePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = (profile as { role: string } | null)?.role
    if (role === 'COUNTER') redirect('/counter')
    if (role === 'ADMIN')   redirect('/admin')
  }

  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('sort')

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500 bg-red-50 rounded-xl mx-4 mt-4">
        Failed to load cafeteria. Please refresh.
      </div>
    )
  }

  const outlets = (data ?? []) as Outlet[]

  // Group by kind
  const groups = outlets.reduce<Partial<Record<OutletKind, Outlet[]>>>((acc, o) => {
    const k = o.kind
    ;(acc[k] ??= []).push(o)
    return acc
  }, {})

  const presentKinds = KIND_ORDER.filter(k => (groups[k]?.length ?? 0) > 0)

  if (presentKinds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="text-gray-400 text-sm">No outlets available right now.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">My Cafeteria</h1>
      <div className="space-y-6">
        {presentKinds.map(kind => (
          <section key={kind}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {KIND_EMOJI[kind]}&nbsp;&nbsp;{KIND_LABEL[kind]}
            </h2>
            <div className="space-y-2">
              {groups[kind]!.map(outlet => (
                <Link
                  key={outlet.id}
                  href={`/outlet/${outlet.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 text-sm">{outlet.name}</span>
                  <svg className="w-4 h-4 text-gray-300 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
