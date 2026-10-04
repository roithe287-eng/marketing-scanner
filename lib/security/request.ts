import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function normalizeIp(input: string) {
  const ip = input.trim().toLowerCase();
  if (!isIP(ip) || ip.includes("%")) return "";
  try {
    return ipaddr.process(ip).toString();
  } catch {
    return "";
  }
}
// Only Vercel's overwritten header is trusted. A self-hosted/dev request never gains
// an internal exception from a client-supplied forwarding header.
export function clientIp(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.VERCEL !== "1") return "";
  return normalizeIp(
    headers.get("x-vercel-forwarded-for") ||
      headers.get("x-forwarded-for") ||
      "",
  );
}
export function isInternal(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
) {
  const ip = clientIp(headers, env);
  if (!ip) return false;
  const allowed = (env.ALLOWED_IPS || "")
    .split(",")
    .map(normalizeIp)
    .filter(Boolean);
  return allowed.includes(ip);
}
export function requireSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== new URL(req.url).origin ||
    (fetchSite && fetchSite !== "same-origin")
  )
    throw new AccessError(403, "같은 사이트에서 다시 요청해 주세요.");
  if (
    !/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")
  )
    throw new AccessError(415, "JSON 요청만 허용됩니다.");
}
export async function readJson(req: Request, maxBytes = 16_384): Promise<any> {
  const length = Number(req.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length > maxBytes)
    throw new AccessError(413, "입력한 내용이 너무 큽니다.");
  const reader = req.body?.getReader();
  if (!reader) throw new AccessError(400, "입력 내용을 확인해 주세요.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AccessError(413, "입력한 내용이 너무 큽니다.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(400, "입력 내용을 확인해 주세요.");
  } finally {
    reader.releaseLock();
  }
}
export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      Vary: "Cookie",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof AccessError)
    return privateJson({ message: error.message }, error.status);
  if (error instanceof ZodError)
    return privateJson(
      { message: "입력한 항목의 형식과 길이를 확인해 주세요." },
      400,
    );
  // Do not send stack traces, upstream details, PII, credentials or Redis errors to clients/logs.
  console.error(
    "[service] request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return privateJson(
    { message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    503,
  );
}
