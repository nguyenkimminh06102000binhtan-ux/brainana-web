import { cookies } from "next/headers";
import PageLoading from "./_components/page-loading";
import { getLocale } from "@/utils/i18n";

export default async function Loading() {
  const cookieStore = await cookies();
  const activeOriginLanguage = cookieStore.get("brainana_active_origin_language")?.value ?? null;
  const loc = getLocale(activeOriginLanguage);

  return <PageLoading label={loc.app.loadingPage} />;
}
