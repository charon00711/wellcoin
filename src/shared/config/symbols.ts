export interface SymbolConfig {
  base: string
  quote: string
  seedPrice: number
  priceStep: number
  qtyStep: number
}

export const SYMBOL_CONFIG: Record<string, SymbolConfig> = {
  'BTC/USDT':  { base: 'BTC',  quote: 'USDT', seedPrice: 68000, priceStep: 25,    qtyStep: 0.001 },
  'ETH/USDT':  { base: 'ETH',  quote: 'USDT', seedPrice: 3500,  priceStep: 2,     qtyStep: 0.01  },
  'BNB/USDT':  { base: 'BNB',  quote: 'USDT', seedPrice: 650,   priceStep: 0.5,   qtyStep: 0.1   },
  'SOL/USDT':  { base: 'SOL',  quote: 'USDT', seedPrice: 180,   priceStep: 0.1,   qtyStep: 0.1   },
  'XRP/USDT':  { base: 'XRP',  quote: 'USDT', seedPrice: 0.65,  priceStep: 0.001, qtyStep: 10    },
  'ADA/USDT':  { base: 'ADA',  quote: 'USDT', seedPrice: 0.55,  priceStep: 0.001, qtyStep: 10    },
  'DOGE/USDT': { base: 'DOGE', quote: 'USDT', seedPrice: 0.15,  priceStep: 0.0001, qtyStep: 100  },
  'AVAX/USDT': { base: 'AVAX', quote: 'USDT', seedPrice: 35,    priceStep: 0.05,  qtyStep: 0.5   },
  'DOT/USDT':  { base: 'DOT',  quote: 'USDT', seedPrice: 7,     priceStep: 0.01,  qtyStep: 1     },
  'LINK/USDT': { base: 'LINK', quote: 'USDT', seedPrice: 15,    priceStep: 0.01,  qtyStep: 0.5   },
  'LTC/USDT':  { base: 'LTC',  quote: 'USDT', seedPrice: 95,    priceStep: 0.1,   qtyStep: 0.1   },
  'UNI/USDT':  { base: 'UNI',  quote: 'USDT', seedPrice: 10,    priceStep: 0.01,  qtyStep: 1     },
  'ATOM/USDT': { base: 'ATOM', quote: 'USDT', seedPrice: 9,     priceStep: 0.01,  qtyStep: 1     },
  'FIL/USDT':  { base: 'FIL',  quote: 'USDT', seedPrice: 5,     priceStep: 0.01,  qtyStep: 1     },
  'APT/USDT':  { base: 'APT',  quote: 'USDT', seedPrice: 12,    priceStep: 0.01,  qtyStep: 1     },
  'ARB/USDT':  { base: 'ARB',  quote: 'USDT', seedPrice: 1.2,   priceStep: 0.001, qtyStep: 10    },
  'OP/USDT':   { base: 'OP',   quote: 'USDT', seedPrice: 2.5,   priceStep: 0.001, qtyStep: 5     },
  'SUI/USDT':  { base: 'SUI',  quote: 'USDT', seedPrice: 3.5,   priceStep: 0.001, qtyStep: 5     },
  'NEAR/USDT': { base: 'NEAR', quote: 'USDT', seedPrice: 6,     priceStep: 0.01,  qtyStep: 1     },
  'TRX/USDT':  { base: 'TRX',  quote: 'USDT', seedPrice: 0.12,  priceStep: 0.0001, qtyStep: 100  },
}

export const SYMBOLS = Object.keys(SYMBOL_CONFIG) as (keyof typeof SYMBOL_CONFIG)[]
export type TradingSymbol = (typeof SYMBOLS)[number]

export const QUOTE_ASSET = 'USDT'

export const ALL_ASSETS = [
  QUOTE_ASSET,
  ...Array.from(new Set(SYMBOLS.map((s) => SYMBOL_CONFIG[s].base))),
] as string[]

export function getSymbolConfig(symbol: string): SymbolConfig {
  return SYMBOL_CONFIG[symbol] ?? { base: 'BTC', quote: 'USDT', seedPrice: 68000, priceStep: 25, qtyStep: 0.001 }
}

export function assetToSymbol(asset: string): string | null {
  if (asset === QUOTE_ASSET) return null
  const pair = `${asset}/${QUOTE_ASSET}`
  return SYMBOL_CONFIG[pair] ? pair : null
}

export function getAssetPrice(asset: string, lastPrices: Record<string, number>): number {
  if (asset === QUOTE_ASSET) return 1
  const symbol = assetToSymbol(asset)
  if (!symbol) return 0
  return lastPrices[symbol] ?? getSymbolConfig(symbol).seedPrice
}
