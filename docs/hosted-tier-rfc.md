# Hosted tier RFC (draft)

Status: **RFC — not building until v0.3 adoption signals**

## Problem

Self-hosting UniSchema is appropriate for pilots and privacy-sensitive shops, but some advancement teams lack ops capacity for secrets, S3, Postgres, and webhook URL management.

## Proposal

Managed UniSchema SaaS:

- Multi-tenant Postgres + isolated S3 prefixes per customer
- SSO (OIDC) for admin UI
- Vendor webhook endpoints on `*.unischema.io`
- SLA-backed drift queue + optional human-reviewed agent assist

## Non-goals (v1 hosted)

- No custom per-customer master schema forks
- No auto-merge drift patches without customer approval
- No processing donor data in LLM training

## Adoption signals required before build

1. Three or more documented pilots ([case-studies/pilot-template.md](./case-studies/pilot-template.md))
2. v1.0 trust items shipped (JWKS OIDC, audit log, compliance appendix)
3. Inbound demand from institutions unable to self-host

## Open questions

- Pricing model (events/month vs flat institution fee)
- FERPA / DPA template for hosted subprocessors
- Data residency (US-only vs EU region)

Comments: open a GitHub Discussion tagged `hosted-tier`.
