import { formatNumber } from '../../../shared/utils/math'

export function OrderBookPanel({
  bids, asks, lastPrice,
}: {
  bids: { price: number; quantity: number }[]
  asks: { price: number; quantity: number }[]
  lastPrice: number
}) {
  const maxAskQty = Math.max(...asks.map((a) => a.quantity), 0.001)
  const maxBidQty = Math.max(...bids.map((b) => b.quantity), 0.001)

  return (
    <div className="flex flex-col">
      <div className="border-b border-[#2b3139] px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#848e9c]">盘口</h2>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-[10px] text-[#848e9c]">
        <span>价格 USDT</span>
        <span>数量</span>
      </div>
      {/* Asks (reversed, red) */}
      <div className="flex flex-col-reverse">
        {asks.slice(0, 10).map((level) => {
          const pct = (level.quantity / maxAskQty) * 100
          return (
            <div key={`ask-${level.price}`} className="relative flex justify-between px-3 py-0.5">
              <div className="absolute inset-y-0 right-0 bg-[#f6465d]/10" style={{ width: `${pct}%` }} />
              <span className="num relative z-10 text-[#f6465d] text-xs">{formatNumber(level.price, 2)}</span>
              <span className="num relative z-10 text-[#eaecef] text-xs">{formatNumber(level.quantity, 4)}</span>
            </div>
          )
        })}
      </div>
      {/* Last price */}
      <div className="border-y border-[#2b3139] px-3 py-1.5">
        <span className="num text-base font-bold text-[#02c076]">{formatNumber(lastPrice, 2)}</span>
      </div>
      {/* Bids (green) */}
      <div>
        {bids.slice(0, 10).map((level) => {
          const pct = (level.quantity / maxBidQty) * 100
          return (
            <div key={`bid-${level.price}`} className="relative flex justify-between px-3 py-0.5">
              <div className="absolute inset-y-0 right-0 bg-[#02c076]/10" style={{ width: `${pct}%` }} />
              <span className="num relative z-10 text-[#02c076] text-xs">{formatNumber(level.price, 2)}</span>
              <span className="num relative z-10 text-[#eaecef] text-xs">{formatNumber(level.quantity, 4)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
