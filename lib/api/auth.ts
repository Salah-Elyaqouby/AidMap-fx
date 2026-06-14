import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { forbidden, unauthorized } from '@/lib/api/response';

/** Role derived only from JWT — never from client cookies. */
export type NormalizedApiRole = 'admin' | 'staff' | 'user' | null;

export function normalizeRoleSlug(
  slug: string | null | undefined,
): NormalizedApiRole {
  if (!slug) return null;
  const n = slug.trim().toLowerCase();
  if (n === 'admin') return 'admin';
  if (n === 'operator' || n === 'field_worker') return 'staff';
  if (n === 'citizen' || n === 'user' || n === 'customer') return 'user';
  return null;
}

export type AuthContext = {
  userId: string;
  email?: string | null;
  role: NormalizedApiRole;
};

/**
 * API route handlers: use JWT from the request (Edge-compatible).
 */
export async function getAuthFromRequest(
  req: NextRequest,
): Promise<AuthContext | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) return null;

  const roleSlug = (token as { roleSlug?: string }).roleSlug;
  return {
    userId: ((token as { id?: string }).id ?? token.sub) as string,
    email: token.email,
    role: normalizeRoleSlug(roleSlug),
  };
}

/** Server Components / server actions: full session. */
export async function getSessionAuth(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as {
    id?: string;
    email?: string | null;
    roleSlug?: string | null;
  };
  const id = u.id;
  if (!id) return null;
  return {
    userId: id,
    email: u.email,
    role: normalizeRoleSlug(u.roleSlug ?? undefined),
  };
}

export async function requireAuth(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return unauthorized('يجب تسجيل الدخول');
  return auth;
}

export async function requireAdminApi(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return unauthorized('يجب تسجيل الدخول');
  if (auth.role !== 'admin') {
    return forbidden('ليس لديك صلاحية للوصول إلى هذا المورد');
  }
  return null;
}

/** Admin or field operator (not citizen-only). */
export async function requireStaffApi(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return unauthorized('يجب تسجيل الدخول');
  if (auth.role !== 'admin' && auth.role !== 'staff') {
    return forbidden('ليس لديك صلاحية للوصول إلى هذا المورد');
  }
  return null;
}

export async function requireCitizenApi(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return unauthorized('يجب تسجيل الدخول');
  if (auth.role !== 'user' && auth.role !== 'admin' && auth.role !== 'staff') {
    return forbidden('ليس لديك صلاحية للوصول إلى هذا المورد');
  }
  return null;
}
