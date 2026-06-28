'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rupees } from '@/lib/format'
import type { OrderStatus } from '@/types/db'

const STATUS_LABELS: Record<string, string> = {
  ALL:       'All statuses',
  PLACED:    'Placed',
  PREPARING: 'Preparing',
  READY:     'Ready',
  COLLECTED: 'Collected',
  CANCELLED: 'Cancelled',
}

const STATUS_CHIP: Record<string, string> = {
  PLACED:    'bg-blue-100 text-blue-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY:     'bg-green-100 text-green-700',
  COLLECTED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-500',
}

type AdminOrder = {
  id: string
  order_no: number
  token: string
  status: OrderStatus
  total_paise: number
  placed_at: string
  profiles: { full_name: string | null } | null
  employers: { name: string } | null
  order_items: { qty: number }[]
}

type BillingRow = {
  employer_name: string
  order_count: number
  total_paise: number
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return {
    p_from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
    p_to:   new Date(y, m,     1).toISOString().slice(0, 10),
  }
}

export default function AdminClient() {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab]                   = useState<'orders' | 'billing'>('orders')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [orders, setOrders]             = useState<AdminOrder[]>([])
  const [billing, setBilling]           = useState<BillingRow[]>([])
  const [ordersLoading, setOrdersLoading]   = useState(true)
  const [billingLoading, setBillingLoading] = useState(false)
  const [ordersError, setOrdersError]   = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setOrdersLoading(true)
      setOrdersError(null)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_no, token, status, total_paise, placed_at,
          profiles ( full_name ),
          employers ( name ),
          order_items ( qty )
        `)
        .order('placed_at', { ascending: false })
      if (active) {
        if (error) {
          setOrdersError('Failed to load orders. Please refresh.')
        } else {
          setOrders((data ?? []) as unknown as AdminOrder[])
        }
        setOrdersLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [supabase])

  useEffect(() => {
    if (tab !== 'billing') return
    let active = true
    async function load() {
      setBillingLoading(true)
      setBillingError(null)
      const { p_from, p_to } = monthRange(selectedMonth)
      const { data, error } = await supabase.rpc('employer_billing', { p_from, p_to })
      if (active) {
        if (error) {
          setBillingError('Failed to load billing data. Please try again.')
        } else {
          setBilling((data ?? []) as BillingRow[])
        }
        setBillingLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [tab, selectedMonth, supabase])

  const displayed = statusFilter === 'ALL'
    ? orders
    : orders.filter(o => o.status === (statusFilter as OrderStatus))

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
        <span className="text-[11px] font-semibold bg-brand text-white px-2 py-0.5 rounded-full">
          Admin
        </span>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['orders', 'billing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'orders' ? 'All Orders' : 'Month-end Billing'}
          </button>
        ))}
      </div>

      {/* ── All Orders ── */}
      {tab === 'orders' && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs text-gray-500 font-medium">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {!ordersLoading && (
              <span className="text-xs text-gray-400 ml-1">{displayed.length} orders</span>
            )}
          </div>

          {ordersLoading ? (
            <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>
          ) : ordersError ? (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              {ordersError}
            </p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No orders found.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Order', 'Token', 'Employer', 'Employee', 'Items', 'Total', 'Status', 'Placed'].map(h => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map(order => {
                    const itemCount = order.order_items.reduce((s, i) => s + i.qty, 0)
                    const chip = STATUS_CHIP[order.status] ?? 'bg-gray-100 text-gray-600'
                    const date = new Date(order.placed_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">#{order.order_no}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.token}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.employers?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.profiles?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-center">{itemCount}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{rupees(order.total_paise)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${chip}`}>
                            {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Month-end Billing ── */}
      {tab === 'billing' && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs text-gray-500 font-medium">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {billingLoading ? (
            <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>
          ) : billingError ? (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              {billingError}
            </p>
          ) : billing.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No billing data for this period.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Employer', 'Orders', 'Total Owed'].map(h => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {billing.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.employer_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.order_count}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{rupees(row.total_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {billing.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center bg-gray-50/50 rounded-b-xl">
                  <span className="text-xs text-gray-500 font-semibold">
                    {billing.reduce((s, r) => s + r.order_count, 0)} orders across {billing.length} employer{billing.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {rupees(billing.reduce((s, r) => s + r.total_paise, 0))}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
