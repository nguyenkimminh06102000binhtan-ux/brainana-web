import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/browse/:path*",
    "/library/:path*",
    "/create/:path*",
    "/community/:path*",
    "/study/:path*",
    "/u/:path*",
    "/c/:path*",
    "/settings/:path*",
    "/start/:path*",
    "/leaderboard/:path*",
    "/courses/:path*",
    "/auth/:path*",
  ],
};
