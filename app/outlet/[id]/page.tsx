import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuClient from './MenuClient'
import type { Outlet, MenuItem } from '@/types/db'

export default async function OutletPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const [{ data: outlet, error: outletErr }, { data: items, error: itemsErr }] = await Promise.all([
    supabase
      .from('outlets')
      .select('*')
      .eq('id', params.id)
      .single<Outlet>(),
    supabase
      .from('menu_items')
      .select('*')
      .eq('outlet_id', params.id)
      .eq('is_available', true)
      .order('sort'),
  ])

  if (outletErr && !outlet) notFound()

  if (outletErr || itemsErr) {
    return (
      <div className="p-6 text-sm text-red-500 bg-red-50 rounded-xl mx-4 mt-4 border border-red-100">
        Failed to load menu. Please go back and try again.
      </div>
    )
  }

  return <MenuClient outlet={outlet!} items={(items ?? []) as MenuItem[]} />
}
