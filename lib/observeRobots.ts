import { websiteHttp } from "./security/safeFetch";
import type { RobotsObservation } from "./robotsRules";
export async function observeRobots(
  url: string,
  userAgent: string,
): Promise<RobotsObservation> {
  const target = new URL("/robots.txt", url).href;
  const base = { url: target, observedAt: new Date().toISOString() };
  try {
    const response = await websiteHttp.fetch(target, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const httpStatus = response.status;
    if (httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429)
      return { ...base, httpStatus, status: "missing" };
    if (!response.ok) return { ...base, httpStatus, status: "http_error" };
    const contentType = response.headers.get("content-type") || "";
    if (/html/i.test(contentType))
      return { ...base, httpStatus, status: "non_text" };
    const text = await response.text();
    if (text.length > 262144)
      return { ...base, httpStatus, status: "too_large" };
    if (/^\s*<(?:!doctype|html)/i.test(text))
      return { ...base, httpStatus, status: "non_text" };
    return { ...base, httpStatus, status: "ok", text };
  } catch {
    return { ...base, status: "unavailable" };
  }
}
