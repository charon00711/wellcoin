import { getSymbolConfig } from '../../shared/config/symbols'
import type { Order, Trade } from '../../shared/types'
import { createId } from '../../shared/utils/id'
import { round } from '../../shared/utils/math'
import { OrderBook } from './orderBook'

export interface MatchResult {
  trades: Trade[]
  updatedOrders: Order[]
}

function getAssets(symbol: string): { base: string; quote: string } {
  const cfg = getSymbolConfig(symbol)
  return { base: cfg.base, quote: cfg.quote }
}

function updateOrderStatus(order: Order): Order {
  if (order.status === 'cancelled') return order
  if (order.filledQuantity <= 0) return { ...order, status: 'open' }
  if (order.filledQuantity >= order.quantity) return { ...order, status: 'filled', filledQuantity: order.quantity }
  return { ...order, status: 'partial' }
}

function canMatch(incoming: Order, restingPrice: number): boolean {
  if (incoming.type === 'market') return true
  if (!incoming.price) return false
  return incoming.side === 'buy' ? restingPrice <= incoming.price : restingPrice >= incoming.price
}

export class MatchingEngine {
  readonly orderBook = new OrderBook()

  match(incoming: Order): MatchResult {
    const trades: Trade[] = []
    const updatedOrders: Order[] = []
    let taker = { ...incoming }

    for (const level of this.orderBook.getOppositeLevels(taker.side)) {
      if (taker.filledQuantity >= taker.quantity) break
      if (!canMatch(taker, level.price)) break

      for (const restingItem of [...level.orders]) {
        if (taker.filledQuantity >= taker.quantity) break
        if (!canMatch(taker, level.price)) break

        const maker = restingItem.order
        const fillQty = round(Math.min(taker.quantity - taker.filledQuantity, restingItem.remaining), 8)
        if (fillQty <= 0) continue

        const trade: Trade = {
          id: createId('trade'),
          symbol: taker.symbol,
          price: level.price,
          quantity: fillQty,
          buyOrderId:  taker.side === 'buy'  ? taker.id  : maker.id,
          sellOrderId: taker.side === 'sell' ? taker.id  : maker.id,
          buyUserId:   taker.side === 'buy'  ? taker.userId : maker.userId,
          sellUserId:  taker.side === 'sell' ? taker.userId : maker.userId,
          createdAt: Date.now(),
        }

        taker = { ...taker, filledQuantity: round(taker.filledQuantity + fillQty, 8) }

        const updatedMaker = updateOrderStatus({
          ...maker,
          filledQuantity: round(maker.filledQuantity + fillQty, 8),
        })

        this.orderBook.reduceRemaining(maker.id, fillQty)
        if (updatedMaker.status === 'filled') this.orderBook.remove(maker.id)

        trades.push(trade)
        updatedOrders.push(updatedMaker)
      }
    }

    taker = updateOrderStatus(taker)
    if (taker.type === 'limit' && (taker.status === 'open' || taker.status === 'partial') && taker.filledQuantity < taker.quantity) {
      this.orderBook.add(taker)
    }

    updatedOrders.push(taker)
    return { trades, updatedOrders }
  }

  cancel(order: Order): Order {
    this.orderBook.remove(order.id)
    return { ...order, status: 'cancelled' }
  }
}

export function estimateMarketBuyFreeze(quantity: number, lastPrice: number): number {
  return round(quantity * lastPrice * 1.02, 2)
}

type AccountMap = Record<string, { userId: string; balances: Record<string, { available: number; frozen: number }> }>

export function freezeForOrder(accounts: AccountMap, order: Order, lastPrice: number): AccountMap | null {
  const { base, quote } = getAssets(order.symbol)
  const next = structuredClone(accounts)
  const account = next[order.userId]
  if (!account) return null

  if (order.side === 'buy') {
    const amount = order.type === 'market'
      ? estimateMarketBuyFreeze(order.quantity, lastPrice)
      : round((order.price ?? 0) * order.quantity, 2)
    const bal = account.balances[quote]
    if (!bal || bal.available < amount) return null
    bal.available = round(bal.available - amount, 2)
    bal.frozen    = round(bal.frozen  + amount, 2)
  } else {
    const amount = round(order.quantity, 8)
    const bal = account.balances[base]
    if (!bal || bal.available < amount) return null
    bal.available = round(bal.available - amount, 8)
    bal.frozen    = round(bal.frozen    + amount, 8)
  }
  return next
}

export function releaseOrderFreeze(accounts: AccountMap, order: Order, lastPrice: number): AccountMap {
  const { base, quote } = getAssets(order.symbol)
  const next = structuredClone(accounts)
  const account = next[order.userId]
  if (!account) return accounts

  const remaining = round(order.quantity - order.filledQuantity, 8)
  if (remaining <= 0) return next

  if (order.side === 'buy') {
    const amount = order.type === 'limit' && order.price
      ? round(order.price * remaining, 2)
      : estimateMarketBuyFreeze(remaining, lastPrice)
    const bal = account.balances[quote]
    if (bal) {
      bal.frozen    = round(Math.max(0, bal.frozen - amount), 2)
      bal.available = round(bal.available + amount, 2)
    }
  } else {
    const bal = account.balances[base]
    if (bal) {
      bal.frozen    = round(Math.max(0, bal.frozen - remaining), 8)
      bal.available = round(bal.available + remaining, 8)
    }
  }
  return next
}

export function settleTrade(accounts: AccountMap, trade: Trade): AccountMap {
  const { base, quote } = getAssets(trade.symbol)
  const next = structuredClone(accounts)
  const quoteAmt = round(trade.price * trade.quantity, 2)

  const buyer  = next[trade.buyUserId]
  const seller = next[trade.sellUserId]
  if (!buyer || !seller) return accounts

  buyer.balances[quote] = buyer.balances[quote] ?? { available: 0, frozen: 0 }
  buyer.balances[base]  = buyer.balances[base]  ?? { available: 0, frozen: 0 }
  buyer.balances[quote].frozen    = round(buyer.balances[quote].frozen - quoteAmt, 2)
  buyer.balances[base].available  = round(buyer.balances[base].available + trade.quantity, 8)

  seller.balances[base]  = seller.balances[base]  ?? { available: 0, frozen: 0 }
  seller.balances[quote] = seller.balances[quote] ?? { available: 0, frozen: 0 }
  seller.balances[base].frozen     = round(seller.balances[base].frozen - trade.quantity, 8)
  seller.balances[quote].available = round(seller.balances[quote].available + quoteAmt, 2)

  return next
}
