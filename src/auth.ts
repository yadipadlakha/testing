import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeEnvLoaded } from "@/lib/runtime-env";
import type { JWT } from "next-auth/jwt";

ensureRuntimeEnvLoaded();

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "EMPLOYEE";
    };
  }
  interface User {
    role: "ADMIN" | "EMPLOYEE";
  }
}

// Not augmented via `declare module "next-auth/jwt"`: when @auth/core ends up
// nested under next-auth's own node_modules (which npm does whenever this
// project has its own top-level `nodemailer` dependency, since @auth/core
// optionally peer-depends on an older nodemailer range), TypeScript's
// `declare module` augmentation fails to resolve that subpath even though a
// plain type import of the same specifier works fine. A local intersection
// type sidesteps the issue entirely.
type AppJwt = JWT & {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required when self-hosting behind a reverse proxy or Docker's port
  // mapping (as opposed to a platform like Vercel that sets this for you) —
  // otherwise Auth.js rejects the incoming Host header as untrusted.
  // https://errors.authjs.dev#untrustedhost
  trustHost: true,
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
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      const appToken = token as AppJwt;
      if (user) {
        appToken.id = user.id as string;
        appToken.role = user.role;
      }
      return appToken;
    },
    session: ({ session, token }) => {
      const appToken = token as AppJwt;
      session.user.id = appToken.id;
      session.user.role = appToken.role;
      return session;
    },
  },
});
