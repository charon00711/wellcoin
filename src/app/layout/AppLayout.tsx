import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useExchangeStore } from '../store/exchangeStore'
import { APP_NAME } from '../../shared/constants/brand'

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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-12 items-center gap-6 border-b border-[#2b3139] bg-[#161a1e] px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/favicon.svg" alt={APP_NAME} className="h-6 w-6 rounded" />
          <span className="text-sm font-bold tracking-wide text-[#eaecef]">{APP_NAME}</span>
        </div>
        {/* Nav */}
        <nav className="flex items-center gap-1">
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
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-[#848e9c]">{user.email}</span>
              <button
                className="rounded border border-[#2b3139] px-3 py-1 text-xs text-[#848e9c] hover:border-[#f0b90b] hover:text-[#f0b90b] transition"
                onClick={() => { logout(); navigate('/login') }}
              >
                退出
              </button>
            </>
          ) : (
            <button
              className="rounded bg-[#f0b90b] px-3 py-1 text-xs font-semibold text-black"
              onClick={() => navigate('/login')}
            >
              登录
            </button>
          )}
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
