import { useState } from 'react'
import { useExchangeStore } from '../app/store/exchangeStore'
import { buildChartCandles, buildTicker } from '../features/market/kline'
import { KlineChart } from '../features/market/components/KlineChart'
import { OrderBookPanel } from '../features/market/components/OrderBookPanel'
import { TickerBar } from '../features/market/components/TickerBar'
import { TradesPanel } from '../features/market/components/TradesPanel'
import { OrderRecordsPanel } from '../features/orders/components/OrderRecordsPanel'
import { Button, Input, MobilePanelTabs, Panel, Select, SideTabs } from '../shared/components/ui'
import { SYMBOLS, SYMBOL_CONFIG, type OrderSide, type OrderType, type TradingSymbol } from '../shared/types'
import { formatNumber } from '../shared/utils/math'

function OrderForm() {
  const placeOrder = useExchangeStore((s) => s.placeOrder)
  const selectedSymbol = useExchangeStore((s) => s.selectedSymbol)
  const lastPrices = useExchangeStore((s) => s.lastPrices)
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const accounts = useExchangeStore((s) => s.accounts)

  const [side, setSide] = useState<OrderSide>('buy')
  const [type, setType] = useState<OrderType>('limit')
  const [price, setPrice] = useState('')
  const [quantity, setQty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lp = lastPrices[selectedSymbol] ?? 0
  const cfg = SYMBOL_CONFIG[selectedSymbol]
  const account = currentUserId ? accounts[currentUserId] : null
  const usdt = account?.balances.USDT?.available ?? 0
  const base = account?.balances[cfg.base]?.available ?? 0

  const notional = type === 'limit' && price && quantity
    ? Number(price) * Number(quantity)
    : lp * Number(quantity || 0)

  const handleSubmit = () => {
    setBusy(true)
    const result = placeOrder({
      side, type,
      price: type === 'limit' ? Number(price) : undefined,
      quantity: Number(quantity),
    })
    setError(result)
    setBusy(false)
    if (!result) { setQty(''); setError(null) }
  }

  return (
    <Panel>
      <SideTabs active={side} onChange={setSide} />
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-xs text-[#848e9c]">
          <span>可用</span>
          <span className="num text-[#eaecef]">
            {side === 'buy'
              ? `${formatNumber(usdt, 2)} USDT`
              : `${formatNumber(base, 8)} ${cfg.base}`}
          </span>
        </div>
        <Select
          value={type}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as OrderType)}
        >
          <option value="limit">限价</option>
          <option value="market">市价</option>
        </Select>
        {type === 'limit' && (
          <div className="relative">
            <Input
              type="number" min="0" step="0.01"
              value={price} placeholder={`价格 — ${formatNumber(lp, lp >= 100 ? 2 : 4)}`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">USDT</span>
          </div>
        )}
        <div className="relative">
          <Input
            type="number" min="0" step="0.0001"
            value={quantity} placeholder={`数量 ${cfg.base}`}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{cfg.base}</span>
        </div>
        {quantity && (
          <div className="flex justify-between text-xs text-[#848e9c]">
            <span>成交额</span>
            <span className="num text-[#eaecef]">{formatNumber(notional, 2)} USDT</span>
          </div>
        )}
        {error && <p className="text-xs text-[#f6465d]">{error}</p>}
        <Button
          type="button" variant={side === 'buy' ? 'buy' : 'sell'} size="lg"
          className="w-full" disabled={busy}
          onClick={handleSubmit}
        >
          {side === 'buy' ? `买入 ${cfg.base}` : `卖出 ${cfg.base}`}
        </Button>
      </div>
    </Panel>
  )
}

const MOBILE_TABS = [
  { id: 'chart', label: '图表' },
  { id: 'book', label: '盘口' },
  { id: 'trade', label: '交易' },
  { id: 'orders', label: '委托' },
]

export function TradePage() {
  const setSelectedSymbol = useExchangeStore((s) => s.setSelectedSymbol)
  const setKlineInterval = useExchangeStore((s) => s.setKlineInterval)
  const cancelOrder = useExchangeStore((s) => s.cancelOrder)
  const selectedSymbol = useExchangeStore((s) => s.selectedSymbol)
  const klineInterval = useExchangeStore((s) => s.klineInterval)
  const lastPrices = useExchangeStore((s) => s.lastPrices)
  const allOrders = useExchangeStore((s) => s.orders)
  const allTrades = useExchangeStore((s) => s.trades)
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const engine = useExchangeStore((s) => s.engine)

  const [mobileTab, setMobileTab] = useState('chart')

  const lp = lastPrices[selectedSymbol] ?? SYMBOL_CONFIG[selectedSymbol].seedPrice
  const symbolTrades = allTrades.filter((t) => t.symbol === selectedSymbol)
  const userOrders = allOrders.filter((o) => o.userId === currentUserId)
  const openOrders = userOrders.filter(
    (o) => o.symbol === selectedSymbol && (o.status === 'open' || o.status === 'partial'),
  )
  const orderBook = engine.snapshot(selectedSymbol, 12)
  const candles = buildChartCandles(selectedSymbol, allTrades, klineInterval, lp)
  const userTrades = allTrades.filter(
    (t) => t.buyUserId === currentUserId || t.sellUserId === currentUserId,
  )

  const tickers = Object.fromEntries(
    SYMBOLS.map((sym) => [
      sym,
      buildTicker(allTrades.filter((t) => t.symbol === sym), lastPrices[sym] ?? SYMBOL_CONFIG[sym].seedPrice),
    ]),
  )

  const orderRecords = (
    <OrderRecordsPanel
      symbol={selectedSymbol}
      openOrders={openOrders}
      historyOrders={userOrders}
      trades={userTrades}
      currentUserId={currentUserId}
      onCancel={cancelOrder}
    />
  )

  return (
    <div className="app-page-h flex flex-col overflow-hidden">
      <TickerBar
        selectedSymbol={selectedSymbol}
        lastPrices={lastPrices}
        tickers={tickers}
        onSelectSymbol={(s: TradingSymbol) => setSelectedSymbol(s)}
      />

      {/* Mobile layout */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <MobilePanelTabs tabs={MOBILE_TABS} active={mobileTab} onChange={setMobileTab} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobileTab === 'chart' && (
            <KlineChart
              candles={candles}
              interval={klineInterval}
              onIntervalChange={setKlineInterval}
              className="h-full"
            />
          )}
          {mobileTab === 'book' && (
            <div className="flex h-full flex-col overflow-y-auto">
              <Panel className="rounded-none border-0 border-b p-0!" noPadding>
                <OrderBookPanel bids={orderBook.bids} asks={orderBook.asks} lastPrice={lp} />
              </Panel>
              <Panel className="rounded-none border-0" noPadding>
                <TradesPanel trades={symbolTrades} />
              </Panel>
            </div>
          )}
          {mobileTab === 'trade' && (
            <div className="h-full overflow-y-auto p-3">
              <OrderForm />
            </div>
          )}
          {mobileTab === 'orders' && orderRecords}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="flex min-w-0 flex-1 flex-col border-r border-[#2b3139]">
          <div className="min-h-0 flex-[3] border-b border-[#2b3139]">
            <KlineChart
              candles={candles}
              interval={klineInterval}
              onIntervalChange={setKlineInterval}
            />
          </div>
          <div className="min-h-0 flex-1">
            {orderRecords}
          </div>
        </div>

        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-[#2b3139]">
          <Panel className="rounded-none border-0 border-b p-0!" noPadding>
            <OrderBookPanel bids={orderBook.bids} asks={orderBook.asks} lastPrice={lp} />
          </Panel>
          <div className="border-b border-[#2b3139] p-3">
            <OrderForm />
          </div>
          <Panel className="rounded-none border-0" noPadding>
            <TradesPanel trades={symbolTrades} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
