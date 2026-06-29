import type { Metadata } from 'next'
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import CounterHeader from '@/components/CounterHeader'
import { CartProvider } from '@/lib/cart'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '700', '900'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
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
