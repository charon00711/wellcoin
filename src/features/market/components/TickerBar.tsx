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
    <div className="flex flex-wrap items-center gap-4 border-b border-[#2b3139] bg-[#161a1e] px-4 py-2">
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-xs text-[#848e9c]">交易对</label>
        <Select
          value={selectedSymbol}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onSelectSymbol(e.target.value as TradingSymbol)
          }
          className="w-36 text-sm font-medium"
        >
          {SYMBOLS.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </Select>
      </div>

      <div className="h-6 w-px bg-[#2b3139] shrink-0" />

      <span className={`num text-xl font-bold ${positive ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
        {formatNumber(lp, lp >= 100 ? 2 : 4)}
      </span>

      <div className="flex flex-wrap items-center gap-6 text-xs">
        <div>
          <p className="text-[#848e9c]">24h 涨跌</p>
          <p className={`num font-medium ${positive ? 'text-[#02c076]' : 'text-[#f6465d]'}`}>
            {positive ? '+' : ''}{formatNumber(ticker?.change24h ?? 0, 2)}%
          </p>
        </div>
        <div>
          <p className="text-[#848e9c]">24h 高</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.high24h ?? lp, lp >= 100 ? 2 : 4)}</p>
        </div>
        <div>
          <p className="text-[#848e9c]">24h 低</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.low24h ?? lp, lp >= 100 ? 2 : 4)}</p>
        </div>
        <div>
          <p className="text-[#848e9c]">24h 量</p>
          <p className="num text-[#eaecef]">{formatNumber(ticker?.volume24h ?? 0, 2)}</p>
        </div>
      </div>
    </div>
  )
}
