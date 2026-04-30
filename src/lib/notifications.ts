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
  const n = await db.notification.findUnique({
    where: { id: notificationId },
    include: { tenant: true, member: true },
  });
  if (!n) return;
  try {
    if (n.channel === "email" && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const to = n.member?.email;
      if (!to) throw new Error("MEMBER_HAS_NO_EMAIL");
      const fromAddr = process.env.MAIL_FROM ?? `Kaiman Tennis <noreply@kaiman.studio>`;
      const subject = n.subject ?? n.template;
      const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:600px;margin:0 auto;padding:24px">
  <div style="font-size:14px;color:#888;margin-bottom:8px">${escapeHtml(n.tenant.name)}</div>
  <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>
  <div style="white-space:pre-line">${escapeHtml(n.body)}</div>
  <hr style="margin:24px 0;border:0;border-top:1px solid #eee">
  <div style="font-size:12px;color:#888">Diese E-Mail kommt von ${escapeHtml(n.tenant.name)}, eine Tennis-Plattform powered by Kaiman Tennis. Wenn du keine weiteren E-Mails erhalten m&ouml;chtest, kontaktiere deinen Vereinsadmin.</div>
</div>`;
      await resend.emails.send({ from: fromAddr, to, subject, html });
    } else {
      // Dev/Fallback: nur Log
      console.log(`[notify:${n.channel}]`, n.subject ?? n.template, "->", n.member?.email ?? n.memberId);
    }
    await db.notification.update({
      where: { id: n.id },
      data: { status: "sent", sentAt: new Date() },
    });
  } catch (e) {
    console.error("Notify dispatch failed:", e);
    await db.notification.update({
      where: { id: n.id },
      data: { status: "failed", errorMessage: (e as Error).message },
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
