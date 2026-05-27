import { SYMBOLS, getSymbolConfig, type TradingSymbol } from '../../../shared/types'
import { Select } from '../../../shared/components/ui'
import { formatNumber } from '../../../shared/utils/math'

export function TickerBar({
  selectedSymbol, lastPrices, tickers, onSelectSymbol,
}: {
  selectedSymbol: TradingSymbol
  lastPrices: Record<string, number>
  tickers: Record<string, { change24h: number; high24h: number; low24h: number; volume24h: number }>
  onSelectSymbol: (s: TradingSymbol) => void
}) {
  const ticker = tickers[selectedSymbol]
  const lp = lastPrices[selectedSymbol] ?? getSymbolConfig(selectedSymbol).seedPrice
  const positive = (ticker?.change24h ?? 0) >= 0

  return (
    <div className="shrink-0 border-b border-[#2b3139] bg-[#161a1e] px-3 py-2 lg:px-4">
      {/* Row 1: symbol + price */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Select
            value={selectedSymbol}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onSelectSymbol(e.target.value as TradingSymbol)
            }
            className="w-28 text-sm font-medium lg:w-36"
          >
            {SYMBOLS.map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </Select>
          <span className={`num text-lg font-bold lg:text-xl ${positive ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
            {formatNumber(lp, lp >= 100 ? 2 : 4)}
          </span>
        </div>
        <div className="shrink-0 text-right text-xs">
          <p className="text-[#848e9c]">24h 涨跌</p>
          <p className={`num font-medium ${positive ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
            {positive ? '+' : ''}{formatNumber(ticker?.change24h ?? 0, 2)}%
          </p>
        </div>
      </div>

      {/* Row 2: stats — scroll on mobile, inline on desktop */}
      <div className="mt-2 flex gap-4 overflow-x-auto text-xs lg:mt-0 lg:inline-flex lg:gap-6">
        <div className="hidden shrink-0 lg:block">
          <div className="h-6 w-px bg-[#2b3139]" />
        </div>
        <div className="shrink-0">
          <p className="text-[#848e9c]">24h 高</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.high24h ?? lp, lp >= 100 ? 2 : 4)}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[#848e9c]">24h 低</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.low24h ?? lp, lp >= 100 ? 2 : 4)}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[#848e9c]">24h 量</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.volume24h ?? 0, 2)}</p>
        </div>
      </div>
    </div>
  )
}
