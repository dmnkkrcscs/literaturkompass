import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe subset of the NextAuth config (no Prisma adapter — Prisma isn't
 * Edge-compatible). Used by src/middleware.ts to verify the session JWT.
 * src/lib/auth.ts spreads this and adds the adapter + credentials provider
 * for the Node.js runtime (route handlers, tRPC context).
 */
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig
