terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "egress" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "egress" {
  bucket = aws_s3_bucket.egress.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "egress" {
  bucket = aws_s3_bucket.egress.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "egress" {
  bucket = aws_s3_bucket.egress.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "egress_writer" {
  statement {
    sid    = "ListBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [aws_s3_bucket.egress.arn]
  }

  statement {
    sid    = "WriteObjects"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = ["${aws_s3_bucket.egress.arn}/*"]
  }
}

output "bucket_name" {
  value       = aws_s3_bucket.egress.bucket
  description = "Set as EGRESS_S3_BUCKET"
}

output "bucket_arn" {
  value = aws_s3_bucket.egress.arn
}

output "egress_writer_policy_json" {
  value       = data.aws_iam_policy_document.egress_writer.json
  description = "Attach to IAM user or role used by UniSchema"
}
