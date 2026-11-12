# URL classification verification · 2026-11-12

## Production UI, freshly submitted URLs

Executed the ordinary authenticated scanner form, one request at a time. Checked the rendered report, not just fixture output.

| URL | Observed result |
| --- | --- |
| https://meta-hbh.com/ | Medical service. Eight source pages; doctors, inpatient schedule, fees, hours and contact facts rendered. Naver local search API returned one candidate and its addresses. |
| https://nanorecipe.com/ | Commerce / product sales. Product report rendered. The home-page CTA goal remained unconfirmed; classification does not prove purchase completion. |
| https://www.mujuskiworld.com/ | Noncommerce rental service, ski / snowboard winter profile. Naver API returned one candidate. Distinct discovery, comparison and request stages rendered. |

These runs verified the already deployed reporting pipeline. The classification fixes below were validated against captured public HTML and regression tests before deployment.

## Public HTML through the application pipeline

Ten public URLs were extracted and processed with the application's purpose, strategy and question builders: the three above, sdfkorea.com, pure-australia.com, pumyang.com, tripozzy.com, i-boss.co.kr, yulchon.com and knollo.store. Commerce, logistics, travel, community, legal and pet commerce stayed in their respective flows. Muju's broad industry was `etc` while the detailed ski profile was already correct; it now resolves deterministically to `sports`.

The proxy-only development environment could read public HTML but often exceeded the robots fetch budget; supplemental documents in those local samples were consequently limited. That is not evidence that the remote sites lack those documents. The ordinary production run above independently verified eight medical source pages. The development environment had no live Naver/OpenAI credentials. prorealmkt.com's local audit timed out and is not counted as a passed URL.

## Corrections and checks

- Broad industry now follows the selected noncommerce/local/seasonal report identity where an appropriate category exists. Broad categories and detailed editorial profiles are different dimensions; generic rental and miscellaneous services can still use `etc`.
- An advertising/software provider's clients in its description no longer override its title/H1 identity. Explicit medical consulting keeps its own profile.
- `반려견 호텔` / `반려묘 호텔` join existing pet-care aliases and no longer become ordinary human lodging.
- Fourteen new extraction-to-classification regressions cover these boundaries, ski locations, summer activities, branch restaurants, veterinary care and ski merchandise commerce.
- Existing catalog coverage includes 27 noncommerce playbooks, 26 local profiles and 16 seasonal profiles. They overlap and are not 69 exclusive industries.

`scripts/audit-url-classification.ts` provides a repeatable read-only check using application collectors. It invokes neither generative analysis nor credit reservation. It keeps production URL/robots protections. Run it in an environment where public DNS/HTTPS are available. Empty, blocked, timed-out and API-unprovided data must remain distinguishable from an actual absence of information.

This verifies representative URLs and the covered logic, not every public URL, every page of a website, private account information, purchases/reservations or every Naver field.

Validation: `npm test` passed 794/794; `npm run typecheck` and `npx next build` passed. `git diff --check` passed.
