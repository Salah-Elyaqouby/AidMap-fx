import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { UserStatus } from "@prisma/client";

function parseRememberMe(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },

      async authorize(credentials) {
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          throw new Error(
            JSON.stringify({
              code: 400,
              message: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
            }),
          );
        }

        const rememberMe = parseRememberMe(credentials.rememberMe);

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true },
        });

        if (!user) {
          throw new Error(
            JSON.stringify({
              code: 404,
              message: "المستخدم غير موجود. نرجو التسجيل أولًا.",
            }),
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password ?? "",
        );

        if (!isPasswordValid) {
          throw new Error(
            JSON.stringify({
              code: 401,
              message: "بيانات الدخول غير صحيحة.",
            }),
          );
        }

        if (user.isTrashed) {
          throw new Error(
            JSON.stringify({
              code: 403,
              message: "هذا الحساب غير متاح.",
            }),
          );
        }

        if (user.status === UserStatus.BLOCKED) {
          throw new Error(
            JSON.stringify({
              code: 403,
              message: "تم حظر هذا الحساب. تواصل مع الإدارة.",
            }),
          );
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastSignInAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name || "Anonymous",
          roleId: user.roleId,
          roleName: user.role?.name ?? null,
          roleSlug: user.role?.slug ?? null,
          status: user.status,
          avatar: user.avatar,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          rememberMe,
        } as any;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // تحديث البيانات في الجلسة عند الطلب
      if (trigger === "update" && session?.user && typeof session.user === "object") {
        const s = session.user as Record<string, unknown>;
        if (typeof s.avatar === "string") {
          (token as any).avatar = s.avatar;
        }
        if (typeof s.name === "string") {
          (token as any).name = s.name;
        }
      }

      // إضافة بيانات المستخدم للـ Token
      if (user) {
        // التحويل الآمن لتجنب أخطاء TypeScript
        const u = user as unknown as Record<string, any>;
        
        token.id = (u.id as string) ?? token.sub;
        (token as any).roleId = u.roleId;
        (token as any).roleName = u.roleName;
        (token as any).roleSlug = u.roleSlug;
        (token as any).status = u.status;
        (token as any).avatar = u.avatar;
        (token as any).emailVerifiedAt = u.emailVerifiedAt;

        const remember = parseRememberMe(u.rememberMe);
        (token as any).rememberMe = remember;
        
        // تعديل مدة صلاحية الـ Token بناءً على خيار Remember Me
        const seconds = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
        token.exp = Math.floor(Date.now() / 1000) + seconds;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const t = token as Record<string, unknown>;
        (session.user as any).id = t.id ?? t.sub;
        (session.user as any).roleId = t.roleId;
        (session.user as any).roleName = t.roleName;
        (session.user as any).roleSlug = t.roleSlug;
        (session.user as any).status = t.status;
        (session.user as any).avatar = t.avatar;
        (session.user as any).emailVerifiedAt = t.emailVerifiedAt;
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },
};

export default authOptions;