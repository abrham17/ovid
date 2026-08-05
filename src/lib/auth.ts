import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "email-password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          include: { organization: true },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          partyType: user.organization.partyType,
          organizationName: user.organization.name,
          jobTitle: user.jobTitle,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.partyType = user.partyType;
        token.organizationName = user.organizationName;
        token.jobTitle = user.jobTitle;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? "";
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId;
        session.user.partyType = token.partyType as PartyType;
        session.user.organizationName = token.organizationName;
        session.user.jobTitle = token.jobTitle;
      }
      return session;
    },
  },
});
