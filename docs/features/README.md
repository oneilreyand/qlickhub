# Feature Knowledge Cards

Feature Knowledge Cards connect product intent, Backend, Frontend, and QA in one vertical view.
They complement global SSoT documents and must not duplicate or redefine global policy. Their
default format is a folder per cross-role Feature, with one readable overview and focused role
documents. Existing single-file cards remain supported until deliberately migrated.

## When a Feature Card Is Required

Create a card when work introduces or materially changes at least one of these:

- a user-visible workflow spanning more than one role or application layer;
- an API contract or persisted entity used by both frontend and backend;
- an authorization boundary, QA evidence flow, or release-readiness rule;
- a feature whose acceptance criteria cannot be understood from one existing SSoT section.

Small fixes may cite an existing Feature Card and record their evidence in `docs/reports/`.

## How to Create One

1. For a new cross-role Feature, copy the [`_template`](_template/README.md) directory to a
   descriptive uppercase snake-case Feature ID. Use [`FEATURE_TEMPLATE.md`](FEATURE_TEMPLATE.md)
   only for a small, single-file card.
2. Replace every placeholder; never publish an active card containing `TBD`.
3. Keep `README.md` as the canonical entry point: it has metadata, a compact Mermaid diagram,
   role navigation, the ten required card sections, and links to the focused documents.
4. Put role-specific actions and handoffs in `roles/`; put shared data/API material in
   `contracts.md`, backend authorization outcomes in `authorization.md`, and evidence in
   `testing.md`. Link instead of copying global rules or contract fields.
5. Link canonical Requirement/Acceptance Criteria and applicable
   [Policy IDs](../POLICY_REGISTRY.md).
6. Describe Backend, Frontend, and QA impact even when one surface is explicitly unaffected.
7. Run `npm run docs:check` before handoff.

## Migration from Single-file Cards

Migration is opt-in and occurs only when a Feature is actively changed. Create the new folder,
move content without changing meaning, preserve the old file as a short link to `README.md` for
one approved transition, and update inbound links in the same change. Do not bulk-migrate the
existing catalogue, delete evidence, or treat reports as policy. The migration plan records the
order and validation evidence.

## Ownership and Status

Allowed status values are `Draft`, `Active`, `Superseded`, and `Archived`. `Active` cards require
an owner, review date, applicable Policy IDs, complete traceability, and no unresolved placeholders.

The card explains one feature. Global domain, authorization, workflow, design, and testing rules
remain owned by the four SSoT documents listed in the
[Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md).
