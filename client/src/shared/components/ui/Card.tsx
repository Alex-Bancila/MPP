import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className }: CardProps) => {
  const computedClassName = ['mc-card', className ?? ''].filter(Boolean).join(' ')
  return <article className={computedClassName}>{children}</article>
}
