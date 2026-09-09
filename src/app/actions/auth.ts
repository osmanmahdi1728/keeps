"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { slugify, createToken, appUrl } from "@/lib/ids";
import { uniqueSlug } from "@/lib/slug";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { passwordResetEmailHtml, sendEmail } from "@/lib/email/send";
import {
  hashResetToken,
  isResetCooldownActive,
  isResetTokenShape,
  resetTokenExpiresAt,
} from "@/lib/password-reset";

const registrationSchema = z
  .object({
    ownerName: z.string().trim().min(2).max(80),
    shopName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),
    rewardLabel: z.string().trim().min(2).max(80),
    stampsRequired: z.coerce.number().int().min(3).max(20),
  });

export async function registerMerchant(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const parsed = registrationSchema.safeParse({
    ownerName: formData.get("ownerName"),
    shopName: formData.get("shopName"),
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    rewardLabel: formData.get("rewardLabel"),
    stampsRequired: formData.get("stampsRequired"),
  });

  if (!parsed.success) {
    return { error: translate(locale, "invalidSignup") };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: translate(locale, "passwordsMismatch") };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: translate(locale, "accountExists") };
  }

  const slug = await uniqueSlug(slugify(parsed.data.shopName));
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.ownerName,
      email: parsed.data.email,
      passwordHash,
      merchant: {
        create: {
          name: parsed.data.shopName,
          slug,
          program: {
            create: {
              rewardLabel: parsed.data.rewardLabel,
              stampsRequired: parsed.data.stampsRequired,
            },
          },
        },
      },
    },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
}

export async function loginWithPassword(formData: FormData): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: translate(locale, "invalidCredentials") };
    }
    throw error;
  }
}

export async function loginWithEmail(formData: FormData): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("resend", { email, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: translate(locale, "magicLinkError") };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
  redirect("/");
}

const resetRequestSchema = z.object({
  email: z.string().trim().email().max(120),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(72),
  confirmPassword: z.string(),
});

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const parsed = resetRequestSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
  });

  // Same outcome whether the account exists, to avoid email enumeration.
  if (!parsed.success) {
    redirect("/login/forgot?sent=1");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    const latest = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!latest || !isResetCooldownActive(latest.createdAt)) {
      const token = createToken();
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expires: resetTokenExpiresAt(),
        },
      });
      const resetUrl = `${appUrl()}/login/reset?token=${token}`;
      try {
        const result = await sendEmail({
          to: user.email,
          subject: translate(locale, "resetEmailSubject"),
          html: passwordResetEmailHtml(resetUrl, locale),
        });
        if (result.demo) {
          console.info("[keeps email demo] password reset link", resetUrl);
        }
      } catch {
        console.error("Password reset email failed.");
      }
    }
  }

  redirect("/login/forgot?sent=1");
}

export async function resetPassword(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success || !isResetTokenShape(parsed.data.token)) {
    return { error: translate(locale, "resetTokenInvalid") };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: translate(locale, "passwordsMismatch") };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record || record.expires.getTime() <= Date.now()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    }
    return { error: translate(locale, "resetTokenInvalid") };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  try {
    await signIn("credentials", {
      email: record.user.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: translate(locale, "resetFailed") };
    }
    throw error;
  }
}
