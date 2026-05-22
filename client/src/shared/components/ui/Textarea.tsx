import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, icon, id, className, ...props }, ref) {
    const inputId = id ?? props.name
    const containerClassName = [
      'mc-field',
      'mc-field--textarea',
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
          <textarea ref={ref} id={inputId} className="mc-input mc-textarea" {...props} />
        </span>
        {error ? <span className="mc-field__error">{error}</span> : null}
        {!error && hint ? <span className="mc-field__hint">{hint}</span> : null}
      </label>
    )
  },
)
