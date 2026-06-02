import crypto from "crypto";

export const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

// Maps plan key → LemonSqueezy variant ID (set via env vars)
export const PLAN_VARIANT_IDS: Record<string, string> = {
  plus: process.env.LEMONSQUEEZY_PLUS_VARIANT_ID ?? "",
  pro:  process.env.LEMONSQUEEZY_PRO_VARIANT_ID  ?? "",
};

// Monthly quota granted per plan on activation/renewal
export const PLAN_QUOTA: Record<string, { chars: number; sessions: number }> = {
  free: { chars: 0,       sessions: 0  },
  plus: { chars: 150_000, sessions: 20 },
  pro:  { chars: 600_000, sessions: 60 },
};

/** Create a hosted checkout URL via the LS Checkouts API. */
export async function createCheckout({
  variantId,
  email,
  userId,
  redirectUrl,
}: {
  variantId: string;
  email: string;
  userId: string;
  redirectUrl: string;
}): Promise<string> {
  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email,
            custom: { user_id: userId },
          },
          checkout_options: { button_color: "#FF6B35" },
          product_options: {
            redirect_url: redirectUrl,
            receipt_button_text: "Go to Brainana",
            receipt_link_url: redirectUrl,
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID ?? "" },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LemonSqueezy checkout failed: ${err}`);
  }

  const json = await res.json();
  return json.data.attributes.url as string;
}

/** Verify the HMAC-SHA256 webhook signature from LemonSqueezy. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Resolve a variant ID back to a plan key. */
export function planFromVariantId(variantId: string | number): string | null {
  const id = String(variantId);
  for (const [plan, vid] of Object.entries(PLAN_VARIANT_IDS)) {
    if (vid === id) return plan;
  }
  return null;
}

// One-time top-up packs — each maps to a separate LS variant (one-time purchase)
export const TOPUP_PACKS: Record<string, {
  label: string;
  price: string;
  chars: number;
  sessions: number;
  variantEnvKey: string;
}> = {
  chars_50k:    { label: "50K chars",    price: "$0.99", chars: 50_000,    sessions: 0,   variantEnvKey: "LEMONSQUEEZY_TOPUP_CHARS_50K_VARIANT_ID"    },
  chars_200k:   { label: "200K chars",   price: "$2.99", chars: 200_000,   sessions: 0,   variantEnvKey: "LEMONSQUEEZY_TOPUP_CHARS_200K_VARIANT_ID"   },
  chars_1m:     { label: "1M chars",     price: "$9.99", chars: 1_000_000, sessions: 0,   variantEnvKey: "LEMONSQUEEZY_TOPUP_CHARS_1M_VARIANT_ID"     },
  sessions_10:  { label: "10 sessions",  price: "$0.99", chars: 0,         sessions: 10,  variantEnvKey: "LEMONSQUEEZY_TOPUP_SESSIONS_10_VARIANT_ID"  },
  sessions_30:  { label: "30 sessions",  price: "$1.99", chars: 0,         sessions: 30,  variantEnvKey: "LEMONSQUEEZY_TOPUP_SESSIONS_30_VARIANT_ID"  },
  sessions_100: { label: "100 sessions", price: "$4.99", chars: 0,         sessions: 100, variantEnvKey: "LEMONSQUEEZY_TOPUP_SESSIONS_100_VARIANT_ID" },
};

/** Return variant ID for a top-up pack key (resolved from env). */
export function topupVariantId(packKey: string): string {
  const pack = TOPUP_PACKS[packKey];
  if (!pack) return "";
  return process.env[pack.variantEnvKey] ?? "";
}

/** Fetch the customer portal URLs for a subscription (payment method + portal). */
export async function getSubscriptionUrls(subscriptionId: string): Promise<{
  updatePaymentMethod: string;
  customerPortal: string;
} | null> {
  try {
    const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const urls = json.data?.attributes?.urls as Record<string, string> | undefined;
    return {
      updatePaymentMethod: urls?.update_payment_method ?? "",
      customerPortal:      urls?.customer_portal       ?? "",
    };
  } catch {
    return null;
  }
}

/** Cancel a subscription (takes effect at end of billing period). */
export async function cancelLemonSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: "application/vnd.api+json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Resolve a variant ID back to a top-up pack, or null if not a top-up. */
export function topupFromVariantId(variantId: string | number): typeof TOPUP_PACKS[string] | null {
  const id = String(variantId);
  for (const pack of Object.values(TOPUP_PACKS)) {
    if ((process.env[pack.variantEnvKey] ?? "") === id) return pack;
  }
  return null;
}
