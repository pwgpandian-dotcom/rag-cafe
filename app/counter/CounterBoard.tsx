'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rupees } from '@/lib/format'
import type { OrderStatus, OrderWithItems } from '@/types/db'

type Filter = 'ALL' | 'PLACED' | 'PREPARING' | 'READY'

const ACTIVE_STATUSES: OrderStatus[] = ['PLACED', 'PREPARING', 'READY']

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL',       label: 'All active' },
  { key: 'PLACED',    label: 'New'        },
  { key: 'PREPARING', label: 'Preparing'  },
  { key: 'READY',     label: 'Ready'      },
]

const CHIP: Record<OrderStatus, { label: string; cls: string }> = {
  PLACED:    { label: 'New',       cls: 'bg-blue-100 text-blue-700'   },
  PREPARING: { label: 'Preparing', cls: 'bg-amber-100 text-amber-700' },
  READY:     { label: 'Ready',     cls: 'bg-green-100 text-green-700' },
  COLLECTED: { label: 'Collected', cls: 'bg-gray-100 text-gray-500'   },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-500'     },
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function CounterBoard() {
  const [orders, setOrders]         = useState<OrderWithItems[]>([])
  const [filter, setFilter]         = useState<Filter>('ALL')
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState<string | null>(null)
  const [token, setToken]           = useState('')
  const [tokenErr, setTokenErr]     = useState('')
  const [busy, setBusy]             = useState<string | null>(null)
  const [advanceErr, setAdvanceErr] = useState<string | null>(null)
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(name_snapshot, qty, unit_price_paise)')
      .in('status', ACTIVE_STATUSES)
      .order('placed_at', { ascending: false })
    if (error) {
      setLoadError('Failed to load orders. Retrying…')
      setLoading(false)
      return
    }
    setLoadError(null)
    setOrders((data as OrderWithItems[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  async function advance(orderId: string, to: OrderStatus) {
    setBusy(orderId + to)
    setAdvanceErr(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('mark_order_status', {
      p_order_id: orderId,
      p_to: to,
    })
    if (error) setAdvanceErr(`Could not update order: ${error.message}`)
    await load()
    setBusy(null)
  }

  async function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTokenErr('')
    const t = token.trim()
    if (!t) return
    const match = orders.find(o => o.token === t)
    if (!match) {
      setTokenErr(`Token "${t}" not found in active orders`)
      return
    }
    await advance(match.id, 'COLLECTED')
    setToken('')
  }

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  const countOf = (s: Filter) =>
    s === 'ALL' ? orders.length : orders.filter(o => o.status === s).length

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Orders board</h1>

      {/* Token collect */}
      <form onSubmit={handleTokenSubmit} className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Scan or type token number…"
          value={token}
          onChange={e => { setToken(e.target.value); setTokenErr('') }}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!token.trim() || !!busy}
          className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          Collect
        </button>
      </form>
      {tokenErr && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100 mb-4">
          {tokenErr}
        </p>
      )}
      {advanceErr && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100 mb-4">
          {advanceErr}
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mt-5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === key
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              filter === key ? 'bg-brand-700 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {countOf(key)}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-2">
          {loadError}
        </p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-gray-400 text-sm">No active orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(order => {
            const chip = CHIP[order.status]
            const isBusy = (to: OrderStatus) => busy === order.id + to
            const anyBusy = !!busy

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div>
                    <span className="font-bold text-gray-900">#{order.order_no}</span>
                    <span className="ml-2 text-xs font-mono text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                      {order.token}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400">{timeAgo(order.placed_at)}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <ul className="space-y-0.5 mb-3">
                  {order.order_items.map((item, i) => (
                    <li key={i} className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">{item.qty}×</span>
                        {' '}
                        {item.name_snapshot}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {rupees(item.unit_price_paise * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Total */}
                <div className="flex justify-end mb-3 pt-2 border-t border-gray-50">
                  <span className="text-sm font-bold text-gray-900">{rupees(order.total_paise)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {order.status === 'PLACED' && (
                    <button
                      onClick={() => advance(order.id, 'PREPARING')}
                      disabled={anyBusy}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                    >
                      {isBusy('PREPARING') ? '…' : 'Accept'}
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => advance(order.id, 'READY')}
                      disabled={anyBusy}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                    >
                      {isBusy('READY') ? '…' : 'Mark Ready'}
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button
                      onClick={() => advance(order.id, 'COLLECTED')}
                      disabled={anyBusy}
                      className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                    >
                      {isBusy('COLLECTED') ? '…' : 'Collected'}
                    </button>
                  )}
                  <button
                    onClick={() => advance(order.id, 'CANCELLED')}
                    disabled={anyBusy}
                    className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 active:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {isBusy('CANCELLED') ? '…' : 'Cancel'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
