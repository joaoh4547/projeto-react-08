import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function getProject(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organization/:slug/projects/:projectSlug',
      {
        schema: {
          tags: ['projects'],
          summary: 'Get a project details',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            projectSlug: z.string(),
          }),
          response: {
            201: z.object({
              project: z.object({
                id: z.string().cuid(),
                name: z.string(),
                description: z.string().nullish(),
                slug: z.string(),
                avatarUrl: z.string().url().nullable(),
                ownerId: z.string().cuid(),
                organizationId: z.string().cuid(),
                owner: z.object({
                  id: z.string().cuid(),
                  name: z.string().nullish(),
                  avatarUrl: z.string().nullish(),
                }),
              }),
            }),
          },
        },
      },
      async (req, reply) => {
        const { projectSlug, slug } = req.params

        const userId = await req.getCurrentUserId()

        const { organization, membership } = await req.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('get', 'Project')) {
          throw new UnauthorizedError('You are not authorized to see project.')
        }

        const project = await prisma.project.findUnique({
          where: {
            organizationId: organization.id,
            slug: projectSlug,
          },
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
            ownerId: true,
            avatarUrl: true,
            organizationId: true,
            owner: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        })

        if (!project) {
          throw new BadRequestError('Project not found.')
        }

        reply.status(201).send({ project })
      },
    )
}
