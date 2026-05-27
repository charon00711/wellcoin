import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useExchangeStore } from '../store/exchangeStore'
import { APP_NAME } from '../../shared/constants/brand'
import { BrandLogo } from '../../shared/components/BrandLogo'

const links = [
  { to: '/trade',   label: '现货' },
  { to: '/futures', label: '合约' },
  { to: '/assets',  label: '资产' },
  { to: '/orders',  label: '订单' },
]

export function AppLayout() {
  const navigate      = useNavigate()
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const users         = useExchangeStore((s) => s.users)
  const logout        = useExchangeStore((s) => s.logout)
  const user          = users.find((u) => u.id === currentUserId) ?? null

  return (
    <div className="flex min-h-screen min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-4 border-b border-[#2b3139] bg-[#161a1e] px-4 lg:gap-6">
        <div className="flex shrink-0 items-center gap-2">
          <BrandLogo size="sm" />
          <span className="text-sm font-bold tracking-wide text-[#eaecef]">{APP_NAME}</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'text-[#f0b90b] font-medium'
                    : 'text-[#848e9c] hover:text-[#eaecef]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          {user ? (
            <>
              <span className="hidden max-w-[8rem] truncate text-xs text-[#848e9c] sm:inline">
                {user.email}
              </span>
              <button
                className="rounded border border-[#2b3139] px-2.5 py-1 text-xs text-[#848e9c] transition hover:border-[#f0b90b] hover:text-[#f0b90b] lg:px-3"
                onClick={() => { logout(); navigate('/login') }}
              >
                退出
              </button>
            </>
          ) : (
            <button
              className="rounded bg-[#f0b90b] px-2.5 py-1 text-xs font-semibold text-black lg:px-3"
              onClick={() => navigate('/login')}
            >
              登录
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-[calc(var(--app-bottom-nav-h)+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[#2b3139] bg-[#161a1e] safe-bottom lg:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-2 text-[10px] transition ${
                isActive ? 'text-[#f0b90b]' : 'text-[#848e9c]'
              }`
            }
          >
            <span className="text-xs font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
