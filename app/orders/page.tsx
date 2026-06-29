import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { rupees } from '@/lib/format'
import type { Order, OrderStatus } from '@/types/db'

const STATUS_CHIP: Record<OrderStatus, { label: string; cls: string }> = {
  PLACED:    { label: 'Placed',     cls: 'bg-blue-100 text-blue-700'   },
  PREPARING: { label: 'Preparing',  cls: 'bg-amber-100 text-amber-700' },
  READY:     { label: 'Ready',      cls: 'bg-green-100 text-green-700' },
  COLLECTED: { label: 'Collected',  cls: 'bg-gray-100 text-gray-500'   },
  CANCELLED: { label: 'Cancelled',  cls: 'bg-red-100 text-red-500'     },
}

export default async function OrdersPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('placed_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500 bg-red-50 rounded-xl mx-4 mt-4 border border-red-100">
        Failed to load orders. Please refresh.
      </div>
    )
  }

  const orders = (data ?? []) as Order[]

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Order history</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-2 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-1">
            <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">No orders yet</p>
          <p className="text-sm text-gray-400">Your order history will show up here.</p>
          <Link
            href="/"
            className="mt-2 bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
          >
            Browse menu
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const chip = STATUS_CHIP[order.status] ?? {
              label: order.status,
              cls: 'bg-gray-100 text-gray-600',
            }
            const date = new Date(order.placed_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            return (
              <Link
                key={order.id}
                href={`/order/${order.id}`}
                className="block bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-800 text-sm">
                    #{order.order_no}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${chip.cls}`}>
                    {chip.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{date}</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {rupees(order.total_paise)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
