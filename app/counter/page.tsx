import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CounterBoard from './CounterBoard'

export default async function CounterPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role: string } | null)?.role ?? 'EMPLOYEE'
  if (role !== 'COUNTER' && role !== 'ADMIN') {
    redirect('/')
  }

  return <CounterBoard />
}
