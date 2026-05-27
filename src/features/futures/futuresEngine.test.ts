import { describe, expect, it } from 'vitest'
import {
  calcLiquidationPrice,
  calcUnrealizedPnl,
  calcRealizedPnl,
  shouldLiquidate,
  calcFundingPayment,
} from './futuresEngine'
import type { FuturesPosition } from '../../shared/types'

function makePosition(partial: Partial<FuturesPosition>): FuturesPosition {
  return {
    id: 'p1', userId: 'u1', symbol: 'BTC/USDT',
    side: 'long', size: 0.1, entryPrice: 68000,
    markPrice: 68000, leverage: 10,
    initialMargin: 680, maintenanceMargin: 34,
    liquidationPrice: 61920, unrealizedPnl: 0,
    status: 'open', createdAt: Date.now(),
    ...partial,
  }
}

describe('futuresEngine', () => {
  it('computes long liquidation price', () => {
    // leverage 10x, entry 68000: liq = 68000 * (1 - 0.1 + 0.005) = 68000 * 0.905 = 61540
    const liq = calcLiquidationPrice('long', 68000, 10)
    expect(liq).toBe(61540)
  })

  it('computes short liquidation price', () => {
    // leverage 10x: liq = 68000 * (1 + 0.1 - 0.005) = 68000 * 1.095 = 74460
    const liq = calcLiquidationPrice('short', 68000, 10)
    expect(liq).toBe(74460)
  })

  it('calculates unrealized pnl for long', () => {
    const pos = makePosition({ entryPrice: 68000, size: 0.1 })
    expect(calcUnrealizedPnl(pos, 70000)).toBeCloseTo(200)
    expect(calcUnrealizedPnl(pos, 66000)).toBeCloseTo(-200)
  })

  it('calculates unrealized pnl for short', () => {
    const pos = makePosition({ side: 'short', entryPrice: 68000, size: 0.1 })
    expect(calcUnrealizedPnl(pos, 66000)).toBeCloseTo(200)
    expect(calcUnrealizedPnl(pos, 70000)).toBeCloseTo(-200)
  })

  it('detects liquidation when price hits threshold', () => {
    const pos = makePosition({ liquidationPrice: 61540 })
    expect(shouldLiquidate(pos, 61540)).toBe(true)
    expect(shouldLiquidate(pos, 61539)).toBe(true)
    expect(shouldLiquidate({ ...pos, side: 'short', liquidationPrice: 74460 }, 75000)).toBe(true)
    expect(shouldLiquidate(pos, 62000)).toBe(false)
  })

  it('calculates realized pnl on close', () => {
    const pos = makePosition({ entryPrice: 68000, size: 0.1 })
    expect(calcRealizedPnl(pos, 70000, 0.1)).toBeCloseTo(200)
  })

  it('funding payment is negative for long (pays)', () => {
    const pos = makePosition({ side: 'long', size: 0.1, entryPrice: 68000 })
    const payment = calcFundingPayment(pos, 68000)
    expect(payment).toBeLessThan(0)
  })

  it('funding payment is positive for short (receives)', () => {
    const pos = makePosition({ side: 'short' })
    const payment = calcFundingPayment(pos, 68000)
    expect(payment).toBeGreaterThan(0)
  })
})
