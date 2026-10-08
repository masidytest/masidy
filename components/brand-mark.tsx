import Image from 'next/image'

interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Image
      src="/masidy-icon.svg?v=2"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      className={className}
    />
  )
}
