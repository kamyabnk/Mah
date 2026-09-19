import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeCustomer } from "@/lib/auth/customer-authorize";
import { env } from "@/env";

export const {
  handlers: customerHandlers,
  auth: customerAuth,
  signIn: customerSignIn,
  signOut: customerSignOut,
} = NextAuth({
  basePath: "/api/auth/customer",
  trustHost: true,
  session: { strategy: "jwt" },
  secret: env.CUSTOMER_AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "mah-customer-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "mah-customer-csrf",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "mah-customer-callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authorizeCustomer(credentials, (email) =>
          prisma.customer.findUnique({ where: { email } })
        ),
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
