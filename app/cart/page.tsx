'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { rupees } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'

export default function CartPage() {
  const router = useRouter()
  const { items, setQty, clear, totalPaise } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function placeOrder() {
    if (items.length === 0) return
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_items: items.map(i => ({
        menu_item_id: i.menu_item_id,
        qty: i.qty,
      })),
    })

    if (rpcError) {
      setError(
        rpcError.message.includes('Insufficient credit')
          ? 'Not enough credit balance. Reduce your order or contact your HR.'
          : rpcError.message
      )
      setLoading(false)
      return
    }

    // place_order returns a single-row table; Supabase gives us an array.
    const row = Array.isArray(data) ? data[0] : data
    clear()
    router.push(`/order/${row.order_id}`)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 px-4">
        <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <p className="text-gray-400 text-sm">Your cart is empty.</p>
        <button
          onClick={() => router.push('/')}
          className="text-brand text-sm font-semibold hover:underline"
        >
          Browse cafeteria
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 mb-5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-xl font-semibold text-gray-900 mb-5">Your order</h1>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-5">
        {items.map(item => (
          <div
            key={item.menu_item_id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800 text-sm flex-1 min-w-0 truncate">
                {item.name}
              </span>
              <span className="text-sm font-semibold text-gray-700 flex-none">
                {rupees(item.price_paise * item.qty)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-xs text-gray-400">{rupees(item.price_paise)} each</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(item.menu_item_id, item.qty - 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200 leading-none"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold text-gray-800">
                  {item.qty}
                </span>
                <button
                  onClick={() => setQty(item.menu_item_id, item.qty + 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200 leading-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order total */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Total</span>
        <span className="text-xl font-bold text-gray-900">{rupees(totalPaise)}</span>
      </div>

      <p className="text-[11px] text-gray-400 text-center mb-4">
        Charged to your employer credit. No cash needed.
      </p>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white rounded-2xl py-4 font-semibold text-sm transition-colors shadow-md"
      >
        {loading ? 'Placing order…' : `Place order · ${rupees(totalPaise)}`}
      </button>
    </div>
  )
}
