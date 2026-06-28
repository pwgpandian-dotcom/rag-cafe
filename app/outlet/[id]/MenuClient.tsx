'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { rupees } from '@/lib/format'
import type { Outlet, MenuItem, VegType } from '@/types/db'

// FSSAI-style veg/nonveg indicator dot colours
const DOT_BG: Record<VegType, string> = {
  VEG:    'bg-green-500',
  NONVEG: 'bg-red-500',
  EGG:    'bg-yellow-400',
}
const DOT_BORDER: Record<VegType, string> = {
  VEG:    'border-green-600',
  NONVEG: 'border-red-600',
  EGG:    'border-yellow-500',
}

interface Props {
  outlet: Outlet
  items: MenuItem[]
}

export default function MenuClient({ outlet, items }: Props) {
  const router = useRouter()
  const { items: cartItems, add, setQty, totalQty, totalPaise } = useCart()

  function cartQty(id: string) {
    return cartItems.find(i => i.menu_item_id === id)?.qty ?? 0
  }

  return (
    <div className="px-4 py-5 pb-36">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 mb-5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-xl font-semibold text-gray-900 mb-5">{outlet.name}</h1>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm mt-12">
          Nothing available right now.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const qty = cartQty(item.id)
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
              >
                {/* FSSAI veg dot */}
                <span
                  className={`flex-none w-[18px] h-[18px] rounded-[3px] border-2 ${DOT_BORDER[item.veg]} flex items-center justify-center`}
                >
                  <span className={`w-2 h-2 rounded-full ${DOT_BG[item.veg]}`} />
                </span>

                {/* Name / description / price */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm leading-snug">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {rupees(item.price_paise)}
                  </p>
                </div>

                {/* Add / stepper */}
                {qty === 0 ? (
                  <button
                    onClick={() =>
                      add({
                        menu_item_id: item.id,
                        outlet_id: item.outlet_id,
                        name: item.name,
                        price_paise: item.price_paise,
                      })
                    }
                    className="flex-none bg-gold hover:bg-gold-600 active:bg-gold-600 text-brand rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors"
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex-none flex items-center gap-2">
                    <button
                      onClick={() => setQty(item.id, qty - 1)}
                      className="w-7 h-7 rounded-full bg-gold-50 text-brand font-bold text-lg flex items-center justify-center hover:bg-gold-50 leading-none"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-gray-800">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(item.id, qty + 1)}
                      className="w-7 h-7 rounded-full bg-gold-50 text-brand font-bold text-lg flex items-center justify-center hover:bg-gold-50 leading-none"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky "View Cart" bar — sits just above the bottom nav */}
      {totalQty > 0 && (
        <div className="fixed bottom-16 inset-x-0 px-4 pb-2 pointer-events-none">
          <button
            onClick={() => router.push('/cart')}
            className="pointer-events-auto w-full bg-brand hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-between px-4 shadow-xl transition-colors"
          >
            <span className="bg-white/20 rounded-lg px-2 py-0.5 text-xs font-bold">
              {totalQty} item{totalQty > 1 ? 's' : ''}
            </span>
            <span>View Cart</span>
            <span className="font-bold">{rupees(totalPaise)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
