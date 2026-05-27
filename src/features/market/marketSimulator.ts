import {
  SYMBOLS,
  SYMBOL_CONFIG,
  SYSTEM_USER_ID,
  type Account,
  type Order,
  type Trade,
  type TradingSymbol,
} from '../../shared/types'
import { createId } from '../../shared/utils/id'
import { round } from '../../shared/utils/math'
import { freezeForOrder, settleTrade } from '../matching/matcher'
import { MultiSymbolEngine } from '../matching/multiSymbolEngine'

function emptyBalances(isSystem: boolean): Record<string, { available: number; frozen: number }> {
  const balances: Record<string, { available: number; frozen: number }> = {
    USDT: { available: isSystem ? 2_000_000 : 10_000, frozen: 0 },
  }
  for (const sym of SYMBOLS) {
    const base = SYMBOL_CONFIG[sym].base
    if (!balances[base]) {
      balances[base] = { available: isSystem ? 1000 : 0, frozen: 0 }
    }
  }
  return balances
}

export function createDefaultAccount(userId: string): Account {
  return { userId, balances: emptyBalances(userId === SYSTEM_USER_ID) }
}

export function seedMarketMakerOrders(symbol: TradingSymbol, seedPrice: number): Order[] {
  const { priceStep, qtyStep } = SYMBOL_CONFIG[symbol]
  const createdAt = Date.now()
  const orders: Order[] = []
  for (let i = 1; i <= 8; i++) {
    orders.push(
      {
        id: createId('mm-ask'),
        userId: SYSTEM_USER_ID, symbol,
        side: 'sell', type: 'limit',
        price: round(seedPrice + i * priceStep, 8),
        quantity: round(qtyStep * (1 + i * 0.5), 8),
        filledQuantity: 0, status: 'open', createdAt,
      },
      {
        id: createId('mm-bid'),
        userId: SYSTEM_USER_ID, symbol,
        side: 'buy', type: 'limit',
        price: round(Math.max(priceStep, seedPrice - i * priceStep), 8),
        quantity: round(qtyStep * (1 + i * 0.5), 8),
        filledQuantity: 0, status: 'open', createdAt,
      },
    )
  }
  return orders
}

export function createInitialPersistedState() {
  const lastPrices: Record<string, number> = {}
  let allOrders: Order[] = []
  for (const symbol of SYMBOLS) {
    const price = SYMBOL_CONFIG[symbol].seedPrice
    lastPrices[symbol] = price
    allOrders = [...allOrders, ...seedMarketMakerOrders(symbol, price)]
  }
  return {
    users: [],
    accounts: { [SYSTEM_USER_ID]: createDefaultAccount(SYSTEM_USER_ID) },
    orders: allOrders,
    trades: [],
    deposits: [],
    transfers: [],
    lastPrices,
    futuresPositions: [],
    futuresHistory: [],
    fundingPayments: [],
  }
}

export function mergeLastPrices(saved: Record<string, number> = {}): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const symbol of SYMBOLS) {
    merged[symbol] = saved[symbol] ?? SYMBOL_CONFIG[symbol].seedPrice
  }
  return merged
}

/** Ensure all 20 pairs have MM liquidity after upgrading from older saves */
export function ensureMarketData(state: {
  orders: Order[]
  lastPrices: Record<string, number>
  accounts: Record<string, Account>
}): { orders: Order[]; lastPrices: Record<string, number>; accounts: Record<string, Account> } {
  const lastPrices = mergeLastPrices(state.lastPrices)
  let orders = [...state.orders]

  for (const symbol of SYMBOLS) {
    const hasLiquidity = orders.some(
      (o) => o.symbol === symbol && o.userId === SYSTEM_USER_ID && (o.status === 'open' || o.status === 'partial'),
    )
    if (!hasLiquidity) {
      orders = [...orders, ...seedMarketMakerOrders(symbol, lastPrices[symbol])]
    }
  }

  const accounts = { ...state.accounts }
  for (const userId of Object.keys(accounts)) {
    const account = accounts[userId]
    if (!account) continue
    for (const sym of SYMBOLS) {
      const base = SYMBOL_CONFIG[sym].base
      account.balances[base] = account.balances[base] ?? { available: 0, frozen: 0 }
    }
    account.balances.USDT = account.balances.USDT ?? { available: 0, frozen: 0 }
  }

  return { orders, lastPrices, accounts }
}

export function restoreEngine(orders: Order[]): MultiSymbolEngine {
  const engine = new MultiSymbolEngine()
  engine.restore(orders)
  return engine
}

function pulseForSymbol(
  engine: MultiSymbolEngine,
  accounts: Record<string, Account>,
  symbol: TradingSymbol,
  lastPrice: number,
): { orders: Order[]; trades: Trade[]; accounts: Record<string, Account>; lastPrice: number } {
  const cfg = SYMBOL_CONFIG[symbol]
  const snap = engine.snapshot(symbol, 1)
  const bestBid = snap.bids[0]?.price ?? lastPrice - cfg.priceStep
  const bestAsk = snap.asks[0]?.price ?? lastPrice + cfg.priceStep
  const mid = (bestBid + bestAsk) / 2
  const drift = (Math.random() - 0.5) * cfg.priceStep * 3
  const nextPrice = round(Math.max(cfg.priceStep, mid + drift), 8)

  const side = Math.random() > 0.5 ? 'buy' : 'sell'
  const price = side === 'buy'
    ? round(nextPrice - cfg.priceStep * 0.5, 8)
    : round(nextPrice + cfg.priceStep * 0.5, 8)
  const order: Order = {
    id: createId('sim'), userId: SYSTEM_USER_ID, symbol,
    side, type: 'limit',
    price: Math.max(cfg.priceStep, price),
    quantity: round(cfg.qtyStep * (1 + Math.random() * 4), 8),
    filledQuantity: 0, status: 'open', createdAt: Date.now(),
  }

  const frozen = freezeForOrder(accounts, order, lastPrice)
  if (!frozen) return { orders: [], trades: [], accounts, lastPrice }

  let nextAccounts = frozen
  const result = engine.match(order)
  for (const trade of result.trades) {
    nextAccounts = settleTrade(nextAccounts, trade)
  }

  const lastTrade = result.trades.at(-1)
  return {
    orders: result.updatedOrders,
    trades: result.trades,
    accounts: nextAccounts,
    lastPrice: lastTrade?.price ?? nextPrice,
  }
}

export function simulateMarketPulse(
  engine: MultiSymbolEngine,
  accounts: Record<string, Account>,
  lastPrices: Record<string, number>,
): {
  orders: Order[]
  trades: Trade[]
  accounts: Record<string, Account>
  lastPrices: Record<string, number>
} {
  let nextAccounts = accounts
  const nextPrices: Record<string, number> = { ...lastPrices }
  const allOrders: Order[] = []
  const allTrades: Trade[] = []

  // Pulse 5 random symbols per tick to keep performance stable
  const batch = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 5)
  for (const symbol of batch) {
    const lp = lastPrices[symbol] ?? SYMBOL_CONFIG[symbol].seedPrice
    const pulse = pulseForSymbol(engine, nextAccounts, symbol, lp)
    nextAccounts = pulse.accounts
    nextPrices[symbol] = pulse.lastPrice
    allOrders.push(...pulse.orders)
    allTrades.push(...pulse.trades)
  }

  return { orders: allOrders, trades: allTrades, accounts: nextAccounts, lastPrices: nextPrices }
}
