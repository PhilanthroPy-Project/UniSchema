# Pilot program

UniSchema targets **2–3 external pilots** in Phase 1 to validate webhook → ConstituentEvent → S3 → downstream reporting.

## How to join

1. Deploy via [Quick start](../README.md#quick-start-15-minutes) or [deploy/README.md](../deploy/README.md)
2. Register GiveCampus / Cvent webhooks to your instance
3. Configure S3 egress ([operator guide](../docs/operator-guide.md))
4. File feedback using the [pilot feedback issue template](../.github/ISSUE_TEMPLATE/pilot-feedback.yml)

## Success criteria per pilot

- [ ] At least one real vendor webhook ingested in production or staging
- [ ] ConstituentEvent visible in S3 or local egress
- [ ] Downstream script or notebook run completed
- [ ] Feedback captured (what worked / what blocked)

## Case studies

- [Anonymized pilot example](./anonymized-pilot-example.md) — template for published write-ups
- [Pilot feedback template](./pilot-feedback-template.md) — structured questions for adopters

## Recruiting channels

- University advancement data / IT contacts
- CASE-adjacent communities and higher-ed Slack groups
- GitHub Discussions on this repository

Contributors who complete a pilot and anonymized case study may be listed in CHANGELOG under **Adopters** (with permission).
