import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import CounterHeader from '@/components/CounterHeader'

export const metadata: Metadata = {
  title: 'RagCafe',
  description: 'Your cafeteria, credit-powered.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let balance = 0
  let userName: string | null = null
  let isCounter = false

  if (user) {
    const profileRes = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    const profileData = profileRes.data as { full_name: string | null; role: string } | null
    userName = profileData?.full_name ?? null
    const role = profileData?.role ?? 'EMPLOYEE'
    isCounter = role === 'COUNTER' || role === 'ADMIN'

    if (!isCounter) {
      const walletRes = await supabase.from('wallets').select('balance_paise').single()
      balance = (walletRes.data as { balance_paise: number } | null)?.balance_paise ?? 0
    }
  }

  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased">
        <CartProvider>
          {user && !isCounter && <AppHeader balance={balance} userName={userName} />}
          {user && isCounter && <CounterHeader userName={userName} />}
          <main className={
            !user ? 'min-h-screen' :
            isCounter ? 'pt-14 min-h-screen' :
            'pt-14 pb-16 min-h-screen'
          }>
            {children}
          </main>
          {user && !isCounter && <BottomNav />}
        </CartProvider>
      </body>
    </html>
  )
}
