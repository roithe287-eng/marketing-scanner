import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { getOpenAI } from "../lib/openaiClient";
import { getRedisClient, getRedisConfig } from "../lib/redisClient";
import { getSiteUrl, getScannerContactUrl } from "../lib/siteConfig";
import { isShareStoreAvailable } from "../lib/shareStore";
import { middleware } from "../middleware";

const keys = ["OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN", "NEXT_PUBLIC_SITE_URL", "SCANNER_CONTACT_URL", "ALLOWED_IPS", "INTERNAL_ACCESS_KEY"];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => delete process.env[key]);
});
afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test("all AI modules load without credentials; the first AI call still requires a key", async () => {
  await Promise.all([
    import("../lib/analyzeMarketing"), import("../lib/analyzeDiscoverability"),
    import("../lib/analyzeDeepDive"), import("../lib/analyzeKeywordRank"),
    import("../lib/analyzeCitation"), import("../lib/industryClassifier"),
    import("../lib/competitorAnalysis"),
  ]);
  assert.throws(getOpenAI, /OPENAI_API_KEY/);
});

test("Redis aliases use complete pairs, and share the same optional client", () => {
  assert.equal(getRedisClient(), null);
  assert.equal(isShareStoreAvailable(), false);
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
  process.env.KV_REST_API_TOKEN = "test-kv-token";
  assert.equal(getRedisConfig(), null, "partial credentials must never be mixed");
  process.env.KV_REST_API_URL = "https://kv.example";
  assert.deepEqual(getRedisConfig(), { url: "https://kv.example", token: "test-kv-token" });
  assert.equal(isShareStoreAvailable(), true);
  const kvClient = getRedisClient();
  assert.equal(getRedisClient(), kvClient);
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-upstash-token";
  assert.deepEqual(getRedisConfig(), { url: "https://upstash.example", token: "test-upstash-token" });
  assert.notEqual(getRedisClient(), kvClient);
});

test("shared metadata and scanner contact have valid URL fallbacks", () => {
  assert.equal(getSiteUrl(), "https://www.mktscanner.com");
  process.env.NEXT_PUBLIC_SITE_URL = "https://scanner.example/path/";
  assert.equal(getSiteUrl(), "https://scanner.example");
  process.env.SCANNER_CONTACT_URL = "https://scanner.example/contact";
  assert.equal(getScannerContactUrl(), "https://scanner.example/contact");
  process.env.SCANNER_CONTACT_URL = "javascript:alert(1)";
  assert.equal(getScannerContactUrl(), "https://scanner.example");
  process.env.NEXT_PUBLIC_SITE_URL = "invalid";
  assert.equal(getSiteUrl(), "https://www.mktscanner.com");
});

test("IP and cookie protection both apply; shared reports remain public", () => {
  process.env.ALLOWED_IPS = "203.0.113.10";
  process.env.INTERNAL_ACCESS_KEY = "local-test-access";
  const request = (path: string, ip: string, cookie = "") => new NextRequest(`https://scanner.example${path}`, {
    headers: { "x-forwarded-for": ip, cookie },
  });
  assert.equal(middleware(request("/api/analyze", "203.0.113.11", "ms_internal=local-test-access")).status, 401);
  assert.equal(middleware(request("/api/analyze", "203.0.113.10")).status, 401);
  assert.equal(middleware(request("/api/analyze", "::ffff:203.0.113.10", "ms_internal=local-test-access")).headers.get("x-middleware-next"), "1");
  assert.equal(middleware(request("/", "203.0.113.11")).headers.get("location"), "https://scanner.example/restricted");
  assert.equal(middleware(request("/r/abc123", "203.0.113.11")).headers.get("x-middleware-next"), "1");
});

test("jsPDF supports the report's image, multi-page, and footer operations", async () => {
  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.addImage({ imageData: { data: new Uint8ClampedArray([30, 120, 180, 255]), width: 1, height: 1 }, format: "RGBA", x: 0, y: 0, width: 190, height: 20 });
  pdf.addPage();
  pdf.text("Marketing Scanner | 2 / 2", 10, 280);
  assert.equal(pdf.getNumberOfPages(), 2);
  assert.match(pdf.output(), /^%PDF-/);
});
