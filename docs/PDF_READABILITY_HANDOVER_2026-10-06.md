# PDF readability — 2026-10-06

The owner requested a more visual full PDF while retaining the report's substantive content, rather than shortening it into a summary.

## Export behavior

- Full export now opens with the existing one-page overview, a clickable directory, result charts, then grouped details: diagnosis/evidence → revisions/actions → source/editing instructions → reference/measurement notes.
- `lib/reportReadingPdf.ts` lays out the canonical `buildReportDocument()` output. Eight scores become number cards with proportional bars. Literal before/after fields appear side by side when they fit. Evidence, editing location, action, and completion criteria use separated label/value panels.
- Long values use full-width panels and continue onto the next page at a consistent readable font size. Subheadings stay with their following content; the score grid stays with its heading and directory destination.
- Exactly repeated editing instructions and official sources are printed once in a common guide, with named, clickable references from each relevant task. Other long, exactly equal body values link to their first complete occurrence. No semantic summarization or rewriting is used for deduplication.
- Every distinct original result, numerical value, instruction, and source URL remains in the full export. Saved report objects and the canonical document builder are unchanged. One-page summary export retains its existing scope.
- The PDF contains actual page-destination links for directory entries, common guidance, repeated content, and footer return-to-directory navigation. External source links remain clickable.
- PDF generation, account/network authorization, activity receipts, download/save behavior, and report retention use the existing paths.

## Validation

- `npm test`: 208 tests passed. Five new PDF tests cover literal Unicode/source preservation, exact-only deduplication, directory page numbers and destinations, bounds, before/after alignment, score bars, long-page continuation, and heading/card pagination.
- TypeScript and a local Next.js production build passed. The final pagination/link adjustment was checked again with the focused PDF suite and TypeScript.
- The same `renderReportPdf()` used by downloads was run with real Pretendard fonts and a Node canvas. The deliberately rich synthetic `tests/fixtures/usability-report.json` generated 124 pages. This is a layout stress fixture, not a customer report or an expected normal report length.
- Actual rendered pages were visually inspected for the directory, score grid, before/after cards, location/action fields, shared instructions, and long content. All internal PDF destinations resolve within the document, all non-cover pages include a return-to-directory link, and official external links are retained.
- Text is still rasterized to preserve the application's existing Korean font rendering. This change does not add searchable/selectable PDF text or alter the existing image-based export format.

No new environment variables or production data migrations are required.
