import assert from "node:assert/strict";
import { test, afterEach, beforeEach } from "node:test";
import { NextRequest } from "next/server";
import {
  isInternal,
  clientIp,
  requireSameOrigin,
  readJson,
} from "../lib/security/request";
import {
  publicUrl,
  publicAddress,
  resolvePublic,
  safeFetch,
} from "../lib/security/safeFetch";
import {
  isActive,
  canReadOwner,
  DEFAULT_FEATURES,
  Account,
} from "../lib/saas/types";
const keys = [
  "VERCEL",
  "ALLOWED_IPS",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  keys.forEach((k) => delete process.env[k]);
});
afterEach(() =>
  keys.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }),
);
test("registered IPs fail closed when missing, malformed or supplied outside Vercel", () => {
  const h = new Headers({
    "x-vercel-forwarded-for": "203.0.113.10",
    "x-forwarded-for": "203.0.113.10",
    "x-real-ip": "203.0.113.10",
  });
  assert.equal(isInternal(h, { ALLOWED_IPS: "203.0.113.10" }), false);
  assert.equal(isInternal(h, { VERCEL: "1" }), false);
  assert.equal(
    isInternal(h, { VERCEL: "1", ALLOWED_IPS: "203.0.113.10" }),
    true,
  );
  h.set("x-vercel-forwarded-for", "203.0.113.11");
  assert.equal(
    isInternal(h, { VERCEL: "1", ALLOWED_IPS: "203.0.113.10" }),
    false,
  );
  h.set("x-vercel-forwarded-for", "203.0.113.10, 203.0.113.11");
  assert.equal(clientIp(h, { VERCEL: "1" }), "");
  h.set("x-vercel-forwarded-for", "::ffff:203.0.113.10");
  assert.equal(
    isInternal(h, { VERCEL: "1", ALLOWED_IPS: "203.0.113.10" }),
    true,
  );
});
test("cross-site, missing-origin and non-JSON mutations are refused", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://scanner.example/api/analyze", {
      method: "POST",
      headers,
    });
  assert.throws(() =>
    requireSameOrigin(req({ "content-type": "application/json" })),
  );
  assert.throws(() =>
    requireSameOrigin(
      req({
        origin: "https://evil.example",
        "content-type": "application/json",
      }),
    ),
  );
  assert.throws(() =>
    requireSameOrigin(
      req({ origin: "https://scanner.example", "content-type": "text/plain" }),
    ),
  );
  assert.throws(() =>
    requireSameOrigin(
      req({
        origin: "https://scanner.example",
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      req({
        origin: "https://scanner.example",
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      }),
    ),
  );
});
test("streaming body limits hold without Content-Length", async () => {
  await assert.rejects(
    () =>
      readJson(
        new Request("https://scanner.example", {
          method: "POST",
          body: JSON.stringify({ data: "x".repeat(1000) }),
        }),
        50,
      ),
    { status: 413 },
  );
  await assert.rejects(
    () =>
      readJson(
        new Request("https://scanner.example", {
          method: "POST",
          body: "invalid",
        }),
      ),
    { status: 400 },
  );
});
test("private, local, link-local, mapped, transition and reserved destinations are blocked", async () => {
  for (const value of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "192.0.2.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "3fff::1",
  ])
    assert.equal(publicAddress(value), false, value);
  for (const url of [
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://[::1]",
    "http://localhost",
    "http://service.local",
    "http://user:pass@example.com",
    "http://example.com:2375",
    "file:///etc/passwd",
    "https://example.com@127.0.0.1",
  ])
    assert.throws(() => publicUrl(url), undefined, url);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.equal(publicAddress("2606:4700:4700::1111"), true);
  await assert.rejects(
    () => safeFetch("http://169.254.169.254/latest/meta-data/"),
    { status: 400 },
  );
});
test("mixed DNS answers are rejected even if the first address is public", async () => {
  const resolver = (async () => [
    { address: "8.8.8.8", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ]) as any;
  await assert.rejects(
    () => resolvePublic(new URL("https://example.com"), resolver),
    { status: 400 },
  );
});
test("customer cannot read another owner or a legacy unowned report", () => {
  const account: Account = {
    id: "user-a",
    role: "customer",
    status: "approved",
    expiresAt: Date.now() + 10000,
    monthlyLimit: 10,
    features: DEFAULT_FEATURES,
    email: "a@example.com",
    name: "A",
    company: "",
    passwordHash: null,
    version: 1,
    createdAt: Date.now(),
  };
  assert.equal(canReadOwner("user-a", { kind: "account", account }), true);
  assert.equal(canReadOwner("user-b", { kind: "account", account }), false);
  assert.equal(canReadOwner(undefined, { kind: "account", account }), false);
  assert.equal(canReadOwner(undefined, { kind: "internal" }), true);
  assert.equal(isActive({ ...account, status: "suspended" }), false);
  assert.equal(isActive({ ...account, expiresAt: 1 }), false);
});
test("every analysis and report route rejects unauthenticated direct requests before providers", async () => {
  const modules = await Promise.all([
    import("../app/api/analyze/route"),
    import("../app/api/competitor/route"),
    import("../app/api/deepdive/route"),
    import("../app/api/share/route"),
  ]);
  for (const [i, route] of modules.entries()) {
    const req = new NextRequest("https://scanner.example/api/test", {
      method: "POST",
      headers: {
        origin: "https://scanner.example",
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
        "x-middleware-subrequest": "middleware",
      },
      body: "{}",
    });
    assert.equal((await route.POST(req)).status, 401, String(i));
  }
  const share = modules[3] as typeof import("../app/api/share/route");
  assert.equal(
    (
      await share.GET(
        new NextRequest("https://scanner.example/api/share?id=abc123"),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await share.PATCH(
        new NextRequest("https://scanner.example/api/share", {
          method: "PATCH",
          headers: {
            origin: "https://scanner.example",
            "content-type": "application/json",
          },
          body: "{}",
        }),
      )
    ).status,
    401,
  );
});
test("outbound sockets use the validated address and redirects cannot enter a private network", async (t) => {
  const dns = (await import("node:dns/promises")).default;
  const https = (await import("node:https")).default;
  const { PassThrough } = await import("node:stream");
  const { EventEmitter } = await import("node:events");
  let lookups = 0,
    requests = 0;
  t.mock.method(dns, "lookup", async () => {
    lookups++;
    return [{ address: "8.8.8.8", family: 4 }];
  });
  t.mock.method(https, "request", ((
    _url: URL,
    options: any,
    callback: Function,
  ) => {
    requests++;
    options.lookup(
      "example.com",
      { all: true },
      (error: unknown, addresses: unknown) => {
        assert.equal(error, null);
        assert.deepEqual(addresses, [{ address: "8.8.8.8", family: 4 }]);
      },
    );
    const request = new EventEmitter() as any;
    request.end = () => {
      const response = new PassThrough() as any;
      response.statusCode = 302;
      response.headers = { location: "http://127.0.0.1/admin" };
      callback(response);
    };
    return request;
  }) as any);
  await assert.rejects(() => safeFetch("https://example.com"), { status: 400 });
  assert.equal(requests, 1);
  assert.equal(lookups, 1);
});
