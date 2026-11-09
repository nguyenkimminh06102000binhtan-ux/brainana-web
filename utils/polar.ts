import crypto from "crypto";

const POLAR_SERVER = process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
export const POLAR_API_BASE =
  POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";

export type PaidPlan = "plus" | "pro";
export type BillingInterval = "monthly" | "yearly";

// Maps plan key + billing interval → Polar product ID (set via env vars)
export const PLAN_PRODUCT_IDS: Record<PaidPlan, Record<BillingInterval, string>> = {
  plus: {
    monthly: process.env.POLAR_PLUS_PRODUCT_ID        ?? "",
    yearly:  process.env.POLAR_PLUS_YEARLY_PRODUCT_ID ?? "",
  },
  pro: {
    monthly: process.env.POLAR_PRO_PRODUCT_ID         ?? "",
    yearly:  process.env.POLAR_PRO_YEARLY_PRODUCT_ID  ?? "",
  },
};

// Display prices — must match the prices configured on the Polar products.
export const PLAN_PRICES: Record<PaidPlan, Record<BillingInterval, string>> = {
  plus: { monthly: "$5",  yearly: "$48" },
  pro:  { monthly: "$10", yearly: "$96" },
};

// Monthly quota per plan. Yearly plans get the same monthly allowance, refilled
// every month by refresh_quota_if_due(). Chars must match plan_monthly_chars()
// in supabase/migrations/058_monthly_quota_refresh.sql.
export const PLAN_QUOTA: Record<string, { chars: number; sessions: number }> = {
  // sessions: legacy AI tutor quota — the tutor was removed, so always 0.
  free: { chars: 5_000,     sessions: 0 },
  plus: { chars: 300_000,   sessions: 0 },
  pro:  { chars: 1_000_000, sessions: 0 },
};

/** When a quota granted now should next refill (one calendar month later). */
export function nextQuotaResetAt(from = new Date()): string {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

// One-time top-up packs — each maps to a separate Polar product (one-time purchase)
export const TOPUP_PACKS: Record<string, {
  label: string;
  price: string;
  chars: number;
  sessions: number;
  productEnvKey: string;
}> = {
  chars_100k:   { label: "100K chars",   price: "$1.99",  chars: 100_000,   sessions: 0,   productEnvKey: "POLAR_TOPUP_CHARS_100K_PRODUCT_ID"   },
  chars_300k:   { label: "300K chars",   price: "$4.99",  chars: 300_000,   sessions: 0,   productEnvKey: "POLAR_TOPUP_CHARS_300K_PRODUCT_ID"   },
  chars_1m:     { label: "1M chars",     price: "$14.99", chars: 1_000_000, sessions: 0,   productEnvKey: "POLAR_TOPUP_CHARS_1M_PRODUCT_ID"     },
};

/** Return product ID for a top-up pack key (resolved from env). */
export function topupProductId(packKey: string): string {
  const pack = TOPUP_PACKS[packKey];
  if (!pack) return "";
  return process.env[pack.productEnvKey] ?? "";
}

/** Resolve a Polar product ID back to a plan key. */
export function planFromProductId(productId: string): string | null {
  if (!productId) return null;
  for (const plan of ["plus", "pro"] as const) {
    const { monthly, yearly } = PLAN_PRODUCT_IDS[plan];
    if ((monthly && monthly === productId) || (yearly && yearly === productId)) return plan;
  }
  return null;
}

/** Resolve a Polar product ID back to a top-up pack, or null if not a top-up. */
export function topupFromProductId(productId: string): typeof TOPUP_PACKS[string] | null {
  if (!productId) return null;
  for (const pack of Object.values(TOPUP_PACKS)) {
    const configuredProductId = process.env[pack.productEnvKey] ?? "";
    if (configuredProductId && configuredProductId === productId) return pack;
  }
  return null;
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function productIdFromPolarObject(data: Record<string, unknown>): string | null {
  const product = data.product as Record<string, unknown> | undefined;
  const products = data.products as Record<string, unknown>[] | undefined;
  const items = data.items as Record<string, unknown>[] | undefined;
  const firstItem = items?.[0];
  const firstItemProduct = firstItem?.product as Record<string, unknown> | undefined;

  return (
    stringFrom(data.product_id) ??
    stringFrom(product?.id) ??
    stringFrom(products?.[0]?.id) ??
    stringFrom(firstItem?.product_id) ??
    stringFrom(firstItemProduct?.id)
  );
}

function userIdFromPolarObject(data: Record<string, unknown>): string | null {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const customer = data.customer as Record<string, unknown> | undefined;
  const customerMetadata = customer?.metadata as Record<string, unknown> | undefined;

  return (
    stringFrom(metadata?.user_id) ??
    stringFrom(data.external_customer_id) ??
    stringFrom(customer?.external_id) ??
    stringFrom(customerMetadata?.user_id)
  );
}

/** Create a Polar hosted checkout URL. */
export async function createCheckout({
  productId,
  email,
  userId,
  redirectUrl,
  metadata,
}: {
  productId: string;
  email: string;
  userId: string;
  redirectUrl: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const res = await fetch(`${POLAR_API_BASE}/v1/checkouts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: [productId],
      success_url: redirectUrl,
      customer_email: email,
      external_customer_id: userId,
      metadata: { ...metadata, user_id: userId },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Polar checkout failed: ${err}`);
  }

  const json = await res.json();
  return json.url as string;
}

/** Update an existing Polar subscription to another recurring product. */
export async function updatePolarSubscriptionProduct({
  subscriptionId,
  productId,
  prorationBehavior = "invoice",
}: {
  subscriptionId: string;
  productId: string;
  prorationBehavior?: "invoice" | "prorate" | "next_period" | "reset";
}): Promise<{
  id: string;
  customerId: string;
  productId: string;
  periodEnd: string | null;
  status: string;
} | null> {
  try {
    const res = await fetch(`${POLAR_API_BASE}/v1/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        proration_behavior: prorationBehavior,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Polar subscription update failed: ${err}`);
    }

    const json = await res.json();
    const subscription = (json.subscription ?? json) as Record<string, unknown>;
    const updatedProductId = stringFrom(subscription.product_id);
    const customerId = stringFrom(subscription.customer_id);
    const id = stringFrom(subscription.id);
    if (!id || !customerId || !updatedProductId) return null;

    return {
      id,
      customerId,
      productId: updatedProductId,
      periodEnd: (subscription.current_period_end ?? null) as string | null,
      status: (subscription.status ?? "active") as string,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  }
}

/**
 * Verify a Polar webhook signature (svix-compatible format).
 * Polar sends: webhook-id, webhook-timestamp, webhook-signature headers.
 * Signed content: "{webhook-id}.{webhook-timestamp}.{raw-body}"
 * The secret is base64-encoded after stripping the "polar_whs_" prefix.
 */
export function verifyWebhookSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET ?? "";
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const signatures = webhookSignature.split(" ");

  const secretBase64 = secret.startsWith("polar_whs_")
    ? secret.slice("polar_whs_".length)
    : secret;
  const candidateSecrets = [
    Buffer.from(secretBase64, "base64"),
    Buffer.from(secret, "utf8"),
  ];

  return candidateSecrets.some((secretBytes) => {
    const computed = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    // webhook-signature may contain multiple space-separated "v1,<sig>" entries
    return signatures.some((sig) => {
      const [version, sigValue] = sig.split(",");
      if (version !== "v1" || !sigValue) return false;
      try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigValue));
      } catch {
        return false;
      }
    });
  });
}

/** Fetch the customer portal URL for a Polar subscription. */
export async function getSubscriptionUrls(subscriptionId: string): Promise<{
  updatePaymentMethod: string;
  customerPortal: string;
} | null> {
  try {
    const res = await fetch(`${POLAR_API_BASE}/v1/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const sub = await res.json();
    const customerId = sub.customer_id as string | undefined;
    if (!customerId) return null;

    // Create a short-lived customer portal session
    const sessionRes = await fetch(`${POLAR_API_BASE}/v1/customer-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customer_id: customerId }),
    });
    if (!sessionRes.ok) return null;
    const session = await sessionRes.json();
    const portalUrl = (session.customer_portal_url as string) ?? "";

    return {
      updatePaymentMethod: portalUrl,
      customerPortal: portalUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a completed checkout from Polar and return the subscription details.
 * Returns null if the checkout is not yet succeeded or the call fails.
 */
export async function fetchCompletedCheckout(checkoutId: string): Promise<{
  subscriptionId: string;
  customerId: string;
  productId: string;
  periodEnd: string | null;
  status: string;
  userId: string | null;
} | null> {
  try {
    const res = await fetch(`${POLAR_API_BASE}/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const checkout = await res.json();

    if (checkout.status !== "succeeded") return null;

    let subscriptionId = checkout.subscription_id as string | undefined;
    const metadata = checkout.metadata as Record<string, unknown> | undefined;
    const customer = checkout.customer as Record<string, unknown> | undefined;

    let sub: Record<string, unknown> | null = null;
    if (subscriptionId) {
      const subRes = await fetch(`${POLAR_API_BASE}/v1/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
        cache: "no-store",
      });
      if (!subRes.ok) return null;
      sub = await subRes.json();
    } else if (checkout.customer_id) {
      const subscriptionsRes = await fetch(
        `${POLAR_API_BASE}/v1/subscriptions?customer_id=${encodeURIComponent(checkout.customer_id)}`,
        {
          headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
          cache: "no-store",
        },
      );
      if (!subscriptionsRes.ok) return null;
      const subscriptions = await subscriptionsRes.json();
      sub =
        (subscriptions.items as Record<string, unknown>[] | undefined)?.find(
          (item) => item.checkout_id === checkoutId,
        ) ?? null;
      subscriptionId = sub?.id as string | undefined;
    }

    if (!subscriptionId || !sub) return null;

    const subscriptionCustomer = sub.customer as Record<string, unknown> | undefined;
    const subscriptionMetadata = sub.metadata as Record<string, unknown> | undefined;

    // Fetch/list subscription data to get current status and period end.
    const productId =
      (sub.product_id as string | undefined) ??
      (checkout.product_id as string | undefined);
    if (!productId) return null;

    const userId =
      ((metadata?.user_id as string | undefined) ??
        (subscriptionMetadata?.user_id as string | undefined) ??
        (checkout.external_customer_id as string | undefined) ??
        (customer?.external_id as string | undefined) ??
        (subscriptionCustomer?.external_id as string | undefined) ??
        null);
    if (!userId) return null;

    const customerId =
      ((sub.customer_id as string | undefined) ??
        (checkout.customer_id as string | undefined));
    if (!customerId) return null;

    return {
      subscriptionId,
      customerId,
      productId,
      periodEnd: (sub.current_period_end ?? null) as string | null,
      status: (sub.status ?? "active") as string,
      userId,
    };
  } catch {
    return null;
  }
}

/** Fetch a completed one-time top-up checkout from Polar. */
export async function fetchCompletedTopUpCheckout(checkoutId: string): Promise<{
  checkoutId: string;
  orderId: string | null;
  productId: string;
  userId: string;
} | null> {
  try {
    const res = await fetch(`${POLAR_API_BASE}/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const checkout = await res.json();

    if (checkout.status !== "succeeded") return null;

    const productId = productIdFromPolarObject(checkout);
    const userId = userIdFromPolarObject(checkout);
    const order = checkout.order as Record<string, unknown> | undefined;
    const orderId = stringFrom(checkout.order_id) ?? stringFrom(order?.id);

    if (!productId || !userId) return null;

    return {
      checkoutId,
      orderId,
      productId,
      userId,
    };
  } catch {
    return null;
  }
}

/** Fetch the latest Polar subscription created by a checkout. */
export async function fetchSubscriptionByCheckout(checkoutId: string): Promise<{
  subscriptionId: string;
  customerId: string;
  productId: string;
  periodEnd: string | null;
  status: string;
  userId: string | null;
} | null> {
  try {
    const checkoutRes = await fetch(`${POLAR_API_BASE}/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!checkoutRes.ok) return null;
    const checkout = await checkoutRes.json();
    if (!checkout.customer_id) return null;

    const subscriptionsRes = await fetch(
      `${POLAR_API_BASE}/v1/subscriptions?customer_id=${encodeURIComponent(checkout.customer_id)}`,
      {
        headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
        cache: "no-store",
      },
    );
    if (!subscriptionsRes.ok) return null;
    const subscriptions = await subscriptionsRes.json();
    const subscription = (subscriptions.items as Record<string, unknown>[] | undefined)?.find(
      (item) => item.checkout_id === checkoutId,
    );
    if (!subscription) return null;

    const checkoutMetadata = checkout.metadata as Record<string, unknown> | undefined;
    const subscriptionMetadata = subscription.metadata as Record<string, unknown> | undefined;
    const customer = checkout.customer as Record<string, unknown> | undefined;
    const subscriptionCustomer = subscription.customer as Record<string, unknown> | undefined;

    return {
      subscriptionId: subscription.id as string,
      customerId: subscription.customer_id as string,
      productId: subscription.product_id as string,
      periodEnd: (subscription.current_period_end ?? null) as string | null,
      status: (subscription.status ?? "active") as string,
      userId:
        ((checkoutMetadata?.user_id as string | undefined) ??
          (subscriptionMetadata?.user_id as string | undefined) ??
          (checkout.external_customer_id as string | undefined) ??
          (customer?.external_id as string | undefined) ??
          (subscriptionCustomer?.external_id as string | undefined) ??
          null),
    };
  } catch {
    return null;
  }
}

/** Cancel a Polar subscription at the end of the current billing period. */
export async function cancelPolarSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${POLAR_API_BASE}/v1/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_period_end: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
