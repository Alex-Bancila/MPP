import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { reviewSchema, type ReviewFormValues } from '@/features/reviews/reviewSchema'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'

interface ReviewFormProps {
  onSubmit: (values: ReviewFormValues) => void
  initialValues?: ReviewFormValues
  submitLabel?: string
}

export const ReviewForm = ({ onSubmit, initialValues, submitLabel = 'Add Review' }: ReviewFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: initialValues?.rating ?? 5,
      title: initialValues?.title ?? '',
      body: initialValues?.body ?? '',
    },
  })

  useEffect(() => {
    reset({
      rating: initialValues?.rating ?? 5,
      title: initialValues?.title ?? '',
      body: initialValues?.body ?? '',
    })
  }, [initialValues, reset])

  return (
    <form className="mc-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mc-form__row">
        <Input
          label="Rating"
          type="number"
          min={1}
          max={5}
          step={1}
          {...register('rating', { valueAsNumber: true })}
          error={errors.rating?.message}
        />
        <Input
          label="Title"
          placeholder="Short summary"
          {...register('title')}
          error={errors.title?.message}
        />
      </div>

      <Textarea
        label="Review"
        placeholder="What was good, what should people know?"
        {...register('body')}
        error={errors.body?.message}
      />

      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
