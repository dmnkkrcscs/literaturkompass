import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { NextRequest, NextResponse } from 'next/server'
import { appRouter } from '@/server/trpc/router'

const REQUEST_TIMEOUT_MS = 25_000 // 25s — well within Cloudflare's limit

async function handler(req: NextRequest) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => ({}),
      onError: ({ error }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          console.error('tRPC internal error:', error.message)
        }
      },
    })
    // Allow Cloudflare to cache GET queries briefly
    if (req.method === 'GET') {
      response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60')
    }
    return response
  } catch (err) {
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: { message: 'Request timeout' } },
        { status: 504 }
      )
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export { handler as GET, handler as POST }
