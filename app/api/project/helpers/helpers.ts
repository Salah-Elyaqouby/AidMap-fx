export type AppRole = "admin" | "user";

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
  beneficiary?: {
    id: string;
    name: string;
    phone?: string | null;
    numberOfFamily?: number | null;
    userId?: string | null;
  } | null;
};

function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") return "admin";
  if (normalized === "citizen" || normalized === "user") return "user";

  return null;
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function getCurrentRole(): AppRole | null {
  const user = getCurrentUser();
  return normalizeRole(user?.role);
}

export function isAdmin(): boolean {
  return getCurrentRole() === "admin";
}

export function isCitizen(): boolean {
  return getCurrentRole() === "user";
}

///////////////////////
// ✅ الإضافة الجديدة
///////////////////////
export function saveCurrentUser(user: CurrentUser) {
  if (typeof window === "undefined") return;

  const normalizedRole = normalizeRole(user.role);

  // حفظ في localStorage
  localStorage.setItem(
    "user",
    JSON.stringify({
      ...user,
      role: normalizedRole ?? user.role,
    })
  );

  // Role/identity for API authorization must come from the NextAuth JWT only — never from client cookies.
}