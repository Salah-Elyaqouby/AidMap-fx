import { getSession } from 'next-auth/react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

function normalizeRole(roleSlug: string | null | undefined): 'admin' | 'user' | null {
  if (!roleSlug) return null;
  const normalized = roleSlug.trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'citizen' || normalized === 'user') return 'user';
  return null;
}

async function getCurrentRole(): Promise<'admin' | 'user' | null> {
  // ✅ محاولة واحدة أولاً بدون delay
  const session = await getSession();

  if (session?.user) {
    const user = session.user as any;
    // ✅ التصحيح: نقرأ roleSlug فقط لأنه الاسم الصحيح المعرّف في authOptions
    const roleValue = user.roleSlug ?? null;
    console.log('[route-guards] roleSlug:', roleValue);
    return normalizeRole(roleValue);
  }

  // إذا فشلت المحاولة الأولى، نحاول مرة ثانية فقط مع تأخير بسيط
  await new Promise(resolve => setTimeout(resolve, 300));
  const retrySession = await getSession();

  if (retrySession?.user) {
    const user = retrySession.user as any;
    const roleValue = user.roleSlug ?? null;
    console.log('[route-guards] roleSlug (retry):', roleValue);
    return normalizeRole(roleValue);
  }

  console.warn('[route-guards] لم يتم العثور على session بعد محاولتين');
  return null;
}

export async function requireAdmin(router?: AppRouterInstance): Promise<boolean> {
  const role = await getCurrentRole();
  const isAdmin = role === 'admin';

  if (!isAdmin && router) {
    router.replace('/');
  }

  return isAdmin;
}

export async function requireCitizen(router?: AppRouterInstance): Promise<boolean> {
  const role = await getCurrentRole();
  const isAllowed = role === 'user' || role === 'admin';

  if (!isAllowed && router) {
    router.replace('/');
  }

  return isAllowed;
}