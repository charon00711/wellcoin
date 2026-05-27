import { useState } from 'react'
import { useExchangeStore } from '../app/store/exchangeStore'
import { buildChartCandles, buildTicker } from '../features/market/kline'
import { KlineChart } from '../features/market/components/KlineChart'
import { OrderBookPanel } from '../features/market/components/OrderBookPanel'
import { TickerBar } from '../features/market/components/TickerBar'
import { OrderRecordsPanel } from '../features/orders/components/OrderRecordsPanel'
import {
  calcLiquidationPrice,
  calcInitialMargin,
  calcUnrealizedPnl,
  calcRoe,
  FUNDING_RATE,
  LEVERAGE_PRESETS,
} from '../features/futures/futuresEngine'
import { Badge, Button, DataRow, Divider, Input, Panel } from '../shared/components/ui'
import { SYMBOLS, SYMBOL_CONFIG, type FuturesSide, type TradingSymbol } from '../shared/types'
import { formatNumber } from '../shared/utils/math'

function FuturesOrderForm() {
  const selectedSymbol = useExchangeStore((s) => s.selectedSymbol)
  const lastPrices = useExchangeStore((s) => s.lastPrices)
  const accounts = useExchangeStore((s) => s.accounts)
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const futuresLeverage = useExchangeStore((s) => s.futuresLeverage)
  const openFuturesPosition = useExchangeStore((s) => s.openFuturesPosition)
  const setFuturesLeverage = useExchangeStore((s) => s.setFuturesLeverage)

  const [side, setSide] = useState<FuturesSide>('long')
  const [size, setSize] = useState('')
  const [error, setError] = useState<string | null>(null)

  const leverage = futuresLeverage[selectedSymbol] ?? 10
  const markPrice = lastPrices[selectedSymbol] ?? 0
  const cfg = SYMBOL_CONFIG[selectedSymbol]
  const account = currentUserId ? accounts[currentUserId] : null
  const usdt = account?.balances.USDT?.available ?? 0
  const sizeNum = Number(size || 0)
  const margin = sizeNum > 0 ? calcInitialMargin(sizeNum, markPrice, leverage) : 0
  const liqPrice = sizeNum > 0 ? calcLiquidationPrice(side, markPrice, leverage) : 0

  const handleOpen = () => {
    const result = openFuturesPosition({ side, size: sizeNum, leverage })
    setError(result)
    if (!result) { setSize(''); setError(null) }
  }

  return (
    <Panel>
      <div className="grid grid-cols-2 gap-1 rounded bg-[#1e2329] p-1">
        <button
          onClick={() => setSide('long')}
          className={`rounded py-2 text-sm font-medium transition ${side === 'long' ? 'bg-[#02c076] text-black' : 'text-[#848e9c] hover:text-[#02c076]'}`}
        >
          做多
        </button>
        <button
          onClick={() => setSide('short')}
          className={`rounded py-2 text-sm font-medium transition ${side === 'short' ? 'bg-[#f6465d] text-white' : 'text-[#848e9c] hover:text-[#f6465d]'}`}
        >
          做空
        </button>
      </div>

      <Divider />

      <p className="mb-2 text-xs text-[#848e9c]">杠杆倍数</p>
      <div className="flex flex-wrap gap-1">
        {LEVERAGE_PRESETS.map((lv) => (
          <button
            key={lv}
            onClick={() => setFuturesLeverage(selectedSymbol, lv)}
            className={`rounded border px-2 py-0.5 text-xs transition ${
              leverage === lv
                ? 'border-[#f0b90b] bg-[#f0b90b]/15 text-[#f0b90b]'
                : 'border-[#2b3139] text-[#848e9c] hover:border-[#848e9c]'
            }`}
          >
            {lv}x
          </button>
        ))}
      </div>

      <Divider />

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#848e9c]">
          <span>可用 USDT</span>
          <span className="num text-[#eaecef]">{formatNumber(usdt, 2)}</span>
        </div>
        <div className="relative">
          <Input
            type="number" min="0" step="0.001"
            value={size} placeholder={`数量 (${cfg.base})`}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSize(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{cfg.base}</span>
        </div>
        {sizeNum > 0 && (
          <div className="rounded bg-[#1e2329] p-2 space-y-1">
            <DataRow label="需要保证金" value={`${formatNumber(margin, 2)} USDT`} />
            <DataRow label="预计强平价" value={formatNumber(liqPrice, markPrice >= 100 ? 2 : 4)} tone={side === 'long' ? 'sell' : 'buy'} />
            <DataRow label="标记价格" value={formatNumber(markPrice, markPrice >= 100 ? 2 : 4)} />
          </div>
        )}
        {error && <p className="text-xs text-[#f6465d]">{error}</p>}
        <Button variant={side === 'long' ? 'buy' : 'sell'} size="lg" className="w-full" onClick={handleOpen}>
          {side === 'long' ? `开多 ${leverage}x` : `开空 ${leverage}x`}
        </Button>
      </div>
    </Panel>
  )
}

export function FuturesPage() {
  const setSelectedSymbol = useExchangeStore((s) => s.setSelectedSymbol)
  const setKlineInterval = useExchangeStore((s) => s.setKlineInterval)
  const cancelOrder = useExchangeStore((s) => s.cancelOrder)
  const selectedSymbol = useExchangeStore((s) => s.selectedSymbol)
  const klineInterval = useExchangeStore((s) => s.klineInterval)
  const lastPrices = useExchangeStore((s) => s.lastPrices)
  const allOrders = useExchangeStore((s) => s.orders)
  const allTrades = useExchangeStore((s) => s.trades)
  const futuresPositions = useExchangeStore((s) => s.futuresPositions)
  const futuresHistory = useExchangeStore((s) => s.futuresHistory)
  const fundingPayments = useExchangeStore((s) => s.fundingPayments)
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const engine = useExchangeStore((s) => s.engine)
  const closeFuturesPosition = useExchangeStore((s) => s.closeFuturesPosition)

  const markPrice = lastPrices[selectedSymbol] ?? SYMBOL_CONFIG[selectedSymbol].seedPrice
  const candles = buildChartCandles(selectedSymbol, allTrades, klineInterval, markPrice)
  const orderBook = engine.snapshot(selectedSymbol, 10)

  const userOrders = allOrders.filter((o) => o.userId === currentUserId)
  const openOrders = userOrders.filter(
    (o) => o.symbol === selectedSymbol && (o.status === 'open' || o.status === 'partial'),
  )
  const userTrades = allTrades.filter(
    (t) => t.buyUserId === currentUserId || t.sellUserId === currentUserId,
  )

  const openPositions = futuresPositions.filter((p) => p.userId === currentUserId && p.status === 'open')
  const myHistory = futuresHistory.filter((p) => p.userId === currentUserId)
  const myFunding = fundingPayments.filter((p) => p.userId === currentUserId).slice(0, 20)

  const tickers = Object.fromEntries(
    SYMBOLS.map((sym) => [
      sym,
      buildTicker(allTrades.filter((t) => t.symbol === sym), lastPrices[sym] ?? SYMBOL_CONFIG[sym].seedPrice),
    ]),
  )

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <TickerBar
        selectedSymbol={selectedSymbol}
        lastPrices={lastPrices}
        tickers={tickers}
        onSelectSymbol={(s: TradingSymbol) => setSelectedSymbol(s)}
      />

      <div className="flex shrink-0 items-center gap-6 border-b border-[#2b3139] bg-[#1e2329] px-4 py-1.5 text-xs">
        <div className="flex gap-2">
          <span className="text-[#848e9c]">资金费率</span>
          <span className="num font-medium text-[#f0b90b]">+{(FUNDING_RATE * 100).toFixed(4)}%</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#848e9c]">结算周期</span>
          <span className="text-[#eaecef]">每 8 小时（模拟每 20 秒）</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#848e9c]">标记价格</span>
          <span className="num text-[#eaecef]">{formatNumber(markPrice, markPrice >= 100 ? 2 : 4)}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 左侧：K线 + 持仓 + 订单记录 */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-[#2b3139]">
          <div className="min-h-0 flex-[3] border-b border-[#2b3139]">
            <KlineChart
              candles={candles}
              interval={klineInterval}
              onIntervalChange={setKlineInterval}
            />
          </div>

          <div className="shrink-0 border-b border-[#2b3139]">
            <Panel className="rounded-none border-0" title="持仓" noPadding>
              <div className="max-h-28 overflow-auto px-2 pb-2">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-[#848e9c]">
                      {['交易对', '方向', '大小', '开仓价', '标记价', '强平价', '保证金', 'PnL', 'ROE', '操作'].map((h) => (
                        <th key={h} className="py-1.5 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => {
                      const mp = lastPrices[pos.symbol] ?? pos.markPrice
                      const pnl = calcUnrealizedPnl(pos, mp)
                      const roe = calcRoe(pos, mp)
                      return (
                        <tr key={pos.id} className="border-t border-[#2b3139]">
                          <td className="py-1.5 pr-3">{pos.symbol}</td>
                          <td className="pr-3">
                            <Badge tone={pos.side === 'long' ? 'buy' : 'sell'}>
                              {pos.side === 'long' ? `多${pos.leverage}x` : `空${pos.leverage}x`}
                            </Badge>
                          </td>
                          <td className="num pr-3">{formatNumber(pos.size, 4)}</td>
                          <td className="num pr-3">{formatNumber(pos.entryPrice, 2)}</td>
                          <td className="num pr-3">{formatNumber(mp, 2)}</td>
                          <td className="num pr-3 text-[#f6465d]">{formatNumber(pos.liquidationPrice, 2)}</td>
                          <td className="num pr-3">{formatNumber(pos.initialMargin, 2)}</td>
                          <td className={`num pr-3 ${pnl >= 0 ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
                            {pnl >= 0 ? '+' : ''}{formatNumber(pnl, 4)}
                          </td>
                          <td className={`num pr-3 ${roe >= 0 ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
                            {roe >= 0 ? '+' : ''}{formatNumber(roe, 2)}%
                          </td>
                          <td>
                            <Button size="sm" variant="sell" onClick={() => closeFuturesPosition(pos.id)}>平仓</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {openPositions.length === 0 && (
                  <p className="py-3 text-center text-xs text-[#848e9c]">暂无持仓</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="min-h-0 flex-1">
            <OrderRecordsPanel
              symbol={selectedSymbol}
              openOrders={openOrders}
              historyOrders={userOrders}
              trades={userTrades}
              currentUserId={currentUserId}
              onCancel={cancelOrder}
            />
          </div>
        </div>

        {/* 右侧：盘口 + 开仓 */}
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto">
          <Panel className="rounded-none border-0 border-b p-0!" noPadding>
            <OrderBookPanel bids={orderBook.bids} asks={orderBook.asks} lastPrice={markPrice} />
          </Panel>
          <div className="p-3">
            <FuturesOrderForm />
          </div>
          <Panel className="rounded-none border-0 border-t" title="历史仓位">
            <div className="max-h-32 space-y-0 overflow-auto">
              {myHistory.slice(0, 10).map((pos) => {
                const pnl = pos.realizedPnl ?? 0
                return (
                  <div key={pos.id} className="flex items-center justify-between border-b border-[#2b3139] py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge tone={pos.side === 'long' ? 'buy' : 'sell'}>{pos.side === 'long' ? '多' : '空'}</Badge>
                      <span className="text-[#848e9c]">{pos.symbol}</span>
                    </div>
                    <span className={`num ${pnl >= 0 ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
                      {pnl >= 0 ? '+' : ''}{formatNumber(pnl, 4)}
                    </span>
                  </div>
                )
              })}
              {myHistory.length === 0 && <p className="py-2 text-xs text-[#848e9c]">暂无历史</p>}
            </div>
          </Panel>
          <Panel className="rounded-none border-0 border-t" title="资金费率">
            <div className="max-h-24 overflow-auto">
              {myFunding.slice(0, 8).map((fp) => (
                <div key={fp.id} className="flex justify-between border-b border-[#2b3139] py-1.5 text-xs">
                  <span className="text-[#848e9c]">{fp.symbol}</span>
                  <span className={`num ${fp.amount >= 0 ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
                    {fp.amount >= 0 ? '+' : ''}{formatNumber(fp.amount, 4)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
