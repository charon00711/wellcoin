import { useEffect, useRef } from 'react'
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { Candle, KlineInterval } from '../../../shared/types'

const INTERVALS: KlineInterval[] = ['1m', '5m', '15m', '1h']

export function KlineChart({
  candles,
  interval,
  onIntervalChange,
  className = '',
}: {
  candles: Candle[]
  interval: KlineInterval
  onIntervalChange: (interval: KlineInterval) => void
  className?: string
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#161a1e' }, textColor: '#848e9c' },
      grid: { vertLines: { color: '#1e2329' }, horzLines: { color: '#1e2329' } },
      crosshair: { mode: 0 },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#02c076',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#02c076',
      wickDownColor: '#f6465d',
    })

    chartRef.current = chart
    seriesRef.current = series

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: Math.max(containerRef.current.clientHeight, 200),
      })
    }

    const observer = new ResizeObserver(resize)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    resize()

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    seriesRef.current?.setData(
      candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    )
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  return (
    <div ref={wrapperRef} className={`flex h-full min-h-[240px] flex-col bg-[#161a1e] ${className}`}>
      <div className="flex shrink-0 items-center gap-1 border-b border-[#2b3139] px-3 py-2">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => onIntervalChange(iv)}
            className={`rounded px-2 py-0.5 text-xs transition ${
              interval === iv ? 'bg-[#f0b90b]/15 text-[#f0b90b]' : 'text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  )
}
