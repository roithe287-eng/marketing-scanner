# Report usability revision — 2026-10-06

Continues the 12 annotated screenshots from the owner. Repository: roithe287-eng/marketing-scanner. Production: https://www.mktscanner.com/. PR: #60.

## Changes mapped to screenshots

1. Today cards now have neutral surfaces, distinct headings, equal title/action/button alignment, and one clear action. Repeated benefit blocks moved to separate disclosures.
2. Radar priority buttons select, reveal and focus the corresponding explanation. Links open the precise execution task, including all closed ancestor disclosures. Keyword links select the actual title/description editing tab.
3. Removed the empty before/after comparison and baseline entry from a fresh report. Attached baseline comparisons remain viewable; baseline selection before analysis remains available.
4. Removed chapter buttons that only returned to the top.
5. Consistent native select layout: 48px minimum height, reserved 44px arrow area and 14px right inset.
6/8. Original location now includes a functioning in-report context viewer with explicit selected-item border and document order. Source selection updates the selector, region, link target and editable fields together, while developer details remain open. Image alt, metadata and very short text never masquerade as text-fragment targets. Real-page links preserve final path/query and are accompanied by copy/find guidance. Cross-origin pages cannot be forcibly highlighted by this app.
7. Relevant Naver content, markup and crawl conditions supplement existing Google/W3C sources. Naver web content guidance is explicitly separate from Google AI eligibility. Conditions are also included in copied/PDF guidance.
9. Editing, expected changes and source evidence are physically separated with spacing, borders and headings. Current/proposed copy is labelled without relying on color alone.
10. Keyword candidates explain what they mean, what to ignore and how to apply a selected phrase. Frequency is labelled as page text frequency, not search volume.
11. Industry comparison uses one of 20 industry lenses. All companies in the current comparison use the same lens and the same two captured fields. X uses the first two information criteria; Y uses the final two; each counts distinct positive expressions up to two. Bubble area uses 0–8 signals. Criteria, coordinates, size and evidence change together. No random jitter, invented missing scores, market-size or sales claims. Manual industry choice is local to the screen; saved report/PDF uses the same automatically chosen default lens. PDF method text and chart use the updated model.
12. Goal calculator uses three counts: current opportunities, current completions and target completions. Rate is calculated automatically; required opportunities assumes the current rate persists. Search and conversion modes reset independently; empty, zero-denominator and impossible values are handled explicitly. Example data stays labelled as synthetic.

Duplicate backlog/owner board and generic placement diagram removed. Related execution evidence is grouped without losing original anchors, details or copyable instructions. Existing admin approval, IP gates, activity tracking, Channel Talk CTA and seven-day report retention are preserved.

## Validation

- 203 unit/SSR/regression tests passed after the main implementation.
- Follow-up navigation and PDF text changes: 25 targeted tests and TypeScript passed.
- Optimized Next.js build passed; Vercel preview build passed.
- Browser used `/review/report` with explicit synthetic fixture only. This route calls `notFound()` unless `VERCEL_ENV === 'preview'`; it has no account, analysis, share or PDF capability and reads no live customer data.
- Browser confirmed task and parent disclosures open; source selection changes `#size-inquiry` to `#delivery-inquiry`, destination and highlighted context update, and developer disclosure stays open.
- Browser confirmed example calculator: 1,000 visits / 20 completed visits / target 30 → 1,500 visits, +500; impossible completion count disables copying; switching to search resets all three counts.
- Browser confirmed ecommerce vs medical lens changes criteria, coordinates, grouping and diameters. Identical evidence stays grouped.
- Desktop browser: three starting cards all 480.6875px high, identical title and button baselines; no document horizontal overflow; select height 48px and arrow inset 14px.
- Responsive breakpoints were reviewed in CSS. A separate physical mobile browser was not available in this session.

## Files

UI: `components/report/ReportJumpLink.tsx`, `SourceElementCard.tsx`, `SiteGuidebook.tsx`, `ExecutionWorkflow.tsx`, `CompetitorLandscape.tsx`, `GrowthKpiPanel.tsx`, `InsightPanels.tsx`, `ReportLayout.tsx`, `components/ScoreRadar.tsx`, `app/report-usability.css`.
Logic: `lib/industryPositioning.ts`, `competitorPositioning.ts`, `siteGuidebook.ts`, `guideKnowledge.ts`, `reportExecution.ts`, `growthKpi.ts`; corresponding PDF documents/charts.
Tests: `tests/report-usability.test.ts` plus updated behavioral regression expectations. Fixture: `tests/fixtures/usability-report.json` (synthetic).

## Official sources checked for this revision

- https://searchadvisor.naver.com/guide/content-basic
- https://searchadvisor.naver.com/guide/markup-content
- https://searchadvisor.naver.com/guide/seo-basic-intro
- https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
