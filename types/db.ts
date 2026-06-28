export type UserRole    = 'EMPLOYEE' | 'COUNTER' | 'ADMIN'
export type OutletKind  = 'FOOD' | 'JUICE' | 'COFFEE' | 'OTHER'
export type VegType     = 'VEG' | 'NONVEG' | 'EGG'
export type OrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'CANCELLED'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  employer_id: string | null
  emp_code: string | null
  status: string
}

export interface Wallet {
  id: string
  profile_id: string
  employer_id: string
  balance_paise: number
  monthly_limit_paise: number
}

export interface Outlet {
  id: string
  employer_id: string
  name: string
  kind: OutletKind
  status: string
  sort: number
}

export interface MenuItem {
  id: string
  outlet_id: string
  employer_id: string
  name: string
  description: string | null
  veg: VegType
  price_paise: number
  image_url: string | null
  is_available: boolean
  sort: number
}

export interface Order {
  id: string
  employer_id: string
  profile_id: string
  order_no: number
  token: string
  status: OrderStatus
  subtotal_paise: number
  total_paise: number
  placed_at: string
  preparing_at: string | null
  ready_at: string | null
  collected_at: string | null
  cancelled_at: string | null
}

export interface OrderItem {
  name_snapshot: string
  qty: number
  unit_price_paise: number
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}
