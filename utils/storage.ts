export const PUBLIC_BUCKET = "course-media-public";
export const PRIVATE_BUCKET = "course-media-private";

export function bucketForVisibility(visibility: string): string {
  return visibility === "private" ? PRIVATE_BUCKET : PUBLIC_BUCKET;
}

export function isLegacyUrl(value: string): boolean {
  return value.startsWith("https://");
}

export function buildStoragePath(bucket: string, objectPath: string): string {
  return `${bucket}:${objectPath}`;
}

export function parseStoragePath(value: string): { bucket: string; objectPath: string } | null {
  const idx = value.indexOf(":");
  if (idx === -1) return null;
  const bucket = value.slice(0, idx);
  const objectPath = value.slice(idx + 1);
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}
