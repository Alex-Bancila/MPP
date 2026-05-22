import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name
  const containerClassName = [
    'mc-field',
    error ? 'mc-field--error' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={containerClassName} htmlFor={inputId}>
      <span className="mc-field__label">{label}</span>
      <span className="mc-field__control">
        {icon ? <span className="mc-field__icon">{icon}</span> : null}
        <input ref={ref} id={inputId} className="mc-input" {...props} />
      </span>
      {error ? <span className="mc-field__error">{error}</span> : null}
      {!error && hint ? <span className="mc-field__hint">{hint}</span> : null}
    </label>
  )
})
