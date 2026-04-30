import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

// Stripe-Webhook fuer Subscription-Events.
// Setup: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in Vercel-Env.
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `Webhook Error: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db.tenant.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            stripeSubscriptionId: sub.id,
            plan: mapStripePlan(sub.items.data[0]?.price?.lookup_key ?? null),
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.tenant.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { plan: "trial", stripeSubscriptionId: null },
        });
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        // TODO: Logging/Notify
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

function mapStripePlan(lookupKey: string | null): string {
  if (!lookupKey) return "trial";
  if (lookupKey.includes("enterprise")) return "enterprise";
  if (lookupKey.includes("pro")) return "pro";
  if (lookupKey.includes("basic")) return "basic";
  return "trial";
}

// Stripe schickt POST, kein Body-Parsing
export const dynamic = "force-dynamic";
