import { describe, expect, it } from 'vitest'
import { aggregateCandles, bucketStart, buildChartCandles, generateHistoricalCandles } from './kline'
import type { Trade } from '../../shared/types'
import { createId } from '../../shared/utils/id'

function makeTrade(price: number, quantity: number, createdAt: number, symbol = 'BTC/USDT'): Trade {
  return {
    id: createId('trade'),
    symbol,
    price,
    quantity,
    buyOrderId: 'b1',
    sellOrderId: 's1',
    buyUserId: 'u1',
    sellUserId: 'u2',
    createdAt,
  }
}

describe('kline aggregation', () => {
  it('buckets trades into 1m candles', () => {
    const base = bucketStart(Date.now(), '1m')
    const trades = [
      makeTrade(100, 0.1, base + 1000),
      makeTrade(105, 0.2, base + 2000),
      makeTrade(102, 0.1, base + 3000),
    ]

    const candles = aggregateCandles(trades, '1m', 100)
    expect(candles.length).toBeGreaterThan(0)
    const live = candles.find((c) => c.open === 100)
    expect(live?.high).toBe(105)
    expect(live?.close).toBe(102)
  })

  it('generates about six months of historical candles', () => {
    const candles = generateHistoricalCandles('BTC/USDT', '1h', 68000)
    const sixMonthsSec = (180 * 24 * 3600)
    const span = candles.at(-1)!.time - candles[0]!.time
    expect(span).toBeGreaterThan(sixMonthsSec * 0.8)
    expect(candles.length).toBeGreaterThan(100)
    expect(candles.at(-1)?.close).toBe(68000)
  })

  it('merges live trades into historical chart data', () => {
    const now = bucketStart(Date.now(), '1h')
    const trades = [makeTrade(69000, 0.5, now + 1000)]
    const candles = buildChartCandles('BTC/USDT', trades, '1h', 69000)
    expect(candles.length).toBeGreaterThan(100)
    const last = candles.at(-1)
    expect(last?.close).toBe(69000)
  })
})
