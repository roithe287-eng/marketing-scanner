# Public business evidence and concise reporting — 2026-11-12

`meta-hbh.com` exposed a source wiring bug: supplemental HTML was collected for some analyses, while purpose/sector checks still used only the submitted page. Short provider names and fee-table cells were also lost by paragraph length filtering.

Changes:
- Capture public table headers with row values, definition labels with values, short names and process steps. Exclude navigation, hidden content, forms, reviews and personal entered values.
- Discover observed doctor/team, fee/menu, admissions/process and visit links for every eligible business. Keep bounded same-site, robots-aware collection and existing time budget.
- Persist supplemental business bodies with diagnostic pages and reuse the same source URLs in purpose checks, result cards and saved-report presentation. Classification remains anchored to the submitted page.
- Preserve the Naver local search response fields; a regional prefix can match only with both domain and address agreement. Other branches and franchise headquarters remain candidates. API errors and missing configuration remain distinct from a zero-result search.
- Show factual findings and source links. Remove repeated interpretation/caution paragraphs and generic hypothesis cards from the non-commerce factual overview. Apply the concise format to saved reports and document exports.

Validation:
- Public live HTML inspected from homepage, doctors, hours, location, admissions, non-benefit fees and pricing pages of meta-hbh.com.
- Regression coverage includes the 26 local business families, 16 seasonal types, bounded collection, source provenance, form/review exclusion, primary classification, same-business API matching, saved reports and exports.
- Production TypeScript and Next.js build pass. Live Naver lookup is verified through the production scanner after deployment; local tests use controlled API responses, not production credentials.

Naver field contract: https://developers.naver.com/docs/serviceapi/search/local/local.md
