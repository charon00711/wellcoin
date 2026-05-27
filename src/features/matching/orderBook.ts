import type { Order, OrderBookSnapshot, OrderSide } from '../../shared/types'
import { round } from '../../shared/utils/math'

interface BookOrder {
  order: Order
  remaining: number
}

interface PriceLevel {
  price: number
  orders: BookOrder[]
}

export class OrderBook {
  private bids = new Map<number, PriceLevel>()
  private asks = new Map<number, PriceLevel>()

  add(order: Order): void {
    if (order.type === 'market' || order.status === 'filled' || order.status === 'cancelled') {
      return
    }
    const remaining = round(order.quantity - order.filledQuantity, 8)
    if (remaining <= 0 || !order.price) return

    const map = order.side === 'buy' ? this.bids : this.asks
    const level = map.get(order.price) ?? { price: order.price, orders: [] }
    level.orders.push({ order, remaining })
    map.set(order.price, level)
  }

  remove(orderId: string): Order | null {
    for (const map of [this.bids, this.asks]) {
      for (const [price, level] of map.entries()) {
        const index = level.orders.findIndex((item) => item.order.id === orderId)
        if (index >= 0) {
          const [removed] = level.orders.splice(index, 1)
          if (level.orders.length === 0) {
            map.delete(price)
          }
          return removed.order
        }
      }
    }
    return null
  }

  getBestBid(): PriceLevel | null {
    const prices = [...this.bids.keys()].sort((a, b) => b - a)
    const price = prices[0]
    return price !== undefined ? this.bids.get(price) ?? null : null
  }

  getBestAsk(): PriceLevel | null {
    const prices = [...this.asks.keys()].sort((a, b) => a - b)
    const price = prices[0]
    return price !== undefined ? this.asks.get(price) ?? null : null
  }

  getOppositeLevels(side: OrderSide): PriceLevel[] {
    const map = side === 'buy' ? this.asks : this.bids
    const prices = [...map.keys()].sort((a, b) => (side === 'buy' ? a - b : b - a))
    return prices.map((price) => map.get(price)!).filter(Boolean)
  }

  reduceRemaining(orderId: string, amount: number): void {
    for (const map of [this.bids, this.asks]) {
      for (const [price, level] of map.entries()) {
        const item = level.orders.find((entry) => entry.order.id === orderId)
        if (!item) continue
        item.remaining = round(item.remaining - amount, 8)
        if (item.remaining <= 0) {
          level.orders = level.orders.filter((entry) => entry.order.id !== orderId)
          if (level.orders.length === 0) {
            map.delete(price)
          }
        }
        return
      }
    }
  }

  snapshot(depth = 12): OrderBookSnapshot {
    const bids = [...this.bids.values()]
      .map((level) => ({
        price: level.price,
        quantity: round(
          level.orders.reduce((sum, item) => sum + item.remaining, 0),
          8,
        ),
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, depth)

    const asks = [...this.asks.values()]
      .map((level) => ({
        price: level.price,
        quantity: round(
          level.orders.reduce((sum, item) => sum + item.remaining, 0),
          8,
        ),
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, depth)

    return { bids, asks }
  }

  restore(orders: Order[]): void {
    this.bids.clear()
    this.asks.clear()
    for (const order of orders) {
      if (order.status === 'open' || order.status === 'partial') {
        this.add(order)
      }
    }
  }
}
