import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export async function acceptInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/invites/:inviteId/accept',
      {
        schema: {
          tags: ['invites'],
          security: [{ bearerAuth: [] }],
          summary: 'Accept an invite',
          params: z.object({
            inviteId: z.string().cuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (req, reply) => {
        const userId = await req.getCurrentUserId()
        const { inviteId } = req.params

        const invite = await prisma.invite.findUnique({
          where: {
            id: inviteId,
          },
        })

        if (!invite) {
          throw new BadRequestError('Invite not found or expired')
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        })

        if (!user) {
          throw new BadRequestError('User not found.')
        }

        if (invite.email !== user.email) {
          throw new BadRequestError('User does not have access to this invite')
        }

        await prisma.$transaction([
          prisma.member.create({
            data: {
              organizationId: invite.organizationId,
              userId,
              role: invite.role,
            },
          }),

          prisma.invite.delete({
            where: {
              id: inviteId,
            },
          }),
        ])

        return reply.status(204).send()
      },
    )
}
