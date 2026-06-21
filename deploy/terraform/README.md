# Terraform — S3 egress bucket

Minimal IaC for the **one AWS resource most operators need**: an S3 bucket for UniSchema NDJSON batches.

UniSchema itself deploys via [Fly.io / Railway](../README.md) — this module does not provision the app.

## What it creates

- S3 bucket with versioning (optional) and SSE-S3 encryption
- Bucket policy denying non-TLS traffic
- IAM policy document you attach to the Fly/Railway app's AWS credentials

## Usage

```bash
cd deploy/terraform/s3-egress
terraform init
terraform apply -var="bucket_name=your-org-unischema-egress"
```

Copy outputs into platform secrets:

```bash
EGRESS_TARGET=s3
EGRESS_S3_BUCKET=<bucket_name output>
EGRESS_S3_PREFIX=constituent-events
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...   # user with attached policy
AWS_SECRET_ACCESS_KEY=...
```

Full operator checklist: [docs/operator-guide.md](../../docs/operator-guide.md)

## Full AWS stack (ECS + RDS)

Not included in v0.2.0 — open an issue if you need it. Most advancement pilots use **Fly/Railway + this S3 module**.
