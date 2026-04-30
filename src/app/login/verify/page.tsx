import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyMagicToken, createSession } from "@/lib/auth";

export default async function VerifyMagicLink({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.token) redirect("/login?error=invalid");

  const payload = verifyMagicToken(sp.token);
  if (!payload) redirect("/login?error=invalid");

  const user = await db.user.findFirst({
    where: { tenantId: payload.tenantId, email: payload.email },
  });
  if (!user) redirect("/login?error=invalid");

  await createSession(user.id);
  redirect(sp.next ?? "/admin");
}
