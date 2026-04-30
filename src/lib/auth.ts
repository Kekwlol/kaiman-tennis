import { cookies, headers } from "next/headers";
import { db } from "./db";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "kt_session";
const SESSION_DAYS = 30;
const IS_PROD = process.env.NODE_ENV === "production";

export type AuthUser = {
  id: string;
  tenantId: string;
  role: "superadmin" | "tenantAdmin" | "manager" | "member" | "guest";
  email: string;
  memberId: string | null;
  permissions: string[];
};

export async function getAuth(): Promise<AuthUser | null> {
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
    id: u.id,
    tenantId: u.tenantId,
    role: u.role as AuthUser["role"],
    email: u.email,
    memberId: u.memberId,
    permissions: JSON.parse(u.permissions || "[]"),
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const u = await getAuth();
  if (!u) redirect("/login?next=" + encodeURIComponent(await currentPath()));
  return u;
}

export async function requireRole(roles: AuthUser["role"][]): Promise<AuthUser> {
  const u = await requireAuth();
  if (u.role !== "superadmin" && !roles.includes(u.role)) {
    throw new Error("FORBIDDEN");
  }
  return u;
}

// Pruefe Tenant-Match. Wirft wenn User nicht zum aktuellen Tenant gehoert.
export async function requireTenantAdmin(tenantId: string): Promise<AuthUser> {
  const u = await requireAuth();
  if (u.role === "superadmin") return u;
  if (u.tenantId !== tenantId) throw new Error("CROSS_TENANT_FORBIDDEN");
  if (!["tenantAdmin", "manager"].includes(u.role)) throw new Error("FORBIDDEN");
  return u;
}

// Aktuelle URL fuer Redirect-After-Login
async function currentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/";
}

export function hasPermission(user: AuthUser, perm: string): boolean {
  if (user.role === "superadmin" || user.role === "tenantAdmin") return true;
  return user.permissions.includes(perm) || user.permissions.includes(perm.split(":")[0] + ":*");
}

function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.session.create({ data: { userId, token: hashed, expiresAt } });
  const c = await cookies();
  c.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    expires: expiresAt,
    path: "/",
  });
  return raw;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token: hashToken(token) } }).catch(() => {});
    c.delete(SESSION_COOKIE);
  }
}

export async function getTenantFromHeaders() {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const host = h.get("x-tenant-host");
  if (!slug && !host) return null;
  return db.tenant.findFirst({
    where: slug ? { slug } : { customDomain: host! },
  });
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Magic-Link-Login: Token signed mit App-Secret
const MAGIC_TTL_MIN = 15;

export function generateMagicToken(email: string, tenantId: string): string {
  const secret = process.env.AUTH_SECRET || "kaiman-tennis-dev-only-CHANGEME";
  const payload = `${tenantId}|${email}|${Date.now() + MAGIC_TTL_MIN * 60 * 1000}`;
  const sig = createHash("sha256").update(payload + secret).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyMagicToken(token: string): { tenantId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [tenantId, email, expiresStr, sig] = decoded.split("|");
    if (!tenantId || !email || !expiresStr || !sig) return null;
    const expires = parseInt(expiresStr);
    if (Date.now() > expires) return null;
    const secret = process.env.AUTH_SECRET || "kaiman-tennis-dev-only-CHANGEME";
    const expectedSig = createHash("sha256")
      .update(`${tenantId}|${email}|${expiresStr}` + secret)
      .digest("hex")
      .slice(0, 32);
    if (!safeEqual(sig, expectedSig)) return null;
    return { tenantId, email };
  } catch {
    return null;
  }
}

// Signed Token fuer iCal-Feed (read-only, member-bound, mit Ablauf)
const ICAL_TTL_DAYS = 365;

export function generateIcalToken(memberId: string): string {
  const secret = process.env.AUTH_SECRET || "kaiman-tennis-dev-only-CHANGEME";
  const payload = `ical|${memberId}|${Date.now() + ICAL_TTL_DAYS * 24 * 3600 * 1000}`;
  const sig = createHash("sha256").update(payload + secret).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyIcalToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [scope, memberId, expiresStr, sig] = decoded.split("|");
    if (scope !== "ical" || !memberId || !expiresStr || !sig) return null;
    if (Date.now() > parseInt(expiresStr)) return null;
    const secret = process.env.AUTH_SECRET || "kaiman-tennis-dev-only-CHANGEME";
    const expected = createHash("sha256")
      .update(`${scope}|${memberId}|${expiresStr}` + secret)
      .digest("hex")
      .slice(0, 32);
    return safeEqual(sig, expected) ? memberId : null;
  } catch {
    return null;
  }
}
