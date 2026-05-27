import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/router'
import { useExchangeStore } from './app/store/exchangeStore'
import './index.css'

function Bootstrap() {
  const start = useExchangeStore((s) => s.startMarketSimulation)
  const stop  = useExchangeStore((s) => s.stopMarketSimulation)
  useEffect(() => { start(); return () => stop() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <AppRouter />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Bootstrap />
    </BrowserRouter>
  </StrictMode>,
)
