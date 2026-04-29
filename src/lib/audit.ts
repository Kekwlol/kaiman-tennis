import { db } from "./db";

export async function audit(input: {
  tenantId: string;
  userId?: string | null;
  entity: string;
  entityId: string;
  action: "create" | "update" | "delete" | "view";
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  const diff =
    input.before !== undefined || input.after !== undefined
      ? JSON.stringify({ before: input.before, after: input.after })
      : null;
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      diff,
      ip: input.ip ?? null,
    },
  });
}
