import { useExchangeStore } from '../app/store/exchangeStore'
import { Badge, Button, Panel } from '../shared/components/ui'
import { formatNumber } from '../shared/utils/math'

export function OrdersPage() {
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const allOrders     = useExchangeStore((s) => s.orders)
  const allTrades     = useExchangeStore((s) => s.trades)
  const cancelOrder   = useExchangeStore((s) => s.cancelOrder)

  const orders = allOrders
    .filter((o) => o.userId === currentUserId)
    .sort((a, b) => b.createdAt - a.createdAt)

  const trades = allTrades
    .filter((t) => t.buyUserId === currentUserId || t.sellUserId === currentUserId)
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <Panel title="历史订单">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-[#848e9c]">
                {['时间', '交易对', '方向', '类型', '价格', '数量', '已成交', '状态', ''].map((h) => (
                  <th key={h} className="py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#2b3139]">
                  <td className="py-2 pr-4 text-[#848e9c]">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="pr-4 text-[#eaecef]">{order.symbol}</td>
                  <td className="pr-4">
                    <Badge tone={order.side === 'buy' ? 'buy' : 'sell'}>
                      {order.side === 'buy' ? '买入' : '卖出'}
                    </Badge>
                  </td>
                  <td className="pr-4 text-[#eaecef]">{order.type === 'limit' ? '限价' : '市价'}</td>
                  <td className="num pr-4 text-[#eaecef]">{order.price ? formatNumber(order.price, 2) : '市价'}</td>
                  <td className="num pr-4 text-[#eaecef]">{formatNumber(order.quantity, 4)}</td>
                  <td className="num pr-4 text-[#eaecef]">{formatNumber(order.filledQuantity, 4)}</td>
                  <td className="pr-4">
                    <Badge tone={order.status === 'filled' ? 'buy' : order.status === 'cancelled' ? 'neutral' : 'warn'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td>
                    {(order.status === 'open' || order.status === 'partial') && (
                      <Button size="sm" variant="ghost" onClick={() => cancelOrder(order.id)}>撤单</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="py-4 text-center text-xs text-[#848e9c]">暂无历史订单</p>}
        </div>
      </Panel>

      <Panel title="成交记录">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-[#848e9c]">
                {['时间', '交易对', '价格', '数量', '金额 USDT', '方向'].map((h) => (
                  <th key={h} className="py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const side = trade.buyUserId === currentUserId ? 'buy' : 'sell'
                return (
                  <tr key={trade.id} className="border-t border-[#2b3139]">
                    <td className="py-2 pr-4 text-[#848e9c]">{new Date(trade.createdAt).toLocaleString()}</td>
                    <td className="pr-4 text-[#eaecef]">{trade.symbol}</td>
                    <td className="num pr-4 text-[#eaecef]">{formatNumber(trade.price, 2)}</td>
                    <td className="num pr-4 text-[#eaecef]">{formatNumber(trade.quantity, 4)}</td>
                    <td className="num pr-4 text-[#eaecef]">{formatNumber(trade.price * trade.quantity, 2)}</td>
                    <td>
                      <Badge tone={side === 'buy' ? 'buy' : 'sell'}>
                        {side === 'buy' ? '买入' : '卖出'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {trades.length === 0 && <p className="py-4 text-center text-xs text-[#848e9c]">暂无成交记录</p>}
        </div>
      </Panel>
    </div>
  )
}
