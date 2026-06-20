# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

UniSchema handles constituent and donor data. If you discover a security issue, **do not** open a public issue with live credentials or production payloads.

1. Use [GitHub Security Advisories](https://github.com/PhilanthroPy-Project/UniSchema/security/advisories/new) on this repository if available.
2. Otherwise, open a minimal issue describing impact and reproduction steps **without** secrets or real PII.

We aim to acknowledge reports within **5 business days** and provide a fix or mitigation timeline for confirmed issues.

## Security practices for operators

- Set `WEBHOOK_SIGNATURE_REQUIRED=true` and unique HMAC secrets per vendor in production.
- Set `MAPPING_SYNC_TOKEN` and `DRIFT_AGENT_TOKEN` to long random strings; never commit `.env` files.
- Set `TRUST_PROXY=true` only when behind a reverse proxy you control (Fly, Railway, nginx).
- Prefer S3 egress with IAM least privilege over long-lived root credentials.
- Review drift agent output manually — LLM-proposed mapper patches are **not** auto-deployed.

See [docs/security-and-privacy.md](docs/security-and-privacy.md) for FERPA-adjacent guidance and data retention.

## Scope

In scope: webhook authentication bypass, unauthorized mapping sync, drift queue data exposure, secret leakage in logs or egress, SQL injection via Drizzle queries, path traversal in local egress.

Out of scope: vendor-side webhook misconfiguration, downstream warehouse access controls, denial-of-service at the network edge (use Cloudflare/nginx rate limits in addition to app limits).
