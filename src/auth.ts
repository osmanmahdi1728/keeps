import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isResendConfigured } from "@/lib/config";
import { magicLinkEmailHtml, sendEmail } from "@/lib/email/send";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

// Auth.js calls new URL() on these during every render, so a malformed value
// crashes the whole app. trustHost derives the origin from request headers.
for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
  const value = process.env[key];
  if (!value) {
    continue;
  }
  try {
    new URL(value);
  } catch {
    console.warn(`Ignoring ${key}: not a valid URL.`);
    delete process.env[key];
  }
}

const providers: Provider[] = [
  Credentials({
    name: "Demo login",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) {
        return null;
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return null;
      }

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (isResendConfigured()) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        const locale = await getLocale();
        await sendEmail({
          to: identifier,
          subject: translate(locale, "magicEmailTitle"),
          html: magicLinkEmailHtml(url, locale),
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
