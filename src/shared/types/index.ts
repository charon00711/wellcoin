import type { TradingSymbol } from '../config/symbols'
export {
  SYMBOLS,
  SYMBOL_CONFIG,
  QUOTE_ASSET,
  ALL_ASSETS,
  getSymbolConfig,
  assetToSymbol,
  getAssetPrice,
  type TradingSymbol,
  type SymbolConfig,
} from '../config/symbols'

export const SYSTEM_USER_ID = 'system-mm'

// ─── Spot order / trade types ─────────────────────────────────────────────────
export type OrderSide   = 'buy' | 'sell'
export type OrderType   = 'limit' | 'market'
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled'
export type KlineInterval = '1m' | '5m' | '15m' | '1h'

export interface User {
  id: string
  email: string
  passwordHash: string
  createdAt: number
}

export interface Balance {
  available: number
  frozen: number
}

export interface Account {
  userId: string
  balances: Record<string, Balance>
}

export interface DepositRecord {
  id: string
  userId: string
  asset: string
  amount: number
  createdAt: number
}

export interface TransferRecord {
  id: string
  userId: string
  fromAsset: string
  toAsset: string
  fromAmount: number
  toAmount: number
  rate: number
  createdAt: number
}

export interface Order {
  id: string
  userId: string
  symbol: string
  side: OrderSide
  type: OrderType
  price?: number
  quantity: number
  filledQuantity: number
  status: OrderStatus
  createdAt: number
}

export interface Trade {
  id: string
  symbol: string
  price: number
  quantity: number
  buyOrderId: string
  sellOrderId: string
  buyUserId: string
  sellUserId: string
  createdAt: number
}

export interface BookLevel {
  price: number
  quantity: number
}

export interface OrderBookSnapshot {
  bids: BookLevel[]
  asks: BookLevel[]
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Ticker {
  symbol: string
  lastPrice: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
}

// ─── Futures types ────────────────────────────────────────────────────────────
export type FuturesSide = 'long' | 'short'
export type FuturesStatus = 'open' | 'closed' | 'liquidated'

export interface FuturesPosition {
  id: string
  userId: string
  symbol: TradingSymbol
  side: FuturesSide
  size: number
  entryPrice: number
  markPrice: number
  leverage: number
  initialMargin: number
  maintenanceMargin: number
  liquidationPrice: number
  unrealizedPnl: number
  status: FuturesStatus
  realizedPnl?: number
  closedAt?: number
  createdAt: number
}

export interface FundingPayment {
  id: string
  userId: string
  positionId: string
  symbol: TradingSymbol
  amount: number
  rate: number
  appliedAt: number
}

// ─── Persisted state ──────────────────────────────────────────────────────────
export interface ExchangePersistedState {
  users: User[]
  accounts: Record<string, Account>
  orders: Order[]
  trades: Trade[]
  deposits: DepositRecord[]
  transfers: TransferRecord[]
  lastPrices: Record<string, number>
  futuresPositions: FuturesPosition[]
  futuresHistory: FuturesPosition[]
  fundingPayments: FundingPayment[]
}
