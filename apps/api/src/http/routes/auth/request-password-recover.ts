import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

export async function requestPasswordRecover(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/recover',
    {
      schema: {
        tags: ['auth'],
        summary: 'Recover password',
        response: {
          201: z.null(),
        },
        body: z.object({
          email: z.string().email(),
        }),
      },
    },
    async (req, reply) => {
      const { email } = req.body

      const userFromEmail = await prisma.user.findUnique({ where: { email } })

      if (!userFromEmail) {
        return reply.status(201).send()
      }

      const { id: token } = await prisma.token.create({
        data: {
          type: 'PASSWORD_RECOVER',
          userId: userFromEmail.id,
        },
      })

      console.log(`Recover password code: ${token}`)
      return reply.status(201).send()
    },
  )
}
