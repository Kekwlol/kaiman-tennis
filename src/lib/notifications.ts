import { db } from "./db";

// Adapter-Pattern: Production schickt via Resend/Twilio,
// Dev schreibt in DB + console.log (kein Mail-Spam beim Entwickeln).

type NotifInput = {
  tenantId: string;
  memberId?: string | null;
  channel: "email" | "sms" | "push" | "inapp";
  template: string;
  subject?: string;
  body: string;
  scheduledFor?: Date;
  meta?: Record<string, unknown>;
};

export async function notify(input: NotifInput) {
  const n = await db.notification.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId ?? null,
      channel: input.channel,
      template: input.template,
      subject: input.subject ?? null,
      body: input.body,
      scheduledFor: input.scheduledFor ?? null,
      metaJson: JSON.stringify(input.meta ?? {}),
    },
  });

  // Sofort senden (in Production: Queue + Worker)
  if (!input.scheduledFor || input.scheduledFor <= new Date()) {
    await dispatch(n.id);
  }
  return n;
}

async function dispatch(notificationId: string) {
  const n = await db.notification.findUnique({ where: { id: notificationId } });
  if (!n) return;
  try {
    if (process.env.NODE_ENV === "production" && process.env.RESEND_API_KEY) {
      // TODO: Resend / Twilio
      // Hier waere der Aufruf an Resend (Mail) oder Twilio (SMS).
    } else {
      console.log(`[notify:${n.channel}]`, n.subject ?? n.template, "->", n.memberId);
    }
    await db.notification.update({
      where: { id: n.id },
      data: { status: "sent", sentAt: new Date() },
    });
  } catch (e) {
    await db.notification.update({
      where: { id: n.id },
      data: { status: "failed", errorMessage: (e as Error).message },
    });
  }
}

// Bulk-Versand für Newsletter
export async function sendNewsletter(newsletterId: string) {
  const nl = await db.newsletter.findUnique({ where: { id: newsletterId } });
  if (!nl || nl.sentAt) return;

  const audience = JSON.parse(nl.audienceJson || "{}") as { groups?: string[] };
  const recipients = await db.member.findMany({
    where: {
      tenantId: nl.tenantId,
      status: "active",
      ...(audience.groups?.length ? { group: { in: audience.groups } } : {}),
    },
  });

  for (const r of recipients) {
    await notify({
      tenantId: nl.tenantId,
      memberId: r.id,
      channel: nl.channel as "email" | "sms",
      template: "newsletter",
      subject: nl.subject,
      body: nl.bodyMd,
      meta: { newsletterId: nl.id },
    });
  }

  await db.newsletter.update({
    where: { id: nl.id },
    data: { sentAt: new Date(), recipientCount: recipients.length },
  });
}
