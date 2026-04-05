import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
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
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (credentials?.password === AUTH_PASSWORD) {
          // Get or create the single user
          let user = await db.user.findFirst()
          if (!user) {
            user = await db.user.create({
              data: {
                name: 'Literaturkompass User',
                email: 'literaturkompass@localhost',
              },
            })
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
})
