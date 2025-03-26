import { CookiesFn, getCookie } from 'cookies-next'
import ky from 'ky'

export const api = ky.create({
  prefixUrl: 'http://localhost:3333',
  hooks: {
    beforeRequest: [
      async (req) => {
        let cookieStore: CookiesFn | undefined

        if (typeof window === 'undefined') {
          const { cookies } = await import('next/headers')
          cookieStore = cookies
        }

        const token = await getCookie('token', { cookies: cookieStore })
        if (token) {
          req.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
  },
})
