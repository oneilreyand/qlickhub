# Feature Knowledge Cards

Feature Knowledge Cards connect product intent, Backend, Frontend, and QA in one vertical view.
They complement global SSoT documents and must not duplicate or redefine global policy.

## When a Feature Card Is Required

Create a card when work introduces or materially changes at least one of these:

- a user-visible workflow spanning more than one role or application layer;
- an API contract or persisted entity used by both frontend and backend;
- an authorization boundary, QA evidence flow, or release-readiness rule;
- a feature whose acceptance criteria cannot be understood from one existing SSoT section.

Small fixes may cite an existing Feature Card and record their evidence in `docs/reports/`.

## How to Create One

1. Copy [`FEATURE_TEMPLATE.md`](FEATURE_TEMPLATE.md) to a descriptive uppercase snake-case name.
2. Replace every placeholder; never publish an active card containing `TBD`.
3. Link canonical Requirement/Acceptance Criteria and applicable
   [Policy IDs](../POLICY_REGISTRY.md).
4. Describe Backend, Frontend, and QA impact even when one surface is explicitly unaffected.
5. Run `npm run docs:check` before handoff.

## Ownership and Status

Allowed status values are `Draft`, `Active`, `Superseded`, and `Archived`. `Active` cards require
an owner, review date, applicable Policy IDs, complete traceability, and no unresolved placeholders.

The card explains one feature. Global domain, authorization, workflow, design, and testing rules
remain owned by the four SSoT documents listed in the
[Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md).
