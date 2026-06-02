"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createCheckout, PLAN_VARIANT_IDS, topupVariantId, cancelLemonSubscription } from "@/utils/lemonsqueezy";

export async function startCheckout(plan: "plus" | "pro") {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const variantId = PLAN_VARIANT_IDS[plan];
  if (!variantId) throw new Error(`No variant ID configured for plan: ${plan}`);

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectUrl = `${origin}/billing?upgraded=1`;

  const checkoutUrl = await createCheckout({
    variantId,
    email: user.email ?? "",
    userId: user.id,
    redirectUrl,
  });

  redirect(checkoutUrl);
}

export async function startTopUpCheckout(packKey: string) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const variantId = topupVariantId(packKey);
  if (!variantId) throw new Error(`No variant ID configured for top-up pack: ${packKey}`);

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectUrl = `${origin}/billing?topup=1`;

  const checkoutUrl = await createCheckout({
    variantId,
    email: user.email ?? "",
    userId: user.id,
    redirectUrl,
  });

  redirect(checkoutUrl);
}

export async function cancelSubscription() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("lemon_subscription_id")
    .eq("user_id", user.id)
    .single();

  const subscriptionId = sub?.lemon_subscription_id;
  if (!subscriptionId) throw new Error("No active subscription found");

  const ok = await cancelLemonSubscription(subscriptionId);
  if (!ok) throw new Error("Failed to cancel subscription — please try again or contact support");

  redirect("/billing?cancelled=1");
}
