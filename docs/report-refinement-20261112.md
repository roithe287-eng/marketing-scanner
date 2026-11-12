# Report controls and actionable stage content

- Removed HTML/Markdown buttons from the PDF toolbar. Retained export internals.
- Saved-link URL, expiry and access scope now appear on hover or keyboard focus; Escape dismisses. Copy remains a single click, and the URL stays selectable when clipboard permission is unavailable. Existing saved reports reuse their stored ID and expiry.
- Place/customer questions start open. The identity panel distinguishes Naver Local Search Open API values from website observations.
- Normalized task disclosure label/badge alignment and centered the diagram copy. Draft placeholders are bold and underlined; quotations stay verbatim. PDF draft blocks carry the same emphasis metadata.
- Discovery, comparison and action receive separate landing sections, CTAs and metrics. Recompute only proposed stage content from retained evidence on saved non-commerce reports; no new observation or score is created.
- Checklist guides identify HTML fields, actual captured wording, required edits and completion checks. Preserve collection-blocked guidance and non-applicable items. First-priority cards deduplicate equivalent metadata/image topics without deleting full evidence rows.

Validation: TypeScript, full regression suite and Next production build; live desktop/mobile checks of the existing meta-hbh.com saved report.
