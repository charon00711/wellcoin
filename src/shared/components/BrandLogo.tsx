import { APP_NAME } from '../constants/brand'

export function BrandLogo({
  size = 'md',
  showName = false,
  tagline,
}: {
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  tagline?: string
}) {
  const box = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const text = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'

  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.png"
        alt={APP_NAME}
        className={`${box} shrink-0 object-contain`}
        width={size === 'sm' ? 24 : size === 'lg' ? 40 : 32}
        height={size === 'sm' ? 24 : size === 'lg' ? 40 : 32}
      />
      {showName && (
        <div>
          <p className={`${text} font-bold text-[#eaecef]`}>{APP_NAME}</p>
          {tagline && <p className="text-xs text-[#848e9c]">{tagline}</p>}
        </div>
      )}
    </div>
  )
}
