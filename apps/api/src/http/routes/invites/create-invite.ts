import { roleSchema } from '@projeto-react-08/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function createInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/organization/:slug/invites',
      {
        schema: {
          tags: ['invites'],
          summary: 'Create a new invite',
          security: [{ bearerAuth: [] }],
          body: z.object({
            email: z.string().email(),
            role: roleSchema,
          }),
          params: z.object({
            slug: z.string(),
          }),
          response: {
            201: z.object({
              inviteId: z.string().cuid(),
            }),
          },
        },
      },
      async (req, reply) => {
        const { email, role } = req.body
        const { slug } = req.params

        const userId = await req.getCurrentUserId()

        const { organization, membership } = await req.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('create', 'Invite')) {
          throw new UnauthorizedError(
            'You are not authorized to create new invites.',
          )
        }

        const [, domain] = email

        if (
          organization.shouldAttachUsersByDomain &&
          organization.domain === domain
        ) {
          throw new BadRequestError(
            `Users with "${domain}" domain will join your organization automatically on login.`,
          )
        }

        const inviteWithSameEmail = await prisma.invite.findUnique({
          where: {
            email_organizationId: {
              email,
              organizationId: organization.id,
            },
          },
        })

        if (inviteWithSameEmail) {
          throw new BadRequestError('Invite with the same email already exists')
        }

        const memberWithSameEmail = await prisma.member.findFirst({
          where: {
            user: {
              email,
            },
            organizationId: organization.id,
          },
        })

        if (memberWithSameEmail) {
          throw new BadRequestError(
            'User with the same email already belongs to this organization',
          )
        }

        const invite = await prisma.invite.create({
          data: {
            organizationId: organization.id,
            role,
            email,
            authorId: userId,
          },
        })

        reply.status(201).send({
          inviteId: invite.id,
        })
      },
    )
}
