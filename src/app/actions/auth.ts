"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/ids";
import { uniqueSlug } from "@/lib/slug";

const registrationSchema = z
  .object({
    ownerName: z.string().trim().min(2).max(80),
    shopName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),
    rewardLabel: z.string().trim().min(2).max(80),
    stampsRequired: z.coerce.number().int().min(3).max(20),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function registerMerchant(
  formData: FormData,
): Promise<{ error: string } | undefined> {
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
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check your account and shop details.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "An account already exists for that email." };
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
      return { error: "Those credentials did not match a merchant account." };
    }
    throw error;
  }
}

export async function loginWithEmail(formData: FormData): Promise<{ error: string } | undefined> {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("resend", { email, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Could not send a sign-in email. Check Resend configuration." };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
  redirect("/");
}
