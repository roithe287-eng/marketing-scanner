# Medical SEO / GEO evidence review

The scanner now adds a medical review to its existing report, rather than replacing the report layout. New reports use diagnosis method v20 and GEO cache v3.7. Old snapshots remain valid because the new fields are optional.

## Scope and classification

- Fourteen profiles cover plastic surgery, skin care, Korean medicine, primary care / screening, musculoskeletal care, dentistry, ophthalmology, pediatrics, gynecology, ENT, psychiatry, urology, hospitals and cross-specialty topics.
- A profile is an observed service topic, not a verified specialty or professional credential.
- Public HTML samples may include up to eight pages for medical facilities; other sites retain the four-page limit. Same-site, robots, safe-fetch, deadlines and response-size limits still apply.
- Medical staff, services, visit information and fees receive representative sampling priority. Private patient records, results and individual consultation / reservation routes are excluded.
- Consulting vendors, generic editorial guides and PhD titles must not become medical facilities.

## Sixteen review criteria

Classification; collection coverage; public/private indexing intent; text availability; facility / branch identity; hours; Naver source records; medical staff; service scope; schema roles; schema/body consistency; topic pages; authorship; useful questions and answers; claims requiring professional review; measured AI observations.

Each criterion contains an observation status, evidence, next action and official source links. Counts are not medical quality, legal compliance, rankings or recommendation probabilities.

## Structured data and external records

- Parse JSON-LD, Microdata and RDFa; distinguish facilities, people, documents and MedicalSpecialty enumeration values.
- Compare explicit matching entity IDs, rather than merging separate branches by name.
- Check name, address and telephone evidence; compare simple same-weekday hours only when unambiguous. Split / seasonal schedules remain manual.
- Do not invent specialty enum values, credentials, prices or clinical effects. Korean medicine is not automatically TraditionalChinese.
- Naver / HIRA registration values are marked unverified until separately checked. Homepage changes do not update those source records.
- Self-controlled facility review stars are not recommended as a Google rich-result tactic.

## Search / AI guidance verified 2026-11-04

- Google FAQ rich results ended 2026-05-07; Naver published its FAQ termination notice 2026-07-08. Useful FAQ body content remains a separate content consideration.
- FAQPage, llms.txt and special AI schema are not mandatory ranking requirements.
- Google Search Console generative AI impressions, Naver channel citation counts and OpenAI API samples have different scopes.
- Medical GEO questions are grounded in the observed profile. Existing custom / baseline questions are preserved.
- Bind actual OpenAI responses, model/time metadata, brand mentions and verified own-site citations separately. A citation does not certify clinical accuracy.

## Delivery

- Existing web report receives the medical panel with open evidence / action rows.
- Full PDF / HTML / Markdown document pipelines retain the same medical review.
- Source links are maintained in `lib/medicalAudit.ts`.
- Production release was initially uploaded privately to the existing Vercel project. The user explicitly authorized publishing and synchronizing this change to the existing public GitHub repository on 2026-11-04.
- Deployment: `dpl_38iobPLdpnJZGGa4BoPGLCazDJJe`, verified READY and attached to `www.mktscanner.com` / `mktscanner.com`.
- Local complete-suite, typecheck and build passed before deployment. First package missed existing review fixtures; the corrected package includes their unchanged dependencies.
- Live verification: `https://www.banobagi.com/` generated a complete report with eight collected public HTML pages, the plastic-surgery profile, all sixteen medical checks and five profile-specific GEO questions. The measured API sample showed five responses and one verified own-site citation. This is a narrow test observation, not an endorsement or a general exposure metric.
- `https://www.jaseng.co.kr/` returned the generic request failure in the live test. Local extraction also failed DNS resolution. Runtime log access was rejected with 403, so do not assert a confirmed production root cause. Korean medicine classification and GEO context passed deterministic tests.
- Restored-worktree verification: 475/475 tests, TypeScript and `git diff --check` pass. Browser DOM retained all sixteen review rows with no horizontal overflow; browser screenshots returned blank and must not be described as completed visual verification.
- Synchronization target is GitHub `main`. Preserve all nineteen source, regression-test and documentation files so subsequent Git deployments retain the medical release. Verify the remote head and production deployment after synchronization.
