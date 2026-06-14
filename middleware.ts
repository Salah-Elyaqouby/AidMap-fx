import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { clientIp, rateLimit } from '@/lib/api/rate-limit';

const ADMIN_ONLY_PATHS = [
  '/project/projects/Medical-Services/hospitals',
  '/project/projects/education/school',
  '/project/projects/food-water/food',
  '/project/projects/food-water/water',
  '/project/projects/camp/shelters',
  '/project/projects/camp/Emergency',
  '/project/projects/institution/institutions',
  '/project/admins'
];

const PUBLIC_PATHS = [
  '/project/projects/education/school/query',
  '/project/projects/Medical-Services/home'
];

function isPublicProjectApi(pathname: string, method: string): boolean {
  if (pathname === '/api/project/places' && method === 'GET') return true;
  if (pathname === '/api/project/users/myAid' && method === 'GET') return true;
  if (pathname === '/api/project/users/requestAid' && method === 'POST') return true;
  if (pathname === '/api/project/admins/adminBeneficiary' && method === 'POST') return true;
  if (pathname === '/api/geocode') return true;
  if (pathname.startsWith('/api/project/route')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const res = NextResponse.next();

  // 1. استثناء الصفحات العامة
  if (PUBLIC_PATHS.includes(pathname)) return res;

  // 2. حماية مسارات المشروع ولوحة التحكم
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/project')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signIn = new URL('/signin', request.url);
      signIn.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      return NextResponse.redirect(signIn);
    }

    const isAdminRoute = ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path));

    // ✅ التصحيح: نقرأ roleSlug من الـ token (كما هو معرّف في authOptions)
    const roleSlug = (token as any).roleSlug as string | null | undefined;
    const isAdmin = roleSlug?.trim().toLowerCase() === 'admin';

    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return res;
  }

  // 3. حماية الـ API
  if (pathname.startsWith('/api/project/')) {
    if (isPublicProjectApi(pathname, method)) return res;
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/project/:path*', '/api/project/:path*', '/api/auth/:path*'],
};