export function round(value: number, decimals = 8): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function formatNumber(value: number, decimals = 2): string {
  return round(value, decimals).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}
