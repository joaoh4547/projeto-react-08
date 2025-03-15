import { roleSchema } from '@projeto-react-08/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'

export async function getMembership(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organizations/:slug/membership',
      {
        schema: {
          params: z.object({
            slug: z.string(),
          }),
          response: {
            200: z.object({
              membership: z.object({
                role: roleSchema,
                id: z.string().cuid(),
                organizationId: z.string().cuid(),
              }),
            }),
          },
          tags: ['organizations'],
          summary: 'Get user  membership on organization',
          security: [{ bearerAuth: [] }],
        },
      },
      async (req) => {
        const { slug } = req.params

        const { membership } = await req.getUserMembership(slug)
        return {
          membership: {
            role: membership.role,
            id: membership.id,
            organizationId: membership.organizationId,
          },
        }
      },
    )
}
