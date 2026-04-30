// Wrapper fuer Server Actions: erzwingt Auth + Tenant-Match.
// Eliminiert IDOR-Bugs durch vergessene tenantId-Checks.
import { getAuth, requireTenantAdmin, type AuthUser } from "./auth";
import { requireCurrentTenant } from "./tenant-context";
import { audit } from "./audit";
import type { Tenant } from "@prisma/client";

const ALLOW_DEMO =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_TENANT_OVERRIDE === "1";

export type ActionContext = {
  tenant: Tenant;
  user: AuthUser | null; // null im Demo-Modus
};

// Direkt-Variante (haeufiger genutzt da Server Actions als async function definiert sind)
export async function authedAdmin(): Promise<ActionContext> {
  const tenant = await requireCurrentTenant();

  // Production: Auth zwingend
  if (!ALLOW_DEMO) {
    const user = await requireTenantAdmin(tenant.id);
    return { tenant, user };
  }

  // Demo-Modus: Auth optional, aber falls eingeloggt -> Tenant-Match pruefen
  const auth = await getAuth();
  if (auth && auth.role !== "superadmin" && auth.tenantId !== tenant.id) {
    throw new Error("CROSS_TENANT_FORBIDDEN");
  }
  return { tenant, user: auth };
}

// Pruefe ob ein Datensatz wirklich zum aktuellen Tenant gehoert (verhindert IDOR)
export async function assertTenantOwns<T extends { tenantId: string } | null>(
  record: T,
  expectedTenantId: string,
): Promise<NonNullable<T>> {
  if (!record) throw new Error("NOT_FOUND");
  if (record.tenantId !== expectedTenantId) throw new Error("CROSS_TENANT_FORBIDDEN");
  return record as NonNullable<T>;
}

// Helper fuer Audit-Logs in Mutations
export async function logMutation(
  ctx: ActionContext,
  entity: string,
  entityId: string,
  action: "create" | "update" | "delete",
  before?: unknown,
  after?: unknown,
) {
  await audit({
    tenantId: ctx.tenant.id,
    userId: ctx.user?.id ?? null,
    entity,
    entityId,
    action,
    before,
    after,
  });
}
