import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  icon?: ReactNode
}

export const Button = ({
  variant = 'primary',
  fullWidth = false,
  icon,
  className,
  children,
  ...props
}: ButtonProps) => {
  const computedClassName = [
    'mc-button',
    `mc-button--${variant}`,
    fullWidth ? 'mc-button--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={computedClassName} {...props}>
      {icon ? <span className="mc-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
