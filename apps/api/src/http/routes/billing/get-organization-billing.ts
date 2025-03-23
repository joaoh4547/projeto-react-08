import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function getOrganizationBilling(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organizations/:slug/billing',
      {
        schema: {
          tags: ['billing'],
          summary: 'Get billing information from organization',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          response: {
            200: z.object({
              billing: z.object({
                seats: z.object({
                  amount: z.number(),
                  unit: z.number(),
                  price: z.number(),
                }),
                projects: z.object({
                  amount: z.number(),
                  unit: z.number(),
                  price: z.number(),
                }),
                total: z.number(),
              }),
            }),
          },
        },
      },
      async (req) => {
        const userId = await req.getCurrentUserId()

        const { slug } = req.params

        const { organization, membership } = await req.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('get', 'Billing')) {
          throw new UnauthorizedError(
            'You are not authorized to see billing information.',
          )
        }

        const [amountOfMembers, amountOfProjects] = await Promise.all([
          prisma.member.count({
            where: {
              organizationId: organization.id,
              role: { not: 'BILLING' },
            },
          }),

          prisma.project.count({
            where: {
              organizationId: organization.id,
            },
          }),
        ])

        const VALUE_PER_MEMBER_PRICING = 10

        const VALUE_PER_PROJECT_PRICING = 20

        const PRICE_OF_MEMBERS = amountOfMembers * VALUE_PER_MEMBER_PRICING

        const PRICE_OF_PROJECTS = amountOfProjects * VALUE_PER_PROJECT_PRICING

        return {
          billing: {
            seats: {
              amount: amountOfMembers,
              unit: VALUE_PER_MEMBER_PRICING,
              price: PRICE_OF_MEMBERS,
            },
            projects: {
              amount: amountOfProjects,
              unit: VALUE_PER_PROJECT_PRICING,
              price: PRICE_OF_PROJECTS,
            },
            total: PRICE_OF_MEMBERS + PRICE_OF_PROJECTS,
          },
        }
      },
    )
}
