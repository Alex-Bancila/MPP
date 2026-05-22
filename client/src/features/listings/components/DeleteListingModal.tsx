import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'

interface DeleteListingModalProps {
  isOpen: boolean
  title: string
  onCancel: () => void
  onConfirm: () => void
}

export const DeleteListingModal = ({
  isOpen,
  title,
  onCancel,
  onConfirm,
}: DeleteListingModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Delete listing"
      description={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
    >
      <div className="mc-modal__actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
