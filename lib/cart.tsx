'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'

export type CartItem = {
  menu_item_id: string
  outlet_id: string
  name: string
  price_paise: number
  qty: number
}

type CartCtx = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>) => void
  setQty: (menu_item_id: string, qty: number) => void
  clear: () => void
  totalPaise: number
  totalQty: number
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ragcafe_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem('ragcafe_cart', JSON.stringify(items))
  }, [items, hydrated])

  const add = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.menu_item_id === item.menu_item_id)
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === item.menu_item_id ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])

  const setQty = useCallback((menu_item_id: string, qty: number) => {
    setItems(prev =>
      qty <= 0
        ? prev.filter(i => i.menu_item_id !== menu_item_id)
        : prev.map(i =>
            i.menu_item_id === menu_item_id ? { ...i, qty } : i
          )
    )
  }, [])

  const clear = useCallback(() => {
    setItems([])
    try { localStorage.removeItem('ragcafe_cart') } catch {}
  }, [])

  const totalPaise = items.reduce((sum, i) => sum + i.price_paise * i.qty, 0)
  const totalQty   = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, add, setQty, clear, totalPaise, totalQty }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
