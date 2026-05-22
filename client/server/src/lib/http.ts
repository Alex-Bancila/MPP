import type { FastifyReply } from 'fastify'
import { z, type ZodTypeAny } from 'zod'

export const sendValidationError = (reply: FastifyReply, error: z.ZodError): void => {
  reply.code(400).send({
    error: 'Validation failed',
    details: error.flatten(),
  })
}

export const parseInput = <T extends ZodTypeAny>(
  reply: FastifyReply,
  schema: T,
  input: unknown,
): z.infer<T> | null => {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    sendValidationError(reply, parsed.error)
    return null
  }

  return parsed.data
}

export const sendNotFound = (reply: FastifyReply, entity: string): void => {
  reply.code(404).send({
    error: `${entity} not found`,
  })
}
