import assert from "node:assert/strict";
import { test } from "node:test";
import iconv from "iconv-lite";
import { extractWebsite } from "../lib/extractWebsite";
import { analyzeTechnicalSeo } from "../lib/analyzeTechnicalSeo";
import { analyzeKeywordFrequency } from "../lib/analyzeKeywordFreq";

const html = `<!doctype html><html><head>
  <title>진짜마케팅 광고 분석과 상담 서비스</title>
  <meta name="description" content="마케팅 분석 마케팅 상담">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="naver-site-verification" content="fixture">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"진짜마케팅","description":"광고 분석"}</script>
  </head><body><h1>마케팅 분석</h1><h2>마케팅 상담</h2>
  <p>마케팅 분석 서비스입니다. 마케팅 분석 결과와 상담을 제공합니다.</p>
  <a href="/contact">상담 신청</a><img src="/logo.png" alt="진짜마케팅"><img src="/missing.png">
  <iframe src="https://map.naver.com/example"></iframe><form><input name="name"></form></body></html>`;

for (const encoding of ["utf-8", "euc-kr"]) {
  test(`${encoding} Korean HTML retains metadata, technical checks, and keyword results`, async (t) => {
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
      if (String(input).endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
      return new Response(new Uint8Array(iconv.encode(html, encoding)), {
        headers: { "content-type": `text/html; charset=${encoding}` },
      });
    });
    const data = await extractWebsite("https://fixture.example");
    assert.equal(data.title, "진짜마케팅 광고 분석과 상담 서비스");
    assert.equal(data.h1Count, 1);
    assert.equal(data.imageWithoutAlt, 1);
    assert.equal(data.naverSiteVerification, true);
    assert.ok(data.schemaTypes.includes("Organization"));
    assert.equal(data.hasForm, true);
    assert.equal(data.hasMapEmbed, true);
    assert.equal(data.schemaHasName, true);
    assert.ok(!data.bodyText.includes("@context"));
    const technical = analyzeTechnicalSeo(data);
    assert.equal(technical.checks.length, 11);
    assert.equal(technical.checks.find(check => check.id === "h1Count")?.status, "pass");
    const frequency = analyzeKeywordFrequency(data);
    assert.ok(frequency.singles.find(item => item.keyword === "마케팅" && item.count > 2));
  });
}

test("robots total exclusion prevents fetching page content", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requests.push(String(input));
    return new Response("User-agent: *\nDisallow: /\n");
  });
  await assert.rejects(() => extractWebsite("https://fixture.example"), /robots.txt/);
  assert.deepEqual(requests, ["https://fixture.example/robots.txt"]);
});
