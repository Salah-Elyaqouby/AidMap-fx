/**
 * @deprecated Import from `@/lib/api/auth` instead.
 * Kept for gradual migration of legacy imports.
 */
export {
  getAuthFromRequest,
  getSessionAuth,
  normalizeRoleSlug,
  requireAdminApi,
  requireAuth,
  requireCitizenApi,
  requireStaffApi,
  type AuthContext,
  type NormalizedApiRole,
} from '@/lib/api/auth';
