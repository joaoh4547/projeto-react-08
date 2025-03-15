import { projectSchema } from '@projeto-react-08/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function deleteProject(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/organization/:slug/projects/:projectId',
      {
        schema: {
          tags: ['projects'],
          summary: 'Delete a project',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            projectId: z.string().cuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (req, reply) => {
        const { slug, projectId } = req.params

        const userId = await req.getCurrentUserId()

        const { organization, membership } = await req.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        const project = await prisma.project.findUnique({
          where: { id: projectId, organizationId: organization.id },
        })

        if (!project) {
          throw new BadRequestError('Project not found')
        }

        const authProject = projectSchema.parse(project)

        if (cannot('delete', authProject)) {
          throw new UnauthorizedError(
            'You are not authorized to delete this project.',
          )
        }

        await prisma.project.delete({ where: { id: project.id } })

        reply.status(204).send()
      },
    )
}
