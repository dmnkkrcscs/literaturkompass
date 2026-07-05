import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'
import { authConfig } from './auth.config'

const AUTH_PASSWORD = process.env.AUTH_PASSWORD
if (!AUTH_PASSWORD) {
  throw new Error('AUTH_PASSWORD environment variable is not set')
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
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
})
