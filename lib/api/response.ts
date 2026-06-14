import { NextResponse } from 'next/server';

export type ApiSuccess<T> = {
  data: T;
  error: null;
  meta?: { page?: number; pageSize?: number; total?: number };
};

export type ApiError = {
  data: null;
  error: { code: string; message: string; details?: unknown };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

function json(body: ApiEnvelope<unknown>, status: number) {
  return NextResponse.json(body, { status });
}

export function ok<T>(
  data: T,
  status = 200,
  meta?: ApiSuccess<T>['meta'],
): NextResponse {
  return json({ data, error: null, meta }, status);
}

export function fail(
  message: string,
  status = 400,
  code = 'BAD_REQUEST',
  details?: unknown,
): NextResponse {
  return json({ data: null, error: { code, message, details } }, status);
}

export function unauthorized(message = 'غير مصرح'): NextResponse {
  return fail(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'ليس لديك صلاحية'): NextResponse {
  return fail(message, 403, 'FORBIDDEN');
}

export function notFound(message = 'غير موجود'): NextResponse {
  return fail(message, 404, 'NOT_FOUND');
}

export function serverError(message = 'حدث خطأ'): NextResponse {
  return fail(message, 500, 'INTERNAL_ERROR');
}
