'use client'

import { useOrganization } from '@/lib/organizations'
import LightningBolt from '@/components/ui/LightningBolt'

interface OrgBrandProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show the org name next to the logo */
  showName?: boolean
  /** Additional className for the container */
  className?: string
}

const sizeMap = {
  sm: { logo: 'w-6 h-6', bolt: 'w-6 h-6', text: 'text-sm' },
  md: { logo: 'w-8 h-8', bolt: 'w-8 h-8', text: 'text-lg' },
  lg: { logo: 'w-12 h-12', bolt: 'w-12 h-12', text: 'text-2xl' },
}

/**
 * OrgBrand — renders the organization's logo + name, or falls back to
 * the Fuel Different lightning bolt + "Fuel Different" text.
 * 
 * Use this anywhere you'd normally hardcode the app logo/name.
 */
export default function OrgBrand({ size = 'md', showName = true, className = '' }: OrgBrandProps) {
  const { org, isDefault } = useOrganization()
  const s = sizeMap[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {org.logo_url ? (
        <img
          src={org.logo_url}
          alt={`${org.name} logo`}
          className={`${s.logo} object-contain`}
        />
      ) : (
        <LightningBolt className={s.bolt} />
      )}
      {showName && (
        <span className={`font-bold text-white ${s.text}`}>
          {org.name}
        </span>
      )}
    </div>
  )
}
