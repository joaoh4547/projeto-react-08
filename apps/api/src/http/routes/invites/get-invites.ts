import { roleSchema } from '@projeto-react-08/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function getInvites(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organization/:slug/invites',
      {
        schema: {
          tags: ['invites'],
          summary: 'Get all organization invites',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          response: {
            200: z.object({
              invites: z.array(
                z.object({
                  id: z.string(),
                  createdAt: z.date(),
                  role: roleSchema,
                  email: z.string(),
                  author: z
                    .object({
                      name: z.string().nullable(),
                      id: z.string(),
                    })
                    .nullable(),
                }),
              ),
            }),
          },
        },
      },
      async (req) => {
        const { slug } = req.params

        const userId = await req.getCurrentUserId()

        const { organization, membership } = await req.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('get', 'Invite')) {
          throw new UnauthorizedError(
            'You are not authorized to get organization invites.',
          )
        }

        const invites = await prisma.invite.findMany({
          where: {
            organizationId: organization.id,
          },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return { invites }
      },
    )
}
