import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/auth/admin-authorize";
import { env } from "@/env";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  basePath: "/api/auth/admin",
  trustHost: true,
  session: { strategy: "jwt" },
  secret: env.ADMIN_AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "mah-admin-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "mah-admin-csrf",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "mah-admin-callback-url",
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
        authorizeAdmin(credentials, (email) =>
          prisma.adminUser
            .findUnique({ where: { email }, include: { role: true } })
            .then((admin) =>
              admin
                ? {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    passwordHash: admin.passwordHash,
                    isActive: admin.isActive,
                    role: { key: admin.role.key, permissions: admin.role.permissions },
                  }
                : null
            )
        ),
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.permissions = (user as { permissions?: string[] }).permissions;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string | undefined;
        session.user.permissions = token.permissions as string[] | undefined;
      }
      return session;
    },
  },
});
