import type { Candle, KlineInterval, Trade } from '../../shared/types'
import { getSymbolConfig } from '../../shared/config/symbols'
import { round } from '../../shared/utils/math'

const INTERVAL_MS: Record<KlineInterval, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
}

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000
const MAX_CANDLES = 2500

function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function bucketStart(timestamp: number, interval: KlineInterval): number {
  const size = INTERVAL_MS[interval]
  return Math.floor(timestamp / size) * size
}

/** Deterministic 6-month OHLCV series per symbol + interval */
export function generateHistoricalCandles(
  symbol: string,
  interval: KlineInterval,
  endPrice: number,
): Candle[] {
  const cfg = getSymbolConfig(symbol)
  const intervalMs = INTERVAL_MS[interval]
  const endTime = bucketStart(Date.now(), interval)
  const startTime = endTime - SIX_MONTHS_MS
  const totalBars = Math.floor(SIX_MONTHS_MS / intervalMs)
  const step = Math.max(1, Math.ceil(totalBars / MAX_CANDLES))
  const rand = mulberry32(hashSeed(`${symbol}:${interval}`))

  const candles: Candle[] = []
  let price = cfg.seedPrice * (0.72 + rand() * 0.12)
  const trend = (endPrice - price) / Math.max(1, totalBars / step)

  for (let i = 0; i < totalBars; i += step) {
    const timeMs = startTime + i * intervalMs
    const drift = trend + (rand() - 0.5) * cfg.seedPrice * 0.004
    const open = round(Math.max(cfg.seedPrice * 0.2, price), 8)
    price = round(Math.max(cfg.seedPrice * 0.2, price + drift), 8)
    const high = round(Math.max(open, price) * (1 + rand() * 0.003), 8)
    const low = round(Math.min(open, price) * (1 - rand() * 0.003), 8)
    const close = price
    const volume = round(cfg.qtyStep * (20 + rand() * 120), 8)

    candles.push({ time: timeMs / 1000, open, high, low, close, volume })
  }

  if (candles.length > 0) {
    const last = candles[candles.length - 1]!
    last.close = endPrice
    last.high = Math.max(last.high, endPrice)
    last.low = Math.min(last.low, endPrice)
  }

  return candles
}

function aggregateTradesToCandles(trades: Trade[], interval: KlineInterval): Map<number, Candle> {
  const buckets = new Map<number, Candle>()
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt)

  for (const trade of sorted) {
    const start = bucketStart(trade.createdAt, interval)
    const existing = buckets.get(start)
    if (!existing) {
      buckets.set(start, {
        time: start / 1000,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: round(trade.quantity, 8),
      })
      continue
    }
    existing.high = Math.max(existing.high, trade.price)
    existing.low = Math.min(existing.low, trade.price)
    existing.close = trade.price
    existing.volume = round(existing.volume + trade.quantity, 8)
  }

  return buckets
}

export function buildChartCandles(
  symbol: string,
  trades: Trade[],
  interval: KlineInterval,
  lastPrice: number,
): Candle[] {
  const historical = generateHistoricalCandles(symbol, interval, lastPrice)
  const liveMap = aggregateTradesToCandles(
    trades.filter((t) => t.symbol === symbol),
    interval,
  )

  const merged = [...historical]
  for (const live of liveMap.values()) {
    const idx = merged.findIndex((c) => c.time === live.time)
    if (idx >= 0) {
      const base = merged[idx]!
      merged[idx] = {
        time: live.time,
        open: base.open,
        high: Math.max(base.high, live.high),
        low: Math.min(base.low, live.low),
        close: live.close,
        volume: round(base.volume + live.volume, 8),
      }
    } else {
      merged.push(live)
    }
  }

  return merged.sort((a, b) => a.time - b.time)
}

/** @deprecated use buildChartCandles */
export function aggregateCandles(
  trades: Trade[],
  interval: KlineInterval,
  seedPrice = 68000,
): Candle[] {
  const symbol = trades[0]?.symbol ?? 'BTC/USDT'
  return buildChartCandles(symbol, trades, interval, seedPrice)
}

export function buildTicker(trades: Trade[], lastPrice: number) {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  const recent = trades.filter((trade) => trade.createdAt >= dayAgo)
  const basePrice = recent[0]?.price ?? lastPrice
  const prices = recent.map((trade) => trade.price)
  const volume = recent.reduce((sum, trade) => sum + trade.quantity, 0)

  return {
    lastPrice,
    change24h: basePrice ? round(((lastPrice - basePrice) / basePrice) * 100, 2) : 0,
    high24h: prices.length ? Math.max(...prices) : lastPrice,
    low24h: prices.length ? Math.min(...prices) : lastPrice,
    volume24h: round(volume, 4),
  }
}
