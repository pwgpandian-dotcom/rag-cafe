import LogoutButton from './LogoutButton'

interface Props {
  userName: string | null
}

export default function CounterHeader({ userName }: Props) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm">
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[13px] font-black text-brand tracking-[0.15em]">RAGCAFE</span>
        <span className="text-[8px] font-medium text-gray-400 tracking-wider">Authentic Cuisine Rooted</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-brand text-white px-2 py-0.5 rounded-full">
            Counter
          </span>
          {userName && (
            <span className="text-xs text-gray-500">{userName}</span>
          )}
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
