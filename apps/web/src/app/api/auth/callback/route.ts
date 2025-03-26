import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { signInWithGitHub } from '@/http/sign-in-with-github'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams

  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      {
        message: 'GitHub Oauth code was not found',
      },
      { status: 400 },
    )
  }
  const { token } = await signInWithGitHub({ code })

  const cookiesStore = await cookies()
  cookiesStore.set('token', token, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  const redirectUrl = req.nextUrl.clone()
  redirectUrl.pathname = '/'
  redirectUrl.search = ''
  return NextResponse.redirect(redirectUrl)
}
