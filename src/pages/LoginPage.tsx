import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useExchangeStore } from '../app/store/exchangeStore'
import { APP_NAME, APP_TAGLINE } from '../shared/constants/brand'
import { Button, Input } from '../shared/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const login    = useExchangeStore((s) => s.login)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result) { setError(result); return }
    navigate('/trade')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <img src="/wellcoin-icon.png" alt={APP_NAME} className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-xl font-bold">{APP_NAME}</p>
            <p className="text-xs text-[#848e9c]">{APP_TAGLINE}</p>
          </div>
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#161a1e] p-6">
          <h1 className="mb-6 text-xl font-semibold">登录</h1>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input type="email" placeholder="邮箱" value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            <Input type="password" placeholder="密码" value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
            {error && <p className="text-xs text-[#f6465d]">{error}</p>}
            <Button type="submit" variant="accent" className="w-full">登录</Button>
          </form>
          <p className="mt-4 text-xs text-[#848e9c]">
            还没有账号？
            <Link className="ml-1 text-[#f0b90b] hover:underline" to="/register">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
