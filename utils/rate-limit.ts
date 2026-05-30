import type { NextRequest } from "next/server";
import { redis } from "@/utils/redis";

type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

const encoder = new TextEncoder();

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    vercelForwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    "unknown"
  );
}

export function isBlockedUserAgent(userAgent: string | null) {
  if (!userAgent) return true;

  return /(?:ahrefsbot|bytespider|curl|dataforseo|dotbot|go-http-client|headlesschrome|httpclient|mj12bot|python-requests|scrapy|semrushbot|wget)/i.test(
    userAgent,
  );
}

async function hashIdentifier(identifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(identifier));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export async function rateLimitRequest(
  request: NextRequest,
  scope: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const identifier = await hashIdentifier(getClientIp(request));
  const window = Math.floor(Date.now() / (rule.windowSeconds * 1000));
  const key = `rate:${scope}:${identifier}:${window}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, rule.windowSeconds + 5);
  }

  const resetSeconds = rule.windowSeconds - Math.floor((Date.now() / 1000) % rule.windowSeconds);

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetSeconds,
  };
}

export async function rateLimitUser(
  userId: string,
  scope: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / (rule.windowSeconds * 1000));
  const key = `rate:${scope}:${userId}:${window}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, rule.windowSeconds + 5);
  }

  const resetSeconds = rule.windowSeconds - Math.floor((Date.now() / 1000) % rule.windowSeconds);

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetSeconds,
  };
}
