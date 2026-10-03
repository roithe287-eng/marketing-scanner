# Naver optimization audit — 2026-10-03

The scanner now uses a versioned, deterministic evidence workbench instead of the old Naver readiness grades. This review covers 18 Naver official pages and the W3C image-alt decision guide. The exact source registry, URLs, observed revision dates, and review date are in `lib/naverKnowledge.ts`. Review dates are not claimed to be publication dates. There is no automatic documentation refresh.

## Corrections and resulting behavior

| Old behavior | New behavior |
|---|---|
| AI Briefing and ADVoost AEO treated as one official five-part score | Organic discovery, search/AI ads, shopping, and Developers have separate scopes; no Naver readiness score is produced |
| Missing ownership meta meant disconnected | HTML-file verification is recognized as an alternative; account ownership remains a manual check even when a tag exists |
| Scanner fetch success meant Yeti allowed; absent robots was penalized | Exact requested path and specific Yeti group are inspected; missing, HTML, server error, network failure and unhandled encoded rules remain distinguishable |
| General robots exclusion meant ads blocked | Ads-Naver explicit group is evaluated separately from wildcard rules; no actual bot-access success is claimed |
| Noindex absence asserted without reading it | Meta directives and X-Robots-Tag are captured; other agents' HTTP directives do not contaminate the result |
| nosourceinfo implied general AI exclusion | Its scope is limited to automatically generated source descriptions |
| Title 15–45 characters, description 40–160, schema type counts and English names determined readiness | Those arbitrary requirements are removed; duplicate/empty metadata are factual observations and semantic suitability stays reviewable |
| Name/description on different schema objects completed one product | Nested entities are retained and matching fields must belong to the same Product; parsing failures are retained |
| Empty image alt always failed | Missing attributes and empty decorative alternatives are counted separately |
| wcs/GTM/GA meant conversion connected | Script signal, installation method, runtime event and account reception remain separate; Smartstore and external-store instructions differ |
| 4MB, script count and HTML download timing represented universal search/performance grades | 4MB advice is scoped to Ads-Naver HTML; timing is single HTML reception, not TTFB or browser performance; no script-count failure grade |
| Text mentioning 404 meant soft-404 | No keyword-based soft-404 assertion; actual response/page behavior must be checked |
| API response order was actual Naver rank; failures became hidden | Web-document API observation version 2 preserves requested/returned counts, API total, timestamp, matched URL, failures and not-found separately |
| Parent domain or another platform merchant could count as our site | Exact host matching with explicit store/blog/Place tenancy boundaries; no parent/sibling-host fallback |
| Historical unsupported grades propagated into tasks and PDF | Old schemas remain readable, but obsolete cards, grades, tasks and rank conclusions are suppressed; snapshots require re-diagnosis for fresh evidence |

## Source distinctions requiring care

- Search Advisor robots guidance: `https://searchadvisor.naver.com/guide/seo-basic-robots`.
- Ads-Naver FAQ `https://ads.naver.com/help/faq/994` (revision 2026-08-12) describes ignoring general wildcard exclusions. The specific-agent exclusion is separately documented by `https://ads.naver.com/notice/16973` and by the newer diagnostic table `https://ads.naver.com/help/faq/1009` (revision 2026-09-23). The workbench exposes the matching rule rather than claiming a successful crawl.
- Advertising URL diagnostics `https://ads.naver.com/help/faq/1452` (revision 2026-09-30) distinguish request time, crawl result, and index result. None is a guarantee of an ad impression.
- AI ad launch notice `https://ads.naver.com/notice/31888` is explicitly treated as a launch-time scope; current eligibility and settings must be checked in the account.
- Developers web search documentation `https://developers.naver.com/docs/serviceapi/search/web/web.md` describes a web-document API. Its limited response is not a measurement of integrated-search placement or traffic.

## Implementation and validation

- 29 checks, 4 categories, 4 evidence states. Unknown/account-only checks never subtract from a score.
- Each check contains evidence, applicability/limits, owner, steps, completion criterion, and source IDs. Copying a guide includes the target URL and sources.
- Final-host robots are recorded when a redirect changes the origin. Robots are not fetched again by independent AEO/Place modules.
- Original eight-direction diagnosis graphics remain intact. The workbench uses restrained category diagrams, status segments and expandable execution cards; CSS has a mobile layout and reduced-motion behavior.
- Sharing preserves versioned observations. Full PDF includes source links and execution steps; legacy exports state that re-diagnosis is required.
- Regression coverage includes agent/path robots semantics, unknown responses, header scoping, nested JSON-LD, alt handling, tracking signals, host redirects, platform tenancy, API errors, schema persistence and legacy/PDF suppression.

Limitations: static HTML is not a rendered browser, and a public scanner cannot read Search Advisor ownership, ad settings, shopping feeds or event reception. The existing access protection is unchanged. A protected homepage cannot be used for an unauthenticated end-to-end production scan.
