import React from 'react'

export function LogoBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }[size]

  return (
    <div className={`relative rounded-full overflow-hidden shadow-md border-2 border-pink-200/80 bg-white flex items-center justify-center flex-shrink-0 ${dimensions}`}>
      <img
        src="/logo.png"
        alt="Dulces Mía Logo"
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  )
}
