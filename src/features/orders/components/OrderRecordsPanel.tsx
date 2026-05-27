import { Badge, Button, Tabs } from '../../../shared/components/ui'
import type { Order, Trade } from '../../../shared/types'
import { formatNumber } from '../../../shared/utils/math'
import { useState, type ReactNode } from 'react'

function RecordsTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[]
  rows: ReactNode
  emptyText: string
}) {
  const isEmpty = rows === null || (Array.isArray(rows) && rows.length === 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 overflow-x-auto border-b border-[#2b3139]">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-[#848e9c]">
              {headers.map((h) => (
                <th key={h} className="bg-[#161a1e] px-2 py-2 pr-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isEmpty ? (
          <div className="flex h-full min-h-[8rem] items-center justify-center">
            <p className="text-xs text-[#848e9c]">{emptyText}</p>
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export function OrderRecordsPanel({
  symbol,
  openOrders,
  historyOrders,
  trades,
  currentUserId,
  onCancel,
}: {
  symbol?: string
  openOrders: Order[]
  historyOrders: Order[]
  trades: Trade[]
  currentUserId: string | null
  onCancel: (orderId: string) => void
}) {
  const [tab, setTab] = useState('open')

  const filteredHistory = symbol
    ? historyOrders.filter((o) => o.symbol === symbol)
    : historyOrders
  const filteredTrades = symbol
    ? trades.filter((t) => t.symbol === symbol)
    : trades

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#161a1e]">
      <div className="flex shrink-0 items-center justify-between overflow-x-auto border-b border-[#2b3139] px-3 py-2 lg:px-4">
        <Tabs
          active={tab}
          onChange={setTab}
          scrollable
          tabs={[
            { id: 'open', label: `当前委托 (${openOrders.length})` },
            { id: 'history', label: '订单记录' },
            { id: 'trades', label: '成交记录' },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'open' && (
          <RecordsTable
            headers={['时间', '交易对', '方向', '类型', '价格', '数量', '已成交', '状态', '']}
            emptyText="暂无当前委托"
            rows={
              openOrders.length === 0
                ? null
                : openOrders.map((order) => (
                    <tr key={order.id} className="border-t border-[#2b3139]">
                      <td className="px-2 py-2 pr-3 text-[#848e9c]">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="pr-3 text-[#eaecef]">{order.symbol}</td>
                      <td className="pr-3">
                        <Badge tone={order.side === 'buy' ? 'buy' : 'sell'}>
                          {order.side === 'buy' ? '买入' : '卖出'}
                        </Badge>
                      </td>
                      <td className="pr-3 text-[#eaecef]">{order.type === 'limit' ? '限价' : '市价'}</td>
                      <td className="num pr-3">{order.price ? formatNumber(order.price, 2) : '市价'}</td>
                      <td className="num pr-3">{formatNumber(order.quantity, 4)}</td>
                      <td className="num pr-3">{formatNumber(order.filledQuantity, 4)}</td>
                      <td className="pr-3 text-[#848e9c]">{order.status}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => onCancel(order.id)}>撤单</Button>
                      </td>
                    </tr>
                  ))
            }
          />
        )}

        {tab === 'history' && (
          <RecordsTable
            headers={['时间', '交易对', '方向', '类型', '价格', '数量', '已成交', '状态']}
            emptyText="暂无订单记录"
            rows={
              filteredHistory.length === 0
                ? null
                : filteredHistory.map((order) => (
                    <tr key={order.id} className="border-t border-[#2b3139]">
                      <td className="px-2 py-2 pr-3 text-[#848e9c]">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="pr-3 text-[#eaecef]">{order.symbol}</td>
                      <td className="pr-3">
                        <Badge tone={order.side === 'buy' ? 'buy' : 'sell'}>
                          {order.side === 'buy' ? '买入' : '卖出'}
                        </Badge>
                      </td>
                      <td className="pr-3">{order.type === 'limit' ? '限价' : '市价'}</td>
                      <td className="num pr-3">{order.price ? formatNumber(order.price, 2) : '市价'}</td>
                      <td className="num pr-3">{formatNumber(order.quantity, 4)}</td>
                      <td className="num pr-3">{formatNumber(order.filledQuantity, 4)}</td>
                      <td className="pr-3">
                        <Badge tone={order.status === 'filled' ? 'buy' : order.status === 'cancelled' ? 'neutral' : 'warn'}>
                          {order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
            }
          />
        )}

        {tab === 'trades' && (
          <RecordsTable
            headers={['时间', '交易对', '价格', '数量', '金额', '方向']}
            emptyText="暂无成交记录"
            rows={
              filteredTrades.length === 0
                ? null
                : filteredTrades.map((trade) => {
                    const side = trade.buyUserId === currentUserId ? 'buy' : 'sell'
                    return (
                      <tr key={trade.id} className="border-t border-[#2b3139]">
                        <td className="px-2 py-2 pr-3 text-[#848e9c]">{new Date(trade.createdAt).toLocaleString()}</td>
                        <td className="pr-3 text-[#eaecef]">{trade.symbol}</td>
                        <td className="num pr-3">{formatNumber(trade.price, 2)}</td>
                        <td className="num pr-3">{formatNumber(trade.quantity, 4)}</td>
                        <td className="num pr-3">{formatNumber(trade.price * trade.quantity, 2)}</td>
                        <td>
                          <Badge tone={side === 'buy' ? 'buy' : 'sell'}>
                            {side === 'buy' ? '买入' : '卖出'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
            }
          />
        )}
      </div>
    </div>
  )
}
