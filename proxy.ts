import { NextResponse, type NextRequest } from "next/server";
import { rateLimitRequest, isBlockedUserAgent } from "@/utils/rate-limit";
import { updateSession } from "@/utils/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/home",
  "/browse",
  "/library",
  "/create",
  "/community",
  "/study",
  "/u",
  "/c",
  "/settings",
  "/start",
  "/leaderboard",
  "/courses",
];

const AUTH_PREFIXES = ["/login", "/signup", "/verify-email", "/auth"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function tooManyRequests(resetSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = startsWithAny(pathname, PROTECTED_PREFIXES);
  const isAuthRoute = startsWithAny(pathname, AUTH_PREFIXES);

  if (isBlockedUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.json(
      { error: "Forbidden" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const rule = isAuthRoute
    ? { limit: 20, windowSeconds: 60 }
    : { limit: 120, windowSeconds: 60 };
  const scope = isAuthRoute ? "auth" : "app";
  const limit = await rateLimitRequest(request, scope, rule);

  if (!limit.allowed) {
    return tooManyRequests(limit.resetSeconds);
  }

  if (isProtectedRoute) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/verify-email",
    "/auth/:path*",
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
  ],
};
