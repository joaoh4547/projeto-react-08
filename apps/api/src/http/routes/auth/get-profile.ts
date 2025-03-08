import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

export async function getProfile(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
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
      const { sub } = await req.jwtVerify<{ sub: string }>()

      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return reply.send({ user })
    },
  )
}
