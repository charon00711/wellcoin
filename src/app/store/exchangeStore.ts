import { create } from 'zustand'
import {
  SYMBOLS,
  SYMBOL_CONFIG,
  QUOTE_ASSET,
  SYSTEM_USER_ID,
  getAssetPrice,
  type Account,
  type DepositRecord,
  type ExchangePersistedState,
  type FundingPayment,
  type FuturesPosition,
  type FuturesSide,
  type KlineInterval,
  type Order,
  type OrderSide,
  type OrderType,
  type Trade,
  type TradingSymbol,
  type TransferRecord,
  type User,
} from '../../shared/types'
import {
  loadPersistedState,
  loadSessionUserId,
  savePersistedState,
  saveSessionUserId,
} from '../../shared/storage/localStorage'
import { createId } from '../../shared/utils/id'
import { round } from '../../shared/utils/math'
import { hashPassword, verifyPassword } from '../../shared/utils/password'
import { freezeForOrder, releaseOrderFreeze, settleTrade } from '../../features/matching/matcher'
import { MultiSymbolEngine } from '../../features/matching/multiSymbolEngine'
import {
  calcFundingPayment,
  calcInitialMargin,
  calcLiquidationPrice,
  calcMaintenanceMargin,
  calcRealizedPnl,
  calcUnrealizedPnl,
  shouldLiquidate,
} from '../../features/futures/futuresEngine'
import {
  createDefaultAccount,
  createInitialPersistedState,
  ensureMarketData,
  restoreEngine,
  simulateMarketPulse,
} from '../../features/market/marketSimulator'

// ─── Synchronous hydration ───────────────────────────────────────────────────
const _saved = loadPersistedState()
const _initBase = _saved ?? createInitialPersistedState()
const _migrated = ensureMarketData({
  orders: _initBase.orders,
  lastPrices: _initBase.lastPrices,
  accounts: _initBase.accounts,
})
const _init = {
  ..._initBase,
  ..._migrated,
  transfers: _initBase.transfers ?? [],
}
if (!_saved) savePersistedState(_init)
else savePersistedState({ ..._initBase, ..._migrated, transfers: _initBase.transfers ?? [] })
const _sessionUserId = loadSessionUserId()
const _engine = restoreEngine(_init.orders)
// ─────────────────────────────────────────────────────────────────────────────

interface ExchangeState {
  users: User[]
  accounts: Record<string, Account>
  orders: Order[]
  trades: Trade[]
  deposits: DepositRecord[]
  transfers: TransferRecord[]
  currentUserId: string | null
  lastPrices: Record<string, number>
  selectedSymbol: TradingSymbol
  klineInterval: KlineInterval
  engine: MultiSymbolEngine
  futuresPositions: FuturesPosition[]
  futuresHistory: FuturesPosition[]
  fundingPayments: FundingPayment[]
  futuresLeverage: Record<string, number>
  marketTimer: number | null
  fundingTickCount: number

  startMarketSimulation: () => void
  stopMarketSimulation: () => void
  register: (email: string, password: string) => Promise<string | null>
  login:    (email: string, password: string) => Promise<string | null>
  logout:   () => void
  deposit:  (asset: string, amount: number) => string | null
  transferAsset: (fromAsset: string, toAsset: string, amount: number) => string | null
  setSelectedSymbol: (symbol: TradingSymbol) => void
  setKlineInterval:  (interval: KlineInterval) => void
  placeOrder: (input: { side: OrderSide; type: OrderType; price?: number; quantity: number }) => string | null
  cancelOrder: (orderId: string) => string | null
  openFuturesPosition: (input: { side: FuturesSide; size: number; leverage: number }) => string | null
  closeFuturesPosition: (positionId: string) => string | null
  setFuturesLeverage: (symbol: TradingSymbol, leverage: number) => void
}

function persist(s: ExchangePersistedState) { savePersistedState(s) }

function mergeOrders(existing: Order[], updates: Order[]): Order[] {
  const map = new Map(existing.map((o) => [o.id, o]))
  for (const o of updates) map.set(o.id, o)
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt)
}

function refundMarketBuyRemainder(accounts: Record<string, Account>, userId: string): Record<string, Account> {
  const next = structuredClone(accounts)
  const account = next[userId]
  if (!account) return accounts
  const refund = account.balances[QUOTE_ASSET]?.frozen ?? 0
  if (refund <= 0) return next
  account.balances[QUOTE_ASSET].available = round(account.balances[QUOTE_ASSET].available + refund, 2)
  account.balances[QUOTE_ASSET].frozen = 0
  return next
}

function applyFunding(
  state: Pick<ExchangeState, 'futuresPositions' | 'accounts' | 'lastPrices'>,
): { positions: FuturesPosition[]; accounts: Record<string, Account>; payments: FundingPayment[] } {
  let accounts = structuredClone(state.accounts)
  const payments: FundingPayment[] = []
  const positions = state.futuresPositions.map((pos) => {
    if (pos.status !== 'open') return pos
    const markPrice = state.lastPrices[pos.symbol] ?? pos.markPrice
    const payment = calcFundingPayment(pos, markPrice)
    const acc = accounts[pos.userId]
    if (!acc) return pos
    acc.balances[QUOTE_ASSET] = acc.balances[QUOTE_ASSET] ?? { available: 0, frozen: 0 }
    acc.balances[QUOTE_ASSET].available = round(acc.balances[QUOTE_ASSET].available + payment, 2)
    payments.push({
      id: createId('fp'), userId: pos.userId, positionId: pos.id,
      symbol: pos.symbol, amount: payment,
      rate: payment > 0 ? 0.0001 : -0.0001,
      appliedAt: Date.now(),
    })
    return pos
  })
  return { positions, accounts, payments }
}

function checkLiquidations(
  positions: FuturesPosition[],
  accounts: Record<string, Account>,
  lastPrices: Record<string, number>,
): { positions: FuturesPosition[]; accounts: Record<string, Account>; history: FuturesPosition[] } {
  let nextAccounts = structuredClone(accounts)
  const history: FuturesPosition[] = []

  const nextPositions = positions.map((pos) => {
    if (pos.status !== 'open') return pos
    const markPrice = lastPrices[pos.symbol] ?? pos.markPrice
    if (!shouldLiquidate(pos, markPrice)) {
      const unrealizedPnl = calcUnrealizedPnl(pos, markPrice)
      return { ...pos, markPrice, unrealizedPnl }
    }
    // Liquidate: frozen margin is zeroed (used to cover losses)
    const acc = nextAccounts[pos.userId]
    if (acc) {
      const bal = acc.balances[QUOTE_ASSET] ?? { available: 0, frozen: 0 }
      bal.frozen = round(Math.max(0, bal.frozen - pos.initialMargin), 2)
      acc.balances[QUOTE_ASSET] = bal
    }
    const liquidated: FuturesPosition = { ...pos, status: 'liquidated', markPrice, unrealizedPnl: -pos.initialMargin, closedAt: Date.now() }
    history.push(liquidated)
    return liquidated
  })

  return {
    positions: nextPositions.filter((p) => p.status === 'open'),
    accounts: nextAccounts,
    history,
  }
}

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  users:            _init.users,
  accounts:         _init.accounts,
  orders:           _init.orders,
  trades:           _init.trades,
  deposits:         _init.deposits,
  transfers:        _init.transfers,
  currentUserId:    _sessionUserId,
  lastPrices:       _init.lastPrices,
  selectedSymbol:   'BTC/USDT',
  klineInterval:    '1m',
  engine:           _engine,
  futuresPositions: _init.futuresPositions,
  futuresHistory:   _init.futuresHistory,
  fundingPayments:  _init.fundingPayments,
  futuresLeverage:  Object.fromEntries(SYMBOLS.map((s) => [s, 10])),
  marketTimer:      null,
  fundingTickCount: 0,

  startMarketSimulation: () => {
    const existing = get().marketTimer
    if (existing) window.clearInterval(existing)

    const timer = window.setInterval(() => {
      const { engine, accounts, lastPrices, orders, trades, fundingTickCount } = get()
      const pulse = simulateMarketPulse(engine, accounts, lastPrices)

      let nextAccounts = pulse.accounts
      const nextOrders = mergeOrders(orders, pulse.orders)
      const nextTrades = [...pulse.trades, ...trades].sort((a, b) => b.createdAt - a.createdAt)
      const nextPrices = pulse.lastPrices

      // Update futures positions mark price + check liquidations
      const liquidationResult = checkLiquidations(get().futuresPositions, nextAccounts, nextPrices)
      nextAccounts = liquidationResult.accounts

      // Apply funding every 5 ticks (~20 seconds)
      const newTickCount = fundingTickCount + 1
      let newPayments = get().fundingPayments
      if (newTickCount % 5 === 0) {
        const funding = applyFunding({
          futuresPositions: liquidationResult.positions,
          accounts: nextAccounts,
          lastPrices: nextPrices,
        })
        nextAccounts = funding.accounts
        newPayments = [...funding.payments, ...newPayments].slice(0, 200)
      }

      const nextPositions = liquidationResult.positions
      const nextHistory   = [...liquidationResult.history, ...get().futuresHistory].slice(0, 100)

      set({
        accounts: nextAccounts,
        orders: nextOrders,
        trades: nextTrades,
        lastPrices: nextPrices,
        futuresPositions: nextPositions,
        futuresHistory: nextHistory,
        fundingPayments: newPayments,
        fundingTickCount: newTickCount,
      })
      persist({
        users: get().users, accounts: nextAccounts, orders: nextOrders,
        trades: nextTrades, deposits: get().deposits, transfers: get().transfers,
        lastPrices: nextPrices,
        futuresPositions: nextPositions, futuresHistory: nextHistory,
        fundingPayments: newPayments,
      })
    }, 4000)

    set({ marketTimer: timer })
  },

  stopMarketSimulation: () => {
    const timer = get().marketTimer
    if (timer) window.clearInterval(timer)
    set({ marketTimer: null })
  },

  register: async (email, password) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized || password.length < 6) return '邮箱无效或密码至少 6 位'
    if (get().users.some((u) => u.email === normalized)) return '该邮箱已注册'

    const user: User = {
      id: createId('user'),
      email: normalized,
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    }
    const nextUsers    = [...get().users, user]
    const nextAccounts = { ...get().accounts, [user.id]: createDefaultAccount(user.id) }
    set({ users: nextUsers, accounts: nextAccounts, currentUserId: user.id })
    saveSessionUserId(user.id)
    persist({ ...toPersisted(get()), users: nextUsers, accounts: nextAccounts })
    return null
  },

  login: async (email, password) => {
    const normalized = email.trim().toLowerCase()
    const user = get().users.find((u) => u.email === normalized)
    if (!user) return '用户不存在'
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return '密码错误'
    set({ currentUserId: user.id })
    saveSessionUserId(user.id)
    return null
  },

  logout: () => {
    set({ currentUserId: null })
    saveSessionUserId(null)
  },

  deposit: (asset, amount) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    if (amount <= 0) return '充值金额必须大于 0'

    const accounts = structuredClone(get().accounts)
    const account  = accounts[userId]
    if (!account) return '账户不存在'
    account.balances[asset] = account.balances[asset] ?? { available: 0, frozen: 0 }
    account.balances[asset].available = round(account.balances[asset].available + amount, asset === QUOTE_ASSET ? 2 : 8)

    const deposit: DepositRecord = {
      id: createId('dep'), userId, asset, amount, createdAt: Date.now(),
    }
    const deposits = [deposit, ...get().deposits]
    set({ accounts, deposits })
    persist({ ...toPersisted(get()), accounts, deposits })
    return null
  },

  transferAsset: (fromAsset, toAsset, amount) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    if (fromAsset === toAsset) return '请选择不同的币种'
    if (amount <= 0) return '划转数量必须大于 0'

    const fromPrice = getAssetPrice(fromAsset, get().lastPrices)
    const toPrice = getAssetPrice(toAsset, get().lastPrices)
    if (fromPrice <= 0 || toPrice <= 0) return '暂不支持该币种划转'

    const accounts = structuredClone(get().accounts)
    const account = accounts[userId]
    if (!account) return '账户不存在'

    account.balances[fromAsset] = account.balances[fromAsset] ?? { available: 0, frozen: 0 }
    account.balances[toAsset] = account.balances[toAsset] ?? { available: 0, frozen: 0 }

    const fromBal = account.balances[fromAsset]
    const fromDecimals = fromAsset === QUOTE_ASSET ? 2 : 8
    const toDecimals = toAsset === QUOTE_ASSET ? 2 : 8

    if (fromBal.available < amount) return '可用余额不足'

    const usdtValue = round(amount * fromPrice, 2)
    const toAmount = round(usdtValue / toPrice, toDecimals)
    if (toAmount <= 0) return '划转金额过小'

    fromBal.available = round(fromBal.available - amount, fromDecimals)
    account.balances[toAsset].available = round(
      account.balances[toAsset].available + toAmount,
      toDecimals,
    )

    const transfer: TransferRecord = {
      id: createId('tf'),
      userId,
      fromAsset,
      toAsset,
      fromAmount: round(amount, fromDecimals),
      toAmount,
      rate: round(toPrice / fromPrice, 8),
      createdAt: Date.now(),
    }

    const transfers = [transfer, ...get().transfers]
    set({ accounts, transfers })
    persist({ ...toPersisted(get()), accounts, transfers })
    return null
  },

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setKlineInterval:  (interval) => set({ klineInterval: interval }),

  placeOrder: ({ side, type, price, quantity }) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    if (quantity <= 0) return '数量必须大于 0'
    if (type === 'limit' && (!price || price <= 0)) return '限价单需填写价格'

    const symbol  = get().selectedSymbol
    const lp      = get().lastPrices[symbol] ?? SYMBOL_CONFIG[symbol].seedPrice
    const order: Order = {
      id: createId('order'), userId, symbol,
      side, type,
      price: type === 'limit' ? round(price!, 2) : undefined,
      quantity: round(quantity, 8),
      filledQuantity: 0, status: 'open', createdAt: Date.now(),
    }

    const frozen = freezeForOrder(get().accounts, order, lp)
    if (!frozen) return '余额不足'

    let accounts = frozen
    const { trades, updatedOrders } = get().engine.match(order)
    for (const trade of trades) accounts = settleTrade(accounts, trade)
    if (type === 'market' && side === 'buy') accounts = refundMarketBuyRemainder(accounts, userId)

    const orders    = mergeOrders(get().orders, updatedOrders)
    const allTrades = [...trades, ...get().trades].sort((a, b) => b.createdAt - a.createdAt)
    const lastPrice = trades.at(-1)?.price ?? lp
    const nextPrices = { ...get().lastPrices, [symbol]: lastPrice }

    set({ accounts, orders, trades: allTrades, lastPrices: nextPrices })
    persist({ ...toPersisted(get()), accounts, orders, trades: allTrades, lastPrices: nextPrices })
    return null
  },

  cancelOrder: (orderId) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    const target = get().orders.find((o) => o.id === orderId)
    if (!target) return '订单不存在'
    if (target.userId !== userId) return '只能撤销自己的订单'
    if (target.status !== 'open' && target.status !== 'partial') return '订单无法撤销'

    const lp        = get().lastPrices[target.symbol] ?? 0
    const cancelled = get().engine.cancel(target)
    const accounts  = releaseOrderFreeze(get().accounts, cancelled, lp)
    const orders    = mergeOrders(get().orders, [cancelled])
    set({ accounts, orders })
    persist({ ...toPersisted(get()), accounts, orders })
    return null
  },

  openFuturesPosition: ({ side, size, leverage }) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    if (size <= 0) return '合约数量必须大于 0'
    if (leverage < 1 || leverage > 125) return '杠杆倍数 1-125x'

    const symbol    = get().selectedSymbol
    const markPrice = get().lastPrices[symbol] ?? SYMBOL_CONFIG[symbol].seedPrice
    const initialMargin  = calcInitialMargin(size, markPrice, leverage)
    const maintenanceMargin = calcMaintenanceMargin(size, markPrice)
    const liquidationPrice  = calcLiquidationPrice(side, markPrice, leverage)

    // Check balance
    const accounts = structuredClone(get().accounts)
    const account  = accounts[userId]
    if (!account) return '账户不存在'
    const bal = account.balances[QUOTE_ASSET] ?? { available: 0, frozen: 0 }
    if (bal.available < initialMargin) return `余额不足，需要 ${initialMargin} USDT 保证金`

    bal.available = round(bal.available - initialMargin, 2)
    bal.frozen    = round(bal.frozen    + initialMargin, 2)

    const position: FuturesPosition = {
      id: createId('fpos'), userId, symbol, side, size: round(size, 8),
      entryPrice: markPrice, markPrice, leverage,
      initialMargin, maintenanceMargin,
      liquidationPrice, unrealizedPnl: 0,
      status: 'open', createdAt: Date.now(),
    }

    const nextPositions = [position, ...get().futuresPositions]
    set({ accounts, futuresPositions: nextPositions })
    persist({ ...toPersisted(get()), accounts, futuresPositions: nextPositions })
    return null
  },

  closeFuturesPosition: (positionId) => {
    const userId = get().currentUserId
    if (!userId) return '请先登录'
    const pos = get().futuresPositions.find((p) => p.id === positionId)
    if (!pos) return '仓位不存在'
    if (pos.userId !== userId) return '只能平自己的仓位'
    if (pos.status !== 'open') return '仓位已关闭'

    const markPrice    = get().lastPrices[pos.symbol] ?? pos.markPrice
    const realizedPnl  = calcRealizedPnl(pos, markPrice, pos.size)
    const returned     = round(Math.max(0, pos.initialMargin + realizedPnl), 2)

    const accounts = structuredClone(get().accounts)
    const account  = accounts[userId]
    if (account) {
      const bal = account.balances[QUOTE_ASSET] ?? { available: 0, frozen: 0 }
      bal.frozen    = round(Math.max(0, bal.frozen - pos.initialMargin), 2)
      bal.available = round(bal.available + returned, 2)
    }

    const closed: FuturesPosition = {
      ...pos, status: 'closed', markPrice, realizedPnl, unrealizedPnl: calcUnrealizedPnl(pos, markPrice), closedAt: Date.now(),
    }
    const nextPositions = get().futuresPositions.filter((p) => p.id !== positionId)
    const nextHistory   = [closed, ...get().futuresHistory].slice(0, 100)
    set({ accounts, futuresPositions: nextPositions, futuresHistory: nextHistory })
    persist({ ...toPersisted(get()), accounts, futuresPositions: nextPositions, futuresHistory: nextHistory })
    return null
  },

  setFuturesLeverage: (symbol, leverage) => {
    const nextLeverage = { ...get().futuresLeverage, [symbol]: leverage }
    set({ futuresLeverage: nextLeverage })
  },
}))

function toPersisted(s: ExchangeState): ExchangePersistedState {
  return {
    users: s.users,
    accounts: s.accounts,
    orders: s.orders,
    trades: s.trades,
    deposits: s.deposits,
    transfers: s.transfers,
    lastPrices: s.lastPrices,
    futuresPositions: s.futuresPositions,
    futuresHistory: s.futuresHistory,
    fundingPayments: s.fundingPayments,
  }
}

export function isSystemUser(userId: string | null | undefined): boolean {
  return userId === SYSTEM_USER_ID
}
