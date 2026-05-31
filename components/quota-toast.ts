import { toast } from "sonner";

export function showQuotaToast(type: "chars" | "sessions", remaining: number) {
  const isLow = type === "chars" ? remaining < 500 : remaining < 2;
  const label =
    type === "chars"
      ? `${remaining.toLocaleString()} chars remaining`
      : `${remaining} AI session${remaining !== 1 ? "s" : ""} remaining`;

  if (isLow) {
    toast.warning(label, { duration: 5000 });
  } else {
    toast(label, { duration: 4000 });
  }
}
