import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { AssetsPage } from '../pages/AssetsPage'
import { FuturesPage } from '../pages/FuturesPage'
import { LoginPage } from '../pages/LoginPage'
import { OrdersPage } from '../pages/OrdersPage'
import { RegisterPage } from '../pages/RegisterPage'
import { TradePage } from '../pages/TradePage'
import { useExchangeStore } from './store/exchangeStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUserId = useExchangeStore((state) => state.currentUserId)
  if (!currentUserId) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/trade" replace />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/futures" element={<FuturesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/trade" replace />} />
    </Routes>
  )
}
