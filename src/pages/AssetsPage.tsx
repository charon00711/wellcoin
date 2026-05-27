import { useMemo, useState } from 'react'
import { ALL_ASSETS, QUOTE_ASSET, getAssetPrice } from '../shared/types'
import { useExchangeStore } from '../app/store/exchangeStore'
import { Button, Input, Panel, Select } from '../shared/components/ui'
import { formatNumber } from '../shared/utils/math'

export function AssetsPage() {
  const currentUserId = useExchangeStore((s) => s.currentUserId)
  const accounts = useExchangeStore((s) => s.accounts)
  const lastPrices = useExchangeStore((s) => s.lastPrices)
  const allDeposits = useExchangeStore((s) => s.deposits)
  const allTransfers = useExchangeStore((s) => s.transfers)
  const deposit = useExchangeStore((s) => s.deposit)
  const transferAsset = useExchangeStore((s) => s.transferAsset)

  const account = currentUserId ? accounts[currentUserId] ?? null : null
  const deposits = allDeposits.filter((d) => d.userId === currentUserId)
  const transfers = allTransfers.filter((t) => t.userId === currentUserId)

  const [asset, setAsset] = useState<string>(QUOTE_ASSET)
  const [amount, setAmount] = useState('1000')
  const [fromAsset, setFromAsset] = useState<string>(QUOTE_ASSET)
  const [toAsset, setToAsset] = useState<string>('BTC')
  const [transferAmount, setTransferAmount] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const totalUsdt = useMemo(() => {
    if (!account) return 0
    return ALL_ASSETS.reduce((sum, sym) => {
      const bal = account.balances[sym] ?? { available: 0, frozen: 0 }
      const total = bal.available + bal.frozen
      return sum + total * getAssetPrice(sym, lastPrices)
    }, 0)
  }, [account, lastPrices])

  const previewToAmount = useMemo(() => {
    const amt = Number(transferAmount)
    if (!amt || amt <= 0) return 0
    const fromPrice = getAssetPrice(fromAsset, lastPrices)
    const toPrice = getAssetPrice(toAsset, lastPrices)
    if (!fromPrice || !toPrice) return 0
    return (amt * fromPrice) / toPrice
  }, [transferAmount, fromAsset, toAsset, lastPrices])

  const handleDeposit = () => {
    const result = deposit(asset, Number(amount))
    setMessage(result ?? '充值成功（模拟）')
    setTimeout(() => setMessage(null), 3000)
  }

  const handleTransfer = () => {
    const result = transferAsset(fromAsset, toAsset, Number(transferAmount))
    if (result) {
      setMessage(result)
    } else {
      setMessage(`划转成功：${transferAmount} ${fromAsset} → ${formatNumber(previewToAmount, toAsset === QUOTE_ASSET ? 2 : 8)} ${toAsset}`)
      setTransferAmount('')
    }
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Panel>
        <div>
          <p className="text-xs text-[#848e9c]">账户总资产（USDT 估值）</p>
          <p className="num mt-1 text-3xl font-bold">{formatNumber(totalUsdt, 2)} USDT</p>
        </div>
      </Panel>

      <Panel title="资产明细">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#848e9c]">
                <th className="py-2 pr-8">币种</th>
                <th className="pr-8">可用</th>
                <th className="pr-8">冻结</th>
                <th className="pr-8">总计</th>
                <th>估值 USDT</th>
              </tr>
            </thead>
            <tbody>
              {ALL_ASSETS.map((sym) => {
                const bal = account?.balances[sym] ?? { available: 0, frozen: 0 }
                const dec = sym === QUOTE_ASSET ? 2 : 8
                const total = bal.available + bal.frozen
                const value = total * getAssetPrice(sym, lastPrices)
                return (
                  <tr key={sym} className="border-t border-[#2b3139]">
                    <td className="py-2 pr-8 font-semibold text-[#eaecef]">{sym}</td>
                    <td className="num pr-8">{formatNumber(bal.available, dec)}</td>
                    <td className="num pr-8 text-[#848e9c]">{formatNumber(bal.frozen, dec)}</td>
                    <td className="num pr-8">{formatNumber(total, dec)}</td>
                    <td className="num text-[#f0b90b]">{formatNumber(value, 2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="模拟充值">
          <div className="space-y-3">
            <Select value={asset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAsset(e.target.value)}>
              {ALL_ASSETS.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
            </Select>
            <Input type="number" min="0" value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} />
            <Button variant="accent" onClick={handleDeposit}>确认充值</Button>
          </div>
        </Panel>

        <Panel title="资产划转">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={fromAsset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFromAsset(e.target.value)}>
                {ALL_ASSETS.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </Select>
              <Select value={toAsset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setToAsset(e.target.value)}>
                {ALL_ASSETS.filter((sym) => sym !== fromAsset).map((sym) => (
                  <option key={sym} value={sym}>{sym}</option>
                ))}
              </Select>
            </div>
            <Input
              type="number" min="0" placeholder={`划转数量 ${fromAsset}`}
              value={transferAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferAmount(e.target.value)}
            />
            {Number(transferAmount) > 0 && (
              <p className="text-xs text-[#848e9c]">
                预计收到：
                <span className="num ml-1 text-[#eaecef]">
                  {formatNumber(previewToAmount, toAsset === QUOTE_ASSET ? 2 : 8)} {toAsset}
                </span>
              </p>
            )}
            <Button variant="accent" onClick={handleTransfer}>确认划转</Button>
          </div>
        </Panel>
      </div>

      {message && <p className="text-center text-sm text-[#02c076]">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="充值记录">
          <div className="max-h-48 overflow-auto">
            {deposits.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-[#2b3139] py-2 text-xs">
                <span className="text-[#02c076]">
                  +{formatNumber(item.amount, item.asset === QUOTE_ASSET ? 2 : 8)} {item.asset}
                </span>
                <span className="text-[#848e9c]">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {deposits.length === 0 && <p className="py-2 text-xs text-[#848e9c]">暂无充值记录</p>}
          </div>
        </Panel>

        <Panel title="划转记录">
          <div className="max-h-48 overflow-auto">
            {transfers.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-[#2b3139] py-2 text-xs">
                <span className="text-[#eaecef]">
                  {formatNumber(item.fromAmount, item.fromAsset === QUOTE_ASSET ? 2 : 8)} {item.fromAsset}
                  {' → '}
                  {formatNumber(item.toAmount, item.toAsset === QUOTE_ASSET ? 2 : 8)} {item.toAsset}
                </span>
                <span className="text-[#848e9c]">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {transfers.length === 0 && <p className="py-2 text-xs text-[#848e9c]">暂无划转记录</p>}
          </div>
        </Panel>
      </div>
    </div>
  )
}
