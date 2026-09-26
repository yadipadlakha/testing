import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// TEMPORARY deploy diagnostic — remove once the env var mystery is
// resolved. Logs file/directory NAMES and env var KEY NAMES only (from the
// dotenv file's line prefixes before "="), never any value or secret.
try {
  const cwd = process.cwd();
  const cwdEntries = fs.readdirSync(cwd);
  const dotenvPath = path.join(cwd, ".env.production.local");
  const dotenvExists = fs.existsSync(dotenvPath);
  const dotenvKeys = dotenvExists
    ? fs
        .readFileSync(dotenvPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split("=")[0])
    : [];
  console.log(
    `[deploy-diagnostic-3] cwd: ${cwd}; cwdEntries: ${JSON.stringify(cwdEntries)}; dotenvExists: ${dotenvExists}; dotenvKeys: ${JSON.stringify(dotenvKeys)}; AUTH_SECRET present: ${Boolean(process.env.AUTH_SECRET)}; DATABASE_URL present: ${Boolean(process.env.DATABASE_URL)}`,
  );
} catch (e) {
  console.log(`[deploy-diagnostic-3] failed: ${String(e)}`);
}

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

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "EMPLOYEE";
  }
}

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
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
