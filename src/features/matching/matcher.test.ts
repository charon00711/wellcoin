import { describe, expect, it } from 'vitest'
import { MatchingEngine, freezeForOrder, releaseOrderFreeze } from './matcher'
import { createDefaultAccount } from '../market/marketSimulator'
import type { Order } from '../../shared/types'
import { createId } from '../../shared/utils/id'

function makeOrder(partial: Partial<Order> & Pick<Order, 'side' | 'type' | 'quantity'>): Order {
  return {
    id: createId('order'),
    userId: 'user-a',
    symbol: 'BTC/USDT',
    price: partial.type === 'limit' ? (partial.price ?? 68000) : undefined,
    filledQuantity: 0,
    status: 'open',
    createdAt: Date.now(),
    ...partial,
  }
}

describe('MatchingEngine', () => {
  it('matches limit buy against resting sell order', () => {
    const engine = new MatchingEngine()
    engine.match(makeOrder({ userId: 'user-b', side: 'sell', type: 'limit', price: 68000, quantity: 0.01 }))
    const result = engine.match(makeOrder({ side: 'buy', type: 'limit', price: 68000, quantity: 0.01 }))
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0]?.price).toBe(68000)
    expect(result.updatedOrders.at(-1)?.status).toBe('filled')
  })

  it('supports partial fill and remaining book order', () => {
    const engine = new MatchingEngine()
    engine.match(makeOrder({ userId: 'user-b', side: 'sell', type: 'limit', price: 68000, quantity: 0.02 }))
    const result = engine.match(makeOrder({ side: 'buy', type: 'limit', price: 68000, quantity: 0.01 }))
    expect(result.trades).toHaveLength(1)
    expect(engine.orderBook.snapshot().asks[0]?.quantity).toBe(0.01)
  })

  it('executes market sell against best bid', () => {
    const engine = new MatchingEngine()
    engine.match(makeOrder({ userId: 'user-b', side: 'buy', type: 'limit', price: 67900, quantity: 0.02 }))
    const result = engine.match(makeOrder({ side: 'sell', type: 'market', quantity: 0.01 }))
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0]?.price).toBe(67900)
  })

  it('cancels open order and removes it from order book', () => {
    const engine = new MatchingEngine()
    const order = makeOrder({ side: 'buy', type: 'limit', price: 67000, quantity: 0.01 })
    engine.match(order)
    expect(engine.cancel(order).status).toBe('cancelled')
    expect(engine.orderBook.snapshot().bids).toHaveLength(0)
  })

  it('uses order.symbol in generated trade', () => {
    const engine = new MatchingEngine()
    const sell = makeOrder({ userId: 'user-b', side: 'sell', type: 'limit', price: 3500, quantity: 0.1, symbol: 'ETH/USDT' })
    engine.match(sell)
    const result = engine.match(makeOrder({ side: 'buy', type: 'limit', price: 3500, quantity: 0.1, symbol: 'ETH/USDT' }))
    expect(result.trades[0]?.symbol).toBe('ETH/USDT')
  })
})

describe('account freeze helpers', () => {
  it('freezes quote asset for limit buy and releases on cancel', () => {
    const order = makeOrder({ side: 'buy', type: 'limit', price: 100, quantity: 0.1 })
    const accounts = { 'user-a': createDefaultAccount('user-a') }

    const frozen = freezeForOrder(accounts, order, 68000)
    expect(frozen?.['user-a'].balances.USDT.frozen).toBe(10)
    expect(frozen?.['user-a'].balances.USDT.available).toBe(9990)

    const released = releaseOrderFreeze(frozen!, order, 68000)
    expect(released['user-a'].balances.USDT.frozen).toBe(0)
    expect(released['user-a'].balances.USDT.available).toBe(10000)
  })

  it('freezes base asset for limit sell', () => {
    const accounts = { 'user-a': createDefaultAccount('user-a') }
    accounts['user-a'].balances.BTC.available = 1

    const order = makeOrder({ side: 'sell', type: 'limit', price: 68000, quantity: 0.2 })
    const frozen = freezeForOrder(accounts, order, 68000)
    expect(frozen?.['user-a'].balances.BTC.frozen).toBe(0.2)
    expect(frozen?.['user-a'].balances.BTC.available).toBe(0.8)
  })
})
