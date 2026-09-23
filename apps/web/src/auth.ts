import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId: string;
      role: "ADMIN" | "AGENT";
      name: string;
      email: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    agencyId: string;
    role: "ADMIN" | "AGENT";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          agencyId: user.agencyId,
          role: user.role,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.agencyId = (user as { agencyId: string }).agencyId;
        token.role = (user as { role: "ADMIN" | "AGENT" }).role;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.agencyId = token.agencyId;
      session.user.role = token.role;
      return session;
    },
  },
});
