import { rupees } from '@/lib/format'
import LogoutButton from './LogoutButton'

interface Props {
  balance: number
  userName: string | null
}

export default function AppHeader({ balance, userName }: Props) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm">
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[13px] font-black text-brand tracking-[0.15em]">RAGCAFE</span>
        <span className="text-[8px] font-medium text-gray-400 tracking-wider">Authentic Cuisine Rooted</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          {userName && (
            <span className="text-[11px] text-gray-400 leading-none mb-0.5">{userName}</span>
          )}
          <span className="text-sm font-semibold text-gray-800">{rupees(balance)} credit</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
