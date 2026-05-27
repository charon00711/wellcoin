import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useExchangeStore } from '../app/store/exchangeStore'
import { APP_TAGLINE } from '../shared/constants/brand'
import { BrandLogo } from '../shared/components/BrandLogo'
import { Button, Input } from '../shared/components/ui'

export function RegisterPage() {
  const navigate  = useNavigate()
  const register  = useExchangeStore((s) => s.register)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await register(email, password)
    if (result) { setError(result); return }
    navigate('/trade')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <BrandLogo size="lg" showName tagline={APP_TAGLINE} />
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#161a1e] p-6">
          <h1 className="mb-6 text-xl font-semibold">注册</h1>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input type="email" placeholder="邮箱" value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            <Input type="password" placeholder="密码（至少 6 位）" value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
            {error && <p className="text-xs text-[#f6465d]">{error}</p>}
            <Button type="submit" variant="accent" className="w-full">注册并登录</Button>
          </form>
          <p className="mt-4 text-xs text-[#848e9c]">
            已有账号？
            <Link className="ml-1 text-[#f0b90b] hover:underline" to="/login">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
