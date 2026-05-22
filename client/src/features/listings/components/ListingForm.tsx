import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { type ListingFormValues } from '@/features/listings/listingSchema'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { LISTING_CATEGORIES } from '@/shared/constants/categories'
import type { Listing } from '@/shared/types/domain'

interface ListingFormProps {
  initialValue?: Listing
  onSubmit: (values: ListingFormValues) => void
  onCancel: () => void
  submitLabel: string
}

const defaultValues: ListingFormValues = {
  title: '',
  description: '',
  price: 0,
  category: 'Listening',
  photos: [''],
  status: 'Active',
}

const parsePhotos = (rawPhotos: string): string[] => {
  return rawPhotos
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
}

const serializePhotos = (photos: string[]): string => {
  return photos.join('\n')
}

interface FormShape {
  title: string
  description: string
  price: number
  category: ListingFormValues['category']
  photos: string
  status: ListingFormValues['status']
}

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must have at least 5 characters')
    .max(80, 'Title cannot exceed 80 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must have at least 20 characters')
    .max(1200, 'Description cannot exceed 1200 characters'),
  price: z
    .number({
      error: 'Price is required',
    })
    .positive('Price must be greater than 0')
    .max(200_000, 'Price is unrealistically high'),
  category: z.enum(LISTING_CATEGORIES),
  photos: z
    .string()
    .superRefine((rawPhotos, context) => {
      const photos = parsePhotos(rawPhotos)

      if (photos.length < 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one photo is required',
        })
        return
      }

      if (photos.length > 5) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'You can add up to 5 photos',
        })
        return
      }

      const urlSchema = z.url('Each photo must be a valid URL')
      photos.forEach((photo) => {
        if (!urlSchema.safeParse(photo).success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each photo must be a valid URL',
          })
        }
      })
    }),
  status: z.enum(['Active', 'Sold']),
})

export const ListingForm = ({ initialValue, onSubmit, onCancel, submitLabel }: ListingFormProps) => {
  const formDefaultValues = useMemo<FormShape>(() => {
    if (!initialValue) {
      return {
        title: defaultValues.title,
        description: defaultValues.description,
        price: defaultValues.price,
        category: defaultValues.category,
        photos: defaultValues.photos.join('\n'),
        status: defaultValues.status,
      }
    }

    return {
      title: initialValue.title,
      description: initialValue.description,
      price: initialValue.price,
      category: initialValue.category,
      photos: serializePhotos(initialValue.photos),
      status: initialValue.status,
    }
  }, [initialValue])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    defaultValues: formDefaultValues,
    resolver: zodResolver(formSchema),
  })

  return (
    <form
      className="mc-form"
      onSubmit={handleSubmit((values) => {
        onSubmit({
          ...values,
          photos: parsePhotos(values.photos),
        })
      })}
      noValidate
    >
      <Input
        label="Title"
        placeholder="Ibanez RG 7-string"
        {...register('title')}
        error={errors.title?.message}
      />

      <Textarea
        label="Description"
        placeholder="Condition, usage history, and important details"
        {...register('description')}
        error={errors.description?.message}
      />

      <div className="mc-form__row">
        <Input
          label="Price (RON)"
          type="number"
          min={1}
          step={1}
          {...register('price', {
            valueAsNumber: true,
          })}
          error={errors.price?.message}
        />

        <Select
          label="Category"
          {...register('category')}
          options={LISTING_CATEGORIES.map((category) => ({
            value: category,
            label: category,
          }))}
          error={errors.category?.message}
        />
      </div>

      <Textarea
        label="Photos"
        placeholder="Add one URL per line"
        hint="At least one valid image URL is required"
        {...register('photos')}
        error={errors.photos?.message}
      />

      <Select
        label="Status"
        {...register('status')}
        options={[
          { value: 'Active', label: 'Active' },
          { value: 'Sold', label: 'Sold' },
        ]}
        error={errors.status?.message}
      />

      <div className="mc-form__actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
