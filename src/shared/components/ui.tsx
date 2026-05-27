import type { ReactNode } from 'react'

// ─── Panel ────────────────────────────────────────────────────────────────────
export function Panel({
  title, children, className = '', noPadding = false,
}: { title?: string; children: ReactNode; className?: string; noPadding?: boolean }) {
  return (
    <section
      className={`rounded-lg border border-[#2b3139] bg-[#161a1e] ${className}`}
    >
      {title && (
        <div className="border-b border-[#2b3139] px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#848e9c]">{title}</h2>
        </div>
      )}
      <div className={noPadding ? 'min-h-0' : 'p-3'}>{children}</div>
    </section>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'buy' | 'sell' | 'ghost' | 'accent'

export function Button({
  children, variant = 'ghost', className = '', size = 'md', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
}) {
  const styles: Record<BtnVariant, string> = {
    buy:    'bg-[#02c076] hover:bg-[#04d884] text-black font-semibold',
    sell:   'bg-[#f6465d] hover:bg-[#f7627a] text-white  font-semibold',
    ghost:  'bg-[#2b3139] hover:bg-[#363d45] text-[#eaecef]',
    accent: 'bg-[#f0b90b] hover:bg-[#f8ca2b] text-black font-semibold',
  }
  const sizes: Record<string, string> = {
    sm: 'px-2 py-1 text-xs rounded',
    md: 'px-3 py-2 text-sm rounded-md',
    lg: 'px-4 py-3 text-sm rounded-md',
  }
  return (
    <button
      className={`transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-md border border-[#2b3139] bg-[#1e2329] px-3 py-2 text-sm text-[#eaecef] placeholder-[#848e9c] outline-none focus:border-[#f0b90b] transition"
      {...props}
    />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-md border border-[#2b3139] bg-[#1e2329] px-3 py-2 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] transition"
      {...props}
    />
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({
  tabs, active, onChange, scrollable = false,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
  scrollable?: boolean
}) {
  return (
    <div className={`flex gap-1 ${scrollable ? 'overflow-x-auto scrollbar-none' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-3 py-1.5 text-sm rounded transition ${
            active === tab.id
              ? 'bg-[#f0b90b]/15 text-[#f0b90b] font-medium'
              : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#2b3139]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── MobilePanelTabs (H5 trading sub-tabs) ────────────────────────────────────
export function MobilePanelTabs({
  tabs, active, onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex shrink-0 border-b border-[#2b3139] bg-[#161a1e]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2.5 text-xs font-medium transition ${
            active === tab.id
              ? 'border-b-2 border-[#f0b90b] text-[#f0b90b]'
              : 'text-[#848e9c]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── SideTabs (Buy / Sell) ────────────────────────────────────────────────────
export function SideTabs({
  active, onChange,
}: { active: 'buy' | 'sell'; onChange: (s: 'buy' | 'sell') => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md bg-[#1e2329] p-1">
      <button
        onClick={() => onChange('buy')}
        className={`rounded py-2 text-sm font-medium transition ${
          active === 'buy' ? 'bg-[#02c076] text-black' : 'text-[#848e9c] hover:text-[#02c076]'
        }`}
      >
        买入
      </button>
      <button
        onClick={() => onChange('sell')}
        className={`rounded py-2 text-sm font-medium transition ${
          active === 'sell' ? 'bg-[#f6465d] text-white' : 'text-[#848e9c] hover:text-[#f6465d]'
        }`}
      >
        卖出
      </button>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeTone = 'buy' | 'sell' | 'neutral' | 'warn'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    buy:     'bg-[#02c076]/15 text-[#02c076]',
    sell:    'bg-[#f6465d]/15 text-[#f6465d]',
    neutral: 'bg-[#2b3139] text-[#848e9c]',
    warn:    'bg-[#f0b90b]/15 text-[#f0b90b]',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  )
}

// ─── DataRow ──────────────────────────────────────────────────────────────────
export function DataRow({ label, value, tone }: { label: string; value: ReactNode; tone?: 'buy' | 'sell' | 'neutral' }) {
  const valueClass = tone === 'buy' ? 'text-[#02c076]' : tone === 'sell' ? 'text-[#f6465d]' : 'text-[#eaecef]'
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[#848e9c]">{label}</span>
      <span className={`num font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ className = '' }: { className?: string }) {
  return <div className={`my-3 border-t border-[#2b3139] ${className}`} />
}
