import type { FuturesPosition, FuturesSide } from '../../shared/types'
import { round } from '../../shared/utils/math'

export const MAINTENANCE_MARGIN_RATE = 0.005   // 0.5%
export const FUNDING_RATE = 0.0001             // 0.01% per 8h period
export const MAX_LEVERAGE = 125
export const LEVERAGE_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100, 125]

export function calcLiquidationPrice(side: FuturesSide, entryPrice: number, leverage: number): number {
  if (side === 'long') {
    return round(entryPrice * (1 - 1 / leverage + MAINTENANCE_MARGIN_RATE), 2)
  }
  return round(entryPrice * (1 + 1 / leverage - MAINTENANCE_MARGIN_RATE), 2)
}

export function calcInitialMargin(size: number, entryPrice: number, leverage: number): number {
  return round((size * entryPrice) / leverage, 2)
}

export function calcMaintenanceMargin(size: number, entryPrice: number): number {
  return round(size * entryPrice * MAINTENANCE_MARGIN_RATE, 2)
}

export function calcUnrealizedPnl(position: FuturesPosition, markPrice: number): number {
  const dir = position.side === 'long' ? 1 : -1
  return round((markPrice - position.entryPrice) * position.size * dir, 4)
}

export function shouldLiquidate(position: FuturesPosition, markPrice: number): boolean {
  if (position.status !== 'open') return false
  return position.side === 'long'
    ? markPrice <= position.liquidationPrice
    : markPrice >= position.liquidationPrice
}

export function calcFundingPayment(position: FuturesPosition, markPrice: number): number {
  // Positive rate: longs pay shorts, negative: shorts pay longs
  const payment = round(position.size * markPrice * FUNDING_RATE, 4)
  return position.side === 'long' ? -payment : payment
}

export function calcRealizedPnl(position: FuturesPosition, closePrice: number, closeSize: number): number {
  const dir = position.side === 'long' ? 1 : -1
  return round((closePrice - position.entryPrice) * closeSize * dir, 4)
}

export function calcRoe(position: FuturesPosition, markPrice: number): number {
  const pnl = calcUnrealizedPnl(position, markPrice)
  if (position.initialMargin === 0) return 0
  return round((pnl / position.initialMargin) * 100, 2)
}

export function calcMarginRatio(position: FuturesPosition, markPrice: number): number {
  const pnl = calcUnrealizedPnl(position, markPrice)
  const equity = position.initialMargin + pnl
  const notional = position.size * markPrice
  if (notional <= 0) return 100
  return round((equity / notional) * 100, 2)
}
