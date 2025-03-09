import { FastifyInstance } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  ZodFastifySchemaValidationError,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'

import { BadRequestError } from './routes/_errors/bad-request-error'
import { UnauthorizedError } from './routes/_errors/unauthorized-error'

type FastifyErrorHandler = FastifyInstance['errorHandler']

type ZodErrorType = {
  [k: string]: string[]
}

export const errorHandler: FastifyErrorHandler = (error, req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      errors: error.flatten().fieldErrors,
    })
  }
  if (hasZodFastifySchemaValidationErrors(error)) {
    const validation = error.validation as ZodFastifySchemaValidationError[]

    const errors = validation.reduce((acc, val) => {
      const fieldName = val.params.issue.path.join('.')
      if (!acc[fieldName]) {
        acc[fieldName] = []
      }
      acc[fieldName].push(val.params.issue.message)
      return acc
    }, {} as ZodErrorType)

    return reply.status(400).send({
      message: 'Validation error',
      errors,
    })
  }
  if (error instanceof BadRequestError) {
    return reply.status(400).send({
      message: error.message,
    })
  }

  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({
      message: error.message,
    })
  }

  console.error(error)

  return reply.status(500).send({ message: 'Internal Server Error' })
}
