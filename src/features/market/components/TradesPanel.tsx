import { formatNumber } from '../../../shared/utils/math'
import type { Trade } from '../../../shared/types'

export function TradesPanel({ trades }: { trades: Trade[] }) {
  return (
    <div>
      <div className="border-b border-[#2b3139] px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#848e9c]">最新成交</h2>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-[10px] text-[#848e9c]">
        <span>价格</span><span>数量</span><span>时间</span>
      </div>
      <div className="max-h-48 overflow-auto">
        {trades.slice(0, 20).map((trade) => (
          <div key={trade.id} className="flex justify-between px-3 py-0.5">
            <span className="num text-xs text-[#02c076]">{formatNumber(trade.price, 2)}</span>
            <span className="num text-xs text-[#eaecef]">{formatNumber(trade.quantity, 4)}</span>
            <span className="num text-xs text-[#848e9c]">{new Date(trade.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
        {trades.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#848e9c]">暂无成交</p>
        )}
      </div>
    </div>
  )
}
