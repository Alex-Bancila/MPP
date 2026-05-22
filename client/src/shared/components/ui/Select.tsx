import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  label: string
  value: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
  icon?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, icon, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name
  const containerClassName = ['mc-field', error ? 'mc-field--error' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <label className={containerClassName} htmlFor={inputId}>
      <span className="mc-field__label">{label}</span>
      <span className="mc-field__control">
        {icon ? <span className="mc-field__icon">{icon}</span> : null}
        <select ref={ref} id={inputId} className="mc-input mc-select" {...props}>
          {options.map((option) => {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
      </span>
      {error ? <span className="mc-field__error">{error}</span> : null}
    </label>
  )
})
