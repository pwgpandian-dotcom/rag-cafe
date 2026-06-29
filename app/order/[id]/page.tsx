'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { rupees } from '@/lib/format'
import type { Order, OrderStatus } from '@/types/db'

const STATUS_CHIP: Record<OrderStatus, { label: string; cls: string }> = {
  PLACED:    { label: 'Order placed',  cls: 'bg-blue-100 text-blue-700'   },
  PREPARING: { label: 'Preparing…',    cls: 'bg-amber-100 text-amber-700' },
  READY:     { label: 'Ready! 🎉',     cls: 'bg-green-100 text-green-700' },
  COLLECTED: { label: 'Collected',     cls: 'bg-gray-100 text-gray-500'   },
  CANCELLED: { label: 'Cancelled',     cls: 'bg-red-100 text-red-500'     },
}

export default function OrderSuccessPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: qErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id)
        .single<Order>()
      if (qErr) {
        setError('Failed to load order. Please refresh.')
        setLoading(false)
        return
      }
      setOrder(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="px-4 py-8 flex flex-col items-center animate-pulse">
        <div className="w-20 h-20 rounded-full bg-gray-100 mb-4" />
        <div className="h-7 w-36 bg-gray-100 rounded-lg mb-2" />
        <div className="h-4 w-24 bg-gray-100 rounded mb-1" />
        <div className="h-4 w-20 bg-gray-100 rounded mb-5" />
        <div className="h-6 w-28 bg-gray-100 rounded-full mb-7" />
        <div className="w-full max-w-xs bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="h-3 w-24 bg-gray-100 rounded mx-auto mb-4" />
          <div className="h-16 w-32 bg-gray-100 rounded mx-auto mb-6" />
          <div className="w-40 h-40 bg-gray-100 rounded-lg mx-auto" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 px-4">
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100 text-center">
          {error}
        </p>
        <Link href="/" className="text-brand text-sm font-semibold hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <p className="text-gray-400 text-sm">Order not found.</p>
        <Link href="/" className="text-brand text-sm font-semibold hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  const chip = STATUS_CHIP[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="px-4 py-8 flex flex-col items-center">
      {/* Success check */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 shadow-sm">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Order placed!</h1>
      <p className="text-sm text-gray-400 mb-0.5">Order #{order.order_no}</p>
      <p className="text-sm font-semibold text-gray-700 mb-5">{rupees(order.total_paise)}</p>

      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full mb-7 ${chip.cls}`}>
        {chip.label}
      </span>

      {/* Pickup card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full max-w-xs text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Show at counter
        </p>
        <p className="font-display text-7xl font-black text-brand tracking-widest mb-6">
          {order.token}
        </p>
        <div className="flex justify-center">
          <QRCodeSVG
            value={order.token}
            size={160}
            bgColor="#ffffff"
            fgColor="#015F2A"
            level="M"
            style={{ borderRadius: 8 }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-4">
          Scan or show token to collect your order
        </p>
      </div>

      <div className="mt-8 flex gap-5">
        <button
          onClick={() => router.push('/orders')}
          className="text-sm text-gray-400 hover:underline"
        >
          View history
        </button>
        <Link href="/" className="text-sm text-brand font-semibold hover:underline">
          Order more
        </Link>
      </div>
    </div>
  )
}
