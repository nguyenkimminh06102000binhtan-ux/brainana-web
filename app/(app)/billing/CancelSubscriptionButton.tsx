"use client";

import { cancelSubscription } from "@/app/actions/billing";

export function CancelSubscriptionButton({ expiresAt }: { expiresAt: string | null }) {
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const confirmMessage = expiryDate
    ? `Cancel your subscription?\n\nYou'll keep your current plan and remaining characters and AI sessions until ${expiryDate}. On that date your balance resets to 0 and your account reverts to the Free plan.`
    : "Cancel your subscription?\n\nYou'll keep access until the end of your current billing period. After that, your character and AI session balance resets to 0 and your account reverts to the Free plan.";

  return (
    <form
      action={cancelSubscription}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="flex w-full items-center justify-between rounded-lg border border-ink/10 bg-paper px-4 py-3 text-left transition hover:border-red-300 hover:bg-red-50 active:translate-y-[1px]"
      >
        <div>
          <p className="font-manrope text-sm font-[700] text-red-500">Cancel subscription</p>
          <p className="font-manrope text-xs text-ink-3">
            {expiryDate
              ? `Balance resets to 0 on ${expiryDate}`
              : "Balance resets to 0 at end of billing period"}
          </p>
        </div>
        <span className="font-manrope text-xs text-ink-3">→</span>
      </button>
    </form>
  );
}
