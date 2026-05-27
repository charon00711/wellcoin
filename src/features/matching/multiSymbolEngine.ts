import type { Order } from '../../shared/types'
import { MatchingEngine, type MatchResult } from './matcher'

export class MultiSymbolEngine {
  private readonly _engines = new Map<string, MatchingEngine>()

  engine(symbol: string): MatchingEngine {
    let e = this._engines.get(symbol)
    if (!e) { e = new MatchingEngine(); this._engines.set(symbol, e) }
    return e
  }

  match(order: Order): MatchResult {
    return this.engine(order.symbol).match(order)
  }

  cancel(order: Order): Order {
    return this.engine(order.symbol).cancel(order)
  }

  snapshot(symbol: string, depth = 15) {
    return this.engine(symbol).orderBook.snapshot(depth)
  }

  restore(orders: Order[]): void {
    const bySymbol = new Map<string, Order[]>()
    for (const order of orders) {
      if (order.status !== 'open' && order.status !== 'partial') continue
      const list = bySymbol.get(order.symbol) ?? []
      list.push(order)
      bySymbol.set(order.symbol, list)
    }
    for (const [symbol, symbolOrders] of bySymbol) {
      this.engine(symbol).orderBook.restore(symbolOrders)
    }
  }
}
