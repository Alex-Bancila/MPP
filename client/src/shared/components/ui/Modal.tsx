import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
}

export const Modal = ({ isOpen, title, description, onClose, children }: ModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div className="mc-modal__backdrop" onClick={onClose} role="presentation">
      <section
        className="mc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-modal-title"
        aria-describedby={description ? 'mc-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mc-modal__title" id="mc-modal-title">
          {title}
        </h2>
        {description ? (
          <p className="mc-modal__description" id="mc-modal-description">
            {description}
          </p>
        ) : null}
        {children}
      </section>
    </div>,
    document.body,
  )
}
