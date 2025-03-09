import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export async function getProfile(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/profile',
      {
        schema: {
          tags: ['auth'],
          summary: 'Get current user profile',
          response: {
            200: z.object({
              user: z.object({
                id: z.string().cuid(),
                name: z.string().nullable(),
                email: z.string().email(),
                avatarUrl: z.string().url().nullable(),
              }),
            }),
          },
        },
      },
      async (req, reply) => {
        const userId = await req.getCurrentUserId()

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, avatarUrl: true },
        })

        if (!user) {
          throw new BadRequestError('User not found.')
        }

        return reply.send({ user })
      },
    )
}
