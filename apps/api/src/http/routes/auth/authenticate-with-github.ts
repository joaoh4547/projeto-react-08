import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export async function authenticateWithGithub(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sessions/github',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with github',
        body: z.object({
          code: z.string(),
        }),
        response: {
          201: z.object({
            token: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { code } = req.body

      const githubOauthUrl = new URL(
        'https://github.com/login/oauth/access_token',
      )

      githubOauthUrl.searchParams.set('client_id', 'Ov23liYF2ox4t9ujpjak')
      githubOauthUrl.searchParams.set(
        'client_secret',
        'edbde8648b15bec10d384cf24307acecb805a7e0',
      )
      githubOauthUrl.searchParams.set(
        'redirect_uri',
        'http://localhost:3000/api/auth/callback',
      )
      githubOauthUrl.searchParams.set('code', code)

      const gitHubAccessTokenResponse = await fetch(githubOauthUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      })
      const gitHubAccessTokenData = await gitHubAccessTokenResponse.json()

      const dataSchema = z.object({
        access_token: z.string(),
        token_type: z.string(),
        scope: z.string(),
      })

      const { access_token: gitHubAccessToken } = dataSchema.parse(
        gitHubAccessTokenData,
      )

      const githubUserResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${gitHubAccessToken}`,
        },
      })

      const githubUserData = await githubUserResponse.json()

      const githubUserDataSchema = z.object({
        id: z.number().int().transform(String),
        avatar_url: z.string().url(),
        name: z.string().nullable(),
        email: z.string().nullable(),
      })

      const {
        id: githubProviderId,
        name,
        email,
        avatar_url: avatarUrl,
      } = githubUserDataSchema.parse(githubUserData)

      if (!email) {
        throw new BadRequestError(
          'Your github account  must have an email address to authenticate.',
        )
      }

      let user = await prisma.user.findUnique({ where: { email } })

      if (!user) {
        user = await prisma.user.create({
          data: {
            name,
            email,
            avatarUrl,
          },
        })
      }

      let account = await prisma.account.findUnique({
        where: {
          provider_userId: {
            provider: 'GITHUB',
            userId: user.id,
          },
        },
      })

      if (!account) {
        account = await prisma.account.create({
          data: {
            provider: 'GITHUB',
            userId: user.id,
            providerAccountId: githubProviderId,
          },
        })
      }

      const token = await reply.jwtSign(
        { sub: user.id },
        {
          expiresIn: '7d',
          algorithm: 'HS512',
        },
      )

      return reply.status(201).send({ token })
    },
  )
}
