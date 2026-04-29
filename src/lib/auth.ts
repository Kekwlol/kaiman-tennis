import { cookies, headers } from "next/headers";
import { db } from "./db";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "kt_session";
const SESSION_DAYS = 30;

export type AuthContext = {
  user: { id: string; tenantId: string; role: string; email: string; memberId: string | null; permissions: string[] };
} | null;

export async function getAuth(): Promise<AuthContext> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const u = session.user;
  return {
    user: {
      id: u.id,
      tenantId: u.tenantId,
      role: u.role,
      email: u.email,
      memberId: u.memberId,
      permissions: JSON.parse(u.permissions || "[]"),
    },
  };
}

export async function requireAuth() {
  const auth = await getAuth();
  if (!auth) throw new Error("UNAUTHORIZED");
  return auth.user;
}

export async function requireRole(roles: string[]) {
  const u = await requireAuth();
  if (!roles.includes(u.role) && u.role !== "superadmin") {
    throw new Error("FORBIDDEN");
  }
  return u;
}

export function hasPermission(user: { role: string; permissions: string[] }, perm: string) {
  if (user.role === "superadmin" || user.role === "tenantAdmin") return true;
  return user.permissions.includes(perm) || user.permissions.includes(perm.split(":")[0] + ":*");
}

function hashToken(t: string) {
  return createHash("sha256").update(t).digest("hex");
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.session.create({ data: { userId, token: hashed, expiresAt } });
  const c = await cookies();
  c.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return raw;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token: hashToken(token) } });
    c.delete(SESSION_COOKIE);
  }
}

// Tenant-Resolution aus Headers (vom proxy.ts gesetzt)
export async function getTenantFromHeaders() {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const host = h.get("x-tenant-host");
  if (!slug && !host) return null;
  return db.tenant.findFirst({
    where: slug ? { slug } : { customDomain: host! },
  });
}

// Verify timing-safe (nuetzlich für Magic-Link-Token)
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
